import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import API from "../api/axios";
import { io } from "socket.io-client";
import { TAKEAWAY_TABLE } from "./CartContext";
import { getRestaurantIdForTenantData, tenantKey, tenantGet, tenantSet, tenantRemove } from "../utils/tenantCache";
import { isSuperAdminSession } from "../utils/sessionFlags";
import { billIdentityKey } from "../utils/billIdentity";
import { useAuth } from "./AuthContext";
import {
  isOrderEligibleForFetchAutoPrint,
  scheduleAutoPrintForOrder,
} from "../admin/kitchenBill/kitchenAutoPrint";

/** Invoice Center needs more than POS order list page size */
const BILLS_FETCH_LIMIT = 20;
const BILLS_CACHE_MAX = 250;

function isBillPendingUpdate(bill, now = Date.now()) {
  const pu = bill?._pendingUpdate;
  if (pu == null) return false;
  if (pu > now) return true;
  return now - pu < 20_000;
}

function mergeBillsFromServer(prev, serverList) {
  const now = Date.now();
  const map = new Map();
  const serverKeys = new Set();

  for (const p of prev || []) {
    const k = billIdentityKey(p);
    if (k) map.set(k, p);
  }

  for (const s of serverList || []) {
    const k = billIdentityKey(s);
    if (!k) continue;
    serverKeys.add(k);
    const local = map.get(k);
    if (local && isBillPendingUpdate(local, now)) continue;
    map.set(k, s);
  }

  for (const p of prev || []) {
    const k = billIdentityKey(p);
    if (!k || serverKeys.has(k)) continue;
    const status = normalizeStatus(p.status);
    if (status !== "closed" || isBillPendingUpdate(p, now)) {
      map.set(k, p);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.billedAt || b.createdAt || 0) - new Date(a.billedAt || a.createdAt || 0)
  );
}
import { computeGstFromSubtotal } from "../utils/gstRates";

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();
const orderKey = (order) => String(order?._id || order?.id || "");

/** Default page size for POS orders + bills list fetches (matches admin pagination expectations). */
const LIST_FETCH_LIMIT = 15;

// the socket URL should match the backend deployment; use env var if available
// fall back to the same host as the REST API by trimming any trailing /api segment
const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (!import.meta.env.PROD
    ? (import.meta.env.VITE_API_BASE_URL_DEV || "http://localhost:5001").replace(/\/api\/?$/, "")
    : import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "")
      : "https://backend-res-ikeb.onrender.com");

// shared socket instance so we don't reconnect on every render
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: false,
});

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const { user } = useAuth();
  // namespaced cache helpers — each restaurant stores data in its own slot
  const _rid = getRestaurantIdForTenantData();
  const _mountedRid = useRef(_rid);
  // Use live helpers that always read the CURRENT restaurantId (not the stale mount-time value)
  const _getLiveRid = () => getRestaurantIdForTenantData() || _mountedRid.current;
  const _tGet  = (k)    => tenantGet(k, _getLiveRid());
  const _tSet  = (k, v) => tenantSet(k, _getLiveRid(), v);
  const _tDel  = (k)    => tenantRemove(k, _getLiveRid());

  const [orders, setOrders] = useState(() => {
    try {
      const cached = _tGet('cachedOrders');
      return Array.isArray(cached) ? cached : [];
    } catch { return []; }
  });
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const [bills, setBills] = useState(() => {
    try {
      const cached = _tGet('cachedBills');
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  }); // separate collection for invoices, hydrated from storage
  
  // Kitchen bills - separate batches for kitchen/waiter view
  const [kitchenBills, setKitchenBills] = useState(() => {
    try {
      const cached = _tGet('cachedKitchenBills');
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsReady, setBillsReady] = useState(() => {
    try {
      const cached = _tGet('cachedBills');
      return Array.isArray(cached) && cached.length > 0;
    } catch {}
    return false;
  });
  /** Concurrent callers await the same in-flight promise — avoids duplicate HTTP GETs. */
  const ordersFetchDedupeRef = useRef(null);
  const billsFetchDedupeRef = useRef(null);
  const kitchenActiveFetchDedupeRef = useRef(null);
  /** Throttle window focus refetch — socket + coalesced GETs cover most updates. */
  const lastWindowFocusFetchRef = useRef(0);

  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || isSuperAdminSession()) return;
    if (ordersFetchDedupeRef.current) return ordersFetchDedupeRef.current;

    const run = async () => {
      // The state is already hydrated from localStorage in the useState initializer.
      if (ordersRef.current.length === 0) {
        setIsLoading(true);
      }

      try {
        const { data } = await API.get(
          `/orders?limit=${LIST_FETCH_LIMIT}&status=Pending,New,Preparing,Ready,Served,Paid,Closed`
        );
        setOrders((prev) => {
        // If socket delivery is delayed/missed (common on spotty networks),
        // ensure newly-seen orders still trigger the same kitchen auto-print fallback
        // that manual orders use. Deduping is handled inside scheduleAutoPrintForOrder.
        const prevIds = new Set((prev || []).map((o) => orderKey(o)));

        // Merge strategy: incoming data from server is the "source of truth",
        // but we preserve any very recent optimistic updates that haven't hit the DB yet.
        const now = Date.now();
        const serverMap = new Map();
        (Array.isArray(data) ? data : []).forEach((o) => {
          const k = orderKey(o);
          if (k) serverMap.set(k, o);
        });

        // Items in prev that are NOT in server data (might be new/local only)
        const localOnly = prev.filter((o) => {
          const k = orderKey(o);
          return (
            k &&
            !serverMap.has(k) &&
            (o._optimistic || ["served", "paid", "closed"].includes(normalizeStatus(o.status)))
          );
        });

        const merged = (Array.isArray(data) ? data : []).map((serverOrder) => {
          const k = orderKey(serverOrder);
          const localOrder = prev.find((o) => orderKey(o) === k);
          // If we have a local version with a recent optimistic flag, 
          // and the server version has fewer items, stick with local for a few seconds.
          if (localOrder?._optimisticAt && (now - localOrder._optimisticAt < 15000)) {
             if ((localOrder.items?.length || 0) > (serverOrder.items?.length || 0)) {
               return localOrder;
             }
          }
          return serverOrder;
        });

        const final = [...localOnly, ...merged].sort((a, b) => 
          new Date(b.createdAt || b._optimisticAt || 0) - new Date(a.createdAt || a._optimisticAt || 0)
        );

        try {
          // Schedule auto-print fallback only for orders that are NEW to this client.
          // This prevents re-scheduling on every poll and fixes QR orders when sockets drop.
          for (const o of final) {
            const id = orderKey(o);
            if (!id || prevIds.has(id)) continue;
            const st = normalizeStatus(o.status);
            if (
              ["pending", "new", "preparing", "ready", "served"].includes(st) &&
              isOrderEligibleForFetchAutoPrint(o)
            ) {
              scheduleAutoPrintForOrder(id);
            }
          }
        } catch (_) {}

        try { _tSet('cachedOrders', final); } catch {}
        return final;
      });
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    ordersFetchDedupeRef.current = run();
    return ordersFetchDedupeRef.current.finally(() => {
      ordersFetchDedupeRef.current = null;
    });
  }, []);

  const fetchTableOrders = async (tableNum) => {
    if (tableNum == null || String(tableNum).trim() === "") return;
    try {
      const { data } = await API.get(`/orders/table/${tableNum}`);
      const rows = Array.isArray(data) ? data : [];

      setOrders((prev) => {
        const now = Date.now();
        const incomingById = new Map(rows.map((o) => [o._id, o]));

        // Merge table-scoped fetch into global orders WITHOUT dropping other tables'
        // active orders (the previous filter did that and broke dashboard / floor plan).
        const updated = prev.map((o) => {
          const server = incomingById.get(o._id);
          if (!server) return o;
          if (o._optimisticAt && (now - o._optimisticAt) < 15000) {
            if (server.items && o.items && server.items.length < o.items.length) {
              return o;
            }
          }
          return { ...server, _optimisticAt: undefined };
        });

        const prevIds = new Set(prev.map((p) => p._id));
        const additions = rows.filter((o) => o && o._id != null && !prevIds.has(o._id));
        const merged = [...additions, ...updated];

        try { _tSet('cachedOrders', merged); } catch {}
        return merged;
      });
    } catch (error) {
      console.error("Error fetching table orders:", error);
    }
  };

  // fetch bills (invoices) - for admin billing screen
  const fetchBills = useCallback(async (options = {}) => {
    const { force = false } = options;
    const token = localStorage.getItem("token");
    if (!token || isSuperAdminSession()) return;
    if (billsFetchDedupeRef.current) return billsFetchDedupeRef.current;

    const run = async () => {
      const cachedData = _tGet("cachedBills");
      if (!force && Array.isArray(cachedData) && cachedData.length > 0) {
        setBills(cachedData);
        setBillsReady(true);
      }

      setBillsLoading(true);

      try {
        const { data } = await API.get(`/bills?limit=${BILLS_FETCH_LIMIT}`);
        if (!Array.isArray(data)) {
          console.warn("fetchBills: unexpected response", data);
          return;
        }

        setBills((prev) => {
          const merged = mergeBillsFromServer(prev, data).slice(0, BILLS_CACHE_MAX);
          try {
            _tSet("cachedBills", merged);
          } catch (_) {}
          return merged;
        });
        setBillsReady(true);
      } catch (error) {
        console.error("fetchBills err:", error);
        if (Array.isArray(cachedData) && cachedData.length > 0) {
          setBills(cachedData);
          setBillsReady(true);
        }
        throw error;
      } finally {
        setBillsLoading(false);
      }
    };

    billsFetchDedupeRef.current = run();
    return billsFetchDedupeRef.current.finally(() => {
      billsFetchDedupeRef.current = null;
    });
  }, []);

  // mark a bill as paid on the server and update local cache
  const markBillPaid = async (id, orderRef = null) => {
    // Optimistic update — mark all COD sessions as paid so the button
    // disappears immediately instead of waiting for the server round-trip.
    let prevBills;
    setBills((prev) => {
      prevBills = prev;
      const next = prev.map((b) => {
        if (b._id !== id && b.id !== id) return b;
        const updatedSessions = (b.paymentSessions || []).map((s) =>
          s.method === "cod" ? { ...s, status: "paid" } : s
        );
        return { 
          ...b, 
          paymentStatus: "paid", 
          paymentSessions: updatedSessions,
          status: b.status === "Closed" ? "Closed" : "Paid",
          _pendingUpdate: Date.now(),
        };
      });
      // persist optimistic state to localStorage so a refresh keeps it
      try { _tSet('cachedBills', next); } catch (_) {}
      return next;
    });

    // Also update orders list optimistically
    setOrders((prev) => {
      const next = prev.map((o) => {
        const matchesBill =
          o._id === id ||
          o.id === id ||
          o.orderRef === id ||
          (orderRef && (o._id === orderRef || o.id === orderRef));
        if (!matchesBill) return o;

        const updatedSessions = (o.paymentSessions || []).map((s) =>
          s.method === "cod" ? { ...s, status: "paid" } : s
        );
        return {
          ...o,
          paymentStatus: "paid",
          paymentSessions: updatedSessions,
          status: o.status === "Closed" ? "Closed" : "Paid",
          _optimisticAt: Date.now() + 10000
        };
      });
      try { _tSet('cachedOrders', next); } catch (_) {}
      return next;
    });

    try {
      const { data } = await API.put(`/bills/${id}/pay`);
      // Reconcile with actual server data
      setBills((prev) => {
        const next = prev.map((b) => ((b._id || b.id) === (data._id || data.id)) ? { ...data, _pendingUpdate: undefined } : b);
        try { _tSet('cachedBills', next); } catch (_) {}
        return next;
      });
      return data;
    } catch (err) {
      // Revert on failure
      if (prevBills) {
        setBills(prevBills);
        try { _tSet('cachedBills', prevBills); } catch (_) {}
      }
      console.error("Error marking bill paid", err);
      throw err;
    }
  };

  // close a bill on the server and update local cache
  const closeBill = async (id) => {
    // Optimistic update
    let prevBills;
    setBills((prev) => {
      prevBills = prev;
      const next = prev.map((b) => 
        (b._id === id || b.id === id) 
          ? { ...b, status: "Closed", _pendingUpdate: Date.now() } 
          : b
      );
      try { _tSet('cachedBills', next); } catch (_) {}
      return next;
    });

    try {
      const { data } = await API.put(`/bills/${id}/close`);
      // Reconcile with actual server data
      setBills((prev) => {
        const next = prev.map((b) => 
          ((b._id || b.id) === (data._id || data.id)) 
            ? { ...data, _pendingUpdate: undefined } 
            : b
        );
        try { _tSet('cachedBills', next); } catch (_) {}
        return next;
      });
      return data;
    } catch (err) {
      // Revert on failure
      if (prevBills) {
        setBills(prevBills);
        try { _tSet('cachedBills', prevBills); } catch (_) {}
      }
      console.error("Error closing bill", err);
      throw err;
    }
  };

  // Fetch kitchen bills - separate batches for kitchen/waiter display
  const fetchKitchenBills = async () => {
    const token = localStorage.getItem("token");
    if (!token || isSuperAdminSession()) return;

    // Try to hydrate from cache for instant UI
    try {
      const cached = _tGet('cachedKitchenBills');
      if (Array.isArray(cached)) {
        setKitchenBills(cached);
      }
    } catch (e) {
      console.warn("failed to read cached kitchen bills", e);
    }

    try {
      setIsLoading(true);
      const { data } = await API.get("/kitchen-bills?limit=120");
      setKitchenBills(data);
      try {
        _tSet('cachedKitchenBills', data);
      } catch (e) {}
    } catch (error) {
      console.error("Error fetching kitchen bills:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch active (non-served) kitchen bills only
  const fetchActiveKitchenBills = useCallback(async () => {
    if (isSuperAdminSession()) return;
    if (kitchenActiveFetchDedupeRef.current) return kitchenActiveFetchDedupeRef.current;

    const run = async () => {
      try {
        const { data } = await API.get("/kitchen-bills/active");
        setKitchenBills(data);
        try {
          _tSet('cachedKitchenBills', data);
        } catch (e) {}
      } catch (error) {
        console.error("Error fetching active kitchen bills:", error);
      }
    };

    kitchenActiveFetchDedupeRef.current = run();
    return kitchenActiveFetchDedupeRef.current.finally(() => {
      kitchenActiveFetchDedupeRef.current = null;
    });
  }, []);

  // Update kitchen bill status
  const updateKitchenBillStatus = async (id, status) => {
    try {
      const { data } = await API.put(`/kitchen-bills/${id}/status`, { status });
      setKitchenBills((prev) => prev.map((kb) => (kb._id === id ? data : kb)));
    } catch (error) {
      console.error("Error updating kitchen bill status:", error);
    }
  };

  const addOrder = async (orderData) => {
    try {
      // calculate total if not provided (fallback to billDetails or manual sum)
      let total = orderData.totalPrice;
      if (total === undefined) {
        if (orderData.billDetails?.grandTotal) {
          total = orderData.billDetails.grandTotal;
        } else if (orderData.items) {
          total = orderData.items.reduce((sum, i) => sum + i.price * i.qty, 0);
        }
      }

      const effectiveTable = orderData.table || TAKEAWAY_TABLE;
      const orderItems = orderData.orderItems || orderData.items;

      // OPTIMISTIC UPDATE â€” immediately update local state so OrderSummary
      // sees the data without waiting for the server round-trip
      if (orderData.existingOrderId) {
        const parent = ordersRef.current.find((o) => o._id === orderData.existingOrderId);
        const sessionRef = parent?.sessionRef || orderData.existingOrderId;
        const optimisticOrder = {
          _id: `optimistic-addmore-${Date.now()}`,
          table: effectiveTable,
          sessionRef,
          items: orderItems,
          totalAmount: orderData.totalAmount || total,
          status: "New",
          billDetails: orderData.billDetails,
          notes: orderData.notes,
          customerName: orderData.customerName ?? parent?.customerName,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          tokenNumber: parent?.tokenNumber,
          createdAt: new Date().toISOString(),
          _optimistic: true,
          _optimisticAddMore: true,
        };
        setOrders((prev) => [optimisticOrder, ...prev]);
      } else {
        // New order â€” append optimistic entry
        const optimisticOrder = {
          _id: orderData.id || 'optimistic-' + Date.now(),
          table: effectiveTable,
          items: orderItems,
          totalAmount: orderData.totalAmount || total,
          status: "New",
          billDetails: orderData.billDetails,
          notes: orderData.notes,
          customerName: orderData.customerName,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          createdAt: orderData.createdAt || new Date().toISOString(),
          _optimistic: true,
        };
        setOrders((prev) => [optimisticOrder, ...prev]);
      }

      const payload = {
        orderItems: orderItems,
        table: effectiveTable,
        totalAmount: orderData.totalAmount || total,
        notes: orderData.notes,
        billDetails: orderData.billDetails,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus,
        paymentId: orderData.paymentId,
        customerName: orderData.customerName,
        customerAddress: orderData.customerAddress,
        deliveryTime: orderData.deliveryTime,
        existingOrderId: orderData.existingOrderId,
      };
      // New orders only: server forces "New"; omit on merge so payload stays minimal
      if (!orderData.existingOrderId) {
        payload.status = "New";
      }

      // attach waiter id if current user is a waiter
      try {
        const info = JSON.parse(localStorage.getItem("userInfo") || "{}");
        if (info && info._id && info.isWaiter) {
          payload.waiter = info._id;
        }
      } catch {}

      const { data } = await API.post("/orders", payload);

      // Replace optimistic placeholder with confirmed server order
      setOrders((prev) => {
        const withoutPlaceholders = orderData.existingOrderId
          ? prev.filter((o) => !o._optimisticAddMore)
          : prev.filter((o) => !o._optimistic);
        const alreadyExists = withoutPlaceholders.find((o) => o._id === data._id);
        const updated = alreadyExists
          ? withoutPlaceholders.map((o) => (o._id === data._id ? data : o))
          : [data, ...withoutPlaceholders];
        try { _tSet('cachedOrders', updated); } catch {}
        return updated;
      });

      scheduleAutoPrintForOrder(data?._id || data?.id);
      return data;
    } catch (error) {
      console.error("Error adding order:", error);
      throw error;
    }
  };

  // manual orders are created by admin via dedicated endpoint; payload
  // structure identical but call different URL and require auth middleware
  const addManualOrder = async (orderData) => {
    try {
      // reuse same payload construction as addOrder
      let total = orderData.totalPrice;
      if (total === undefined) {
        if (orderData.billDetails?.grandTotal) {
          total = orderData.billDetails.grandTotal;
        } else if (orderData.items) {
          total = orderData.items.reduce((sum, i) => sum + i.price * i.qty, 0);
        }
      }

      const payload = {
        orderItems: orderData.orderItems || orderData.items,
        table: orderData.table || TAKEAWAY_TABLE,
        totalAmount: orderData.totalAmount || total,
        notes: orderData.notes,
        billDetails: orderData.billDetails,
        paymentMethod: orderData.paymentMethod,
        status: "New",
        customerName: orderData.customerName,
        customerAddress: orderData.customerAddress,
        deliveryTime: orderData.deliveryTime,
        hasTakeaway: orderData.hasTakeaway,
        existingOrderId: orderData.existingOrderId, // For Add More Items functionality
      };

      const { data } = await API.post("/orders/manual", payload);
      
      setOrders((prev) => {
        const exists = prev.find((o) => o._id === data._id);
        if (exists) {
          return prev.map((o) => (o._id === data._id ? data : o));
        }
        return [data, ...prev];
      });
      scheduleAutoPrintForOrder(data?._id || data?.id);
      return data;
    } catch (error) {
      console.error("Error adding manual order:", error);
      throw error;
    }
  };


  const updateOrderStatus = async (id, status) => {
    // Optimistic update before API call
    let prevOrders, prevBills;
    setOrders((prev) => { prevOrders = prev; return prev.map((o) => o._id === id ? { ...o, status } : o); });
    if (status === "Closed") {
      setBills((prev) => {
        prevBills = prev;
        const idStr = String(id);
        return prev.map((b) => {
          if (billIdentityKey(b) === idStr || String(b.orderRef ?? "") === idStr) {
            return { ...b, status: "Closed" };
          }
          return b;
        });
      });
      try {
        const cached = _tGet('cachedBills');
        if (Array.isArray(cached)) {
          const updated = cached.map(b => {
            const key = b.orderRef || b._id || b.id;
            if (key === id) return { ...b, status: "Closed" };
            return b;
          });
          _tSet('cachedBills', updated);
        }
      } catch (e) {}
    }
    try {
      const { data } = await API.put(`/orders/${id}/status`, { status });
      setOrders((prev) => prev.map((o) => (o._id === id ? data : o)));
    } catch (error) {
      // Revert on failure
      if (prevOrders) setOrders(prevOrders);
      if (prevBills) setBills(prevBills);
      console.error("Error updating order status:", error);
      throw error;
    }
  };

  const clearOrders = () => {
    setOrders([]);
    setBills([]);
    _tDel('orders');
    _tDel('cachedOrders');
  };

  useEffect(() => {
    if (isSuperAdminSession()) return () => {};

    const joinRestaurantRoom = () => {
      const rid = user?.restaurantId || getRestaurantIdForTenantData();
      const token = localStorage.getItem("token");
      if (!rid) return;
      if (!socket.connected) socket.connect();
      socket.emit("joinRoom", {
        restaurantId: String(rid).toUpperCase().trim(),
        token: token || undefined,
      });
    };

    // reconnect socket once when provider mounts
    socket.connect();
    console.log("OrderContext: Socket initializing...");
    joinRestaurantRoom();

    // Re-fetch bills when socket reconnects (covers missed events during disconnect)
    socket.on("connect", () => {
      console.log("OrderContext: Socket connected successfully");
      joinRestaurantRoom();
      const t = localStorage.getItem("token");
      if (t) {
        fetchOrders();
        fetchBills();
      }
    });

    socket.on("connect_error", (err) => {
      console.error("OrderContext: Socket connection error:", err.message);
    });

    socket.on("orderCreated", (order) => {
      setOrders((prev) => {
        // avoid duplicates if snapshot already included this order
        const exists = prev.find((o) => o._id === order._id);
        const next = exists
          ? prev.map((o) => (o._id === order._id ? order : o))
          : [order, ...prev];
        try { _tSet('cachedOrders', next); } catch {}
        return next;
      });
      scheduleAutoPrintForOrder(order?._id || order?.id);
    });
    socket.on("orderUpdated", (order) => {
      setOrders((prev) => {
        const now = Date.now();
        const exists = prev.find((o) => o._id === order._id);
        
        // If the order is "Closed", we should ideally remove it from the ACTIVE orders list
        // so that Tables.jsx (which filters for status !== "Closed") updates immediately.
          const next = exists
          ? prev.map((o) => {
              if (o._id !== order._id) return o;
              // If optimistic merge is recent and server data has fewer items, skip
              if (o._optimisticAt && (now - o._optimisticAt) < 15000 &&
                  order.items && o.items && order.items.length < o.items.length) {
                return o;
              }
              // Server caught up or has equal/more items â€” accept and clear flag
              return { ...order, _optimisticAt: undefined };
            })
          : [order, ...prev];
        try { _tSet('cachedOrders', next); } catch {}
        return next;
      });
    });

    // listen for bills added so billing page updates automatically
    socket.on("billCreated", (bill) => {
      console.log("Socket: billCreated RECEIVED", bill);
      setBills((prev) => {
        const nk = billIdentityKey(bill);
        const idx = nk ? prev.findIndex((b) => billIdentityKey(b) === nk) : -1;
        let next;
        if (idx >= 0) {
          next = [...prev];
          next[idx] = bill;
        } else {
          next = [bill, ...prev];
        }
        try {
          _tSet("cachedBills", next.slice(0, BILLS_CACHE_MAX));
        } catch (_) {}
        return next;
      });
      setBillsReady(true);
    });

    // listen for "Add More Items" so admin panel can show notification
    socket.on("orderItemsAdded", (data) => {
      // Dispatch a custom event that Notification component can listen to
      window.dispatchEvent(new CustomEvent("orderItemsAdded", { detail: data }));
    });

    // listen for bill updates (e.g., when Add More Items merges into existing bill)
    socket.on("billUpdated", (updatedBill) => {
      setBills((prev) => {
        const id = updatedBill._id || updatedBill.id;
        const nk = billIdentityKey(updatedBill);
        const exists = prev.find(
          (b) =>
            billIdentityKey(b) === nk ||
            (id != null && (b._id === id || b.id === id))
        );
        
        // If a bill is closed, we don't necessarily remove it from "bills" (since history is fine),
        // but we DO want to ensure the "orders" state is also updated.
        // The orderUpdated socket event usually handles this, but syncing here adds redundancy.
        
        // Merge logic: protect local pending updates from being overwritten by 
        // stale socket messages for 15 seconds (matching markBillPaid logic)
        if (isBillPendingUpdate(exists)) {
          return prev;
        }

        let next;
        if (exists) {
          next = prev.map((b) =>
            billIdentityKey(b) === nk || (id != null && (b._id === id || b.id === id))
              ? updatedBill
              : b
          );
        } else {
          next = [updatedBill, ...prev];
        }

        try { _tSet("cachedBills", next.slice(0, BILLS_CACHE_MAX)); } catch (_) {}
        return next;
      });
      setBillsReady(true);
    });

    // Handle bill deletions
    socket.on("billDeleted", (billId) => {
      setBills((prev) => {
        const next = prev.filter(b => b._id !== billId && b.id !== billId);
        try { _tSet('cachedBills', next); } catch (_) {}
        return next;
      });
    });

    // Kitchen bill socket events
    socket.on("kitchenBillCreated", (kitchenBill) => {
      setKitchenBills((prev) => [kitchenBill, ...prev]);
      // Also update localStorage cache
      try {
        const parsed = _tGet('cachedKitchenBills');
        _tSet('cachedKitchenBills', [kitchenBill, ...(Array.isArray(parsed) ? parsed : [])]);
      } catch (e) {}
      try {
        window.dispatchEvent(
          new CustomEvent("kitchenBillCreated", { detail: kitchenBill })
        );
      } catch (_) {}
    });

    socket.on("kitchenBillUpdated", (updatedKitchenBill) => {
      setKitchenBills((prev) => {
        const exists = prev.find((kb) => kb._id === updatedKitchenBill._id);
        if (exists) {
          return prev.map((kb) => (kb._id === updatedKitchenBill._id ? updatedKitchenBill : kb));
        }
        return [updatedKitchenBill, ...prev];
      });
      // Update localStorage cache
      try {
        const cached = _tGet('cachedKitchenBills');
        if (Array.isArray(cached)) {
          const updated = cached.map((kb) => 
            kb._id === updatedKitchenBill._id ? updatedKitchenBill : kb
          );
          _tSet('cachedKitchenBills', updated);
        }
      } catch (e) {}
    });

    // Replace orders with authoritative server snapshot — but preserve paid/closed history.
    socket.on("ordersSnapshot", (list) => {
      if (!Array.isArray(list)) return;
      setOrders((prev) => {
        const snapshot = list || [];
        const mergedMap = new Map();

        for (const order of snapshot) {
          mergedMap.set(orderKey(order), order);
        }

        for (const order of prev) {
          const key = orderKey(order);
          if (!key) continue;
          const isFinal = ["served", "paid", "closed"].includes(normalizeStatus(order.status));
          if (!isFinal) continue;
          const existing = mergedMap.get(key);
          if (!existing || !["served", "paid", "closed"].includes(normalizeStatus(existing.status))) {
            mergedMap.set(key, order);
          }
        }

        const merged = Array.from(mergedMap.values()).sort((a, b) =>
          new Date(b.createdAt || b._optimisticAt || 0) - new Date(a.createdAt || a._optimisticAt || 0)
        );
        try { _tSet('cachedOrders', merged); } catch {}
        return merged;
      });
    });

    return () => {
      socket.off("orderCreated");
      socket.off("orderUpdated");
      socket.off("billCreated");
      socket.off("billUpdated");
      socket.off("orderItemsAdded");
      socket.off("ordersSnapshot");
      socket.off("connect");
      socket.off("kitchenBillCreated");
      socket.off("kitchenBillUpdated");
      socket.disconnect();
    };
  }, [user?.restaurantId]);

  // Single hydrate + fetch on mount. Cache was already loaded via useState
  // initialisers above, so we only need to fire the network requests once.
  useEffect(() => {
    // Initial load is route-driven (Admin / Kitchen / Waiter layouts) to avoid a global API burst.

    // re-fetch only when the tab regains focus (user switched back)
    // Also detect restaurant switch and reset state accordingly.
    const onFocus = () => {
      const t = localStorage.getItem("token");
      if (!t || isSuperAdminSession()) return;

      // Detect restaurant switch
      const liveRid = getRestaurantIdForTenantData();
      if (liveRid && liveRid !== _mountedRid.current) {
        _mountedRid.current = liveRid;
        // Reset state to the new restaurant's cache (or empty)
        const cachedOrders = tenantGet('cachedOrders', liveRid);
        const cachedBills = tenantGet('cachedBills', liveRid);
        const cachedKB = tenantGet('cachedKitchenBills', liveRid);
        setOrders(Array.isArray(cachedOrders) ? cachedOrders : []);
        setBills(Array.isArray(cachedBills) ? cachedBills : []);
        setKitchenBills(Array.isArray(cachedKB) ? cachedKB : []);
        setBillsReady(Array.isArray(cachedBills) && cachedBills.length > 0);
        lastWindowFocusFetchRef.current = 0;
        fetchOrders();
        fetchBills({ force: true });
        return;
      }

      const now = Date.now();
      if (now - lastWindowFocusFetchRef.current < 30000) return;
      lastWindowFocusFetchRef.current = now;
      fetchOrders();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <OrderContext.Provider
      value={{
        orders,
        bills,
        kitchenBills,
        addOrder,
        addManualOrder,
        updateOrderStatus,
        updateKitchenBillStatus,
        clearOrders,
        fetchOrders,
        fetchTableOrders,
        fetchBills,
        fetchKitchenBills,
        fetchActiveKitchenBills,
        markBillPaid,
        closeBill,
        isLoading,
        billsLoading,
        billsReady,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
};