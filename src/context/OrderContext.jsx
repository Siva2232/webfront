import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import API from "../api/axios";
import { io } from "socket.io-client";
import { TAKEAWAY_TABLE } from "./CartContext";
import { getCurrentRestaurantId, tenantKey, tenantGet, tenantSet, tenantRemove } from "../utils/tenantCache";

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();
const orderKey = (order) => String(order?._id || order?.id || "");

// the socket URL should match the backend deployment; use env var if available
// fall back to the same host as the REST API by trimming any trailing /api segment
const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000");

// shared socket instance so we don't reconnect on every render
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: false,
});

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  // namespaced cache helpers — each restaurant stores data in its own slot
  const _rid = getCurrentRestaurantId();
  const _mountedRid = useRef(_rid);
  // Use live helpers that always read the CURRENT restaurantId (not the stale mount-time value)
  const _getLiveRid = () => getCurrentRestaurantId() || _mountedRid.current;
  const _tGet  = (k)    => tenantGet(k, _getLiveRid());
  const _tSet  = (k, v) => tenantSet(k, _getLiveRid(), v);
  const _tDel  = (k)    => tenantRemove(k, _getLiveRid());

  const [orders, setOrders] = useState(() => {
    try {
      const cached = _tGet('cachedOrders');
      return Array.isArray(cached) ? cached : [];
    } catch { return []; }
  });
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
  const [billsReady, setBillsReady] = useState(() => {
    try {
      const cached = _tGet('cachedBills');
      return Array.isArray(cached) && cached.length > 0;
    } catch {}
    return false;
  });
  const _billsFetchInFlight = useRef(false);
  const _ordersFetchInFlight = useRef(false);
  const _kitchenBillsFetchInFlight = useRef(false);

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (_ordersFetchInFlight.current) return;
    _ordersFetchInFlight.current = true;

    // The state is already hydrated from localStorage in the useState initializer.
    // We only need to check if we should trigger the loader.
    if (orders.length === 0) {
      setIsLoading(true);
    }

    try {
      // Fetch active orders only â€” keeps the Orders page fast
      const { data } = await API.get("/orders?limit=100&status=Pending,New,Preparing,Ready,Served,Paid");
      setOrders((prev) => {
        // Merge strategy: incoming data from server is the "source of truth",
        // but we preserve any very recent optimistic updates that haven't hit the DB yet.
        const now = Date.now();
        const serverMap = new Map(data.map(o => [o._id, o]));
        
        // Items in prev that are NOT in server data (might be new/local only)
        const localOnly = prev.filter(o => !serverMap.has(o._id) && o._optimistic);
        
        const merged = data.map(serverOrder => {
          const localOrder = prev.find(o => o._id === serverOrder._id);
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

        try { _tSet('cachedOrders', final); } catch {}
        return final;
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      _ordersFetchInFlight.current = false;
      setIsLoading(false);
    }
  };

  const fetchTableOrders = async (tableNum) => {
    try {
      const { data } = await API.get(`/orders/table/${tableNum}`);

      // if we have a persisted optimistic patch from before refresh, reapply it
      let optimisticPatch;
      try {
        optimisticPatch = _tGet('optimisticOrderPatch') || null;
      } catch (e) {
        optimisticPatch = null;
      }

      const patchedData = data.map((order) => {
        if (optimisticPatch && order._id === optimisticPatch.orderId) {
          const mergedItems = [...order.items, ...optimisticPatch.mergedItems.map(item => ({
            ...item,
            addedAt: new Date().toISOString(),
            isNewItem: true,
          }))];
          return {
            ...order,
            items: mergedItems,
            totalAmount: mergedItems.reduce((sum, item) => sum + (item.price * item.qty), 0),
            billDetails: {
              subtotal: mergedItems.reduce((sum, item) => sum + (item.price * item.qty), 0),
              cgst: mergedItems.reduce((sum, item) => sum + (item.price * item.qty), 0) * 0.025,
              sgst: mergedItems.reduce((sum, item) => sum + (item.price * item.qty), 0) * 0.025,
              grandTotal: mergedItems.reduce((sum, item) => sum + (item.price * item.qty), 0) * 1.05,
            },
            _optimisticAt: Date.now(),
          };
        }
        return order;
      });

      setOrders((prev) => {
        const now = Date.now();
        const incoming = new Map(patchedData.map((o) => [o._id, o]));
        const merged = prev.map((o) => {
          const server = incoming.get(o._id);
          if (!server) return o;
          if (o._optimisticAt && (now - o._optimisticAt) < 15000) {
            if (server.items && o.items && server.items.length < o.items.length) {
              return o;
            }
          }
          return { ...server, _optimisticAt: undefined };
        });
        patchedData.forEach((o) => { if (!prev.find((p) => p._id === o._id)) merged.push(o); });
        try { _tSet('cachedOrders', merged); } catch {}
        return merged;
      });

      // if we successfully re-applied the patch, clear it once we have a packet
      if (optimisticPatch) {
        _tDel('optimisticOrderPatch');
      }
    } catch (error) {
      console.error("Error fetching table orders:", error);
    }
  };

  // fetch bills (invoices) - for admin billing screen
  const fetchBills = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (_billsFetchInFlight.current) return;
    _billsFetchInFlight.current = true;

    // Fast path: load from namespaced cache if we are in the middle of a session
    const cachedData = _tGet('cachedBills');
    if (Array.isArray(cachedData) && cachedData.length > 0) {
      setBills(cachedData);
      setBillsReady(true);
    }

    try {
      // Very lean fetch: limit to 20 for fast TTI
      const { data } = await API.get("/bills?limit=20");
      if (!Array.isArray(data)) {
        _billsFetchInFlight.current = false;
        return;
      }

      setBills((prev) => {
        const now = Date.now();
        const prevMap = new Map();
        // Index existing bills by unique ID
        prev.forEach(p => {
          const key = p.orderRef || p._id || p.id;
          if (key) prevMap.set(key, p);
        });
        
        // Merge server data
        data.forEach(serverBill => {
          const key = serverBill.orderRef || serverBill._id || serverBill.id;
          if (!key) return;

          const localBill = prevMap.get(key);
          // Protection: Don't overwrite if we have a very recent local update (15s window)
          if (localBill?._pendingUpdate && (now - localBill._pendingUpdate < 15000)) {
            return; 
          }
          prevMap.set(key, serverBill);
        });

        // Filter out closed bills that were merged from previous state but not in the fresh server batch (if they were archived)
        // Keep active/unpaid ones regardless
        const final = Array.from(prevMap.values())
          .sort((a,b) => new Date(b.billedAt || b.createdAt || 0) - new Date(a.billedAt || a.createdAt || 0))
          .slice(0, 50); // Hard memory cap
          
        try { _tSet('cachedBills', final); } catch (_) {}
        return final;
      });
    } catch (error) {
      console.error("fetchBills err:", error);
    } finally {
      _billsFetchInFlight.current = false;
      setBillsReady(true);
      setIsLoading(false);
    }
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
          _pendingUpdate: Date.now() + 10000 // Flag prevents socket/poll from reverting for 10s
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
    if (!token) return;

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
      const { data } = await API.get("/kitchen-bills?limit=500");
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
  const fetchActiveKitchenBills = async () => {
    if (_kitchenBillsFetchInFlight.current) return;
    _kitchenBillsFetchInFlight.current = true;
    try {
      const { data } = await API.get("/kitchen-bills/active");
      setKitchenBills(data);
      try {
        _tSet('cachedKitchenBills', data);
      } catch (e) {}
    } catch (error) {
      console.error("Error fetching active kitchen bills:", error);
    } finally {
      _kitchenBillsFetchInFlight.current = false;
    }
  };

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
        // Merge items into existing order optimistically
        setOrders((prev) => {
          const updated = prev.map((o) => {
            if (o._id !== orderData.existingOrderId) return o;
            const mergedItems = [...(o.items || []), ...orderItems.map(item => ({
              ...item,
              addedAt: new Date().toISOString(),
              isNewItem: true,
            }))];
            const newSubtotal = mergedItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
            const newCgst = newSubtotal * 0.025;
            const newSgst = newSubtotal * 0.025;
            const newGrandTotal = newSubtotal + newCgst + newSgst;
            return {
              ...o,
              items: mergedItems,
              totalAmount: newGrandTotal,
              billDetails: { subtotal: newSubtotal, cgst: newCgst, sgst: newSgst, grandTotal: newGrandTotal },
              _optimisticAt: Date.now(), // protect from stale fetches
            };
          });

          // Persist optimistic patch in case of hard refresh
          try {
            const patch = {
              orderId: orderData.existingOrderId,
              mergedItems: orderItems,
              updatedAt: Date.now(),
            };
            _tSet('optimisticOrderPatch', patch);
          } catch (e) {
            console.warn("Could not persist optimistic patch", e);
          }

          return updated;
        });
      } else {
        // New order â€” append optimistic entry
        const optimisticOrder = {
          _id: orderData.id || 'optimistic-' + Date.now(),
          table: effectiveTable,
          items: orderItems,
          totalAmount: orderData.totalAmount || total,
          status: orderData.status || 'Pending',
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
        status: orderData.status,
        customerName: orderData.customerName,
        customerAddress: orderData.customerAddress,
        deliveryTime: orderData.deliveryTime,
        existingOrderId: orderData.existingOrderId,
      };

      // attach waiter id if current user is a waiter
      try {
        const info = JSON.parse(localStorage.getItem("userInfo") || "{}");
        if (info && info._id && info.isWaiter) {
          payload.waiter = info._id;
        }
      } catch {}

      const { data } = await API.post("/orders", payload);

      // Replace optimistic data with real server data
      setOrders((prev) => {
        // Step 1: strip out ALL optimistic entries for this table
        const withoutOptimistic = prev.filter((o) => !o._optimistic);
        // Step 2: if the real server order already present (via socket), just update it
        const alreadyExists = withoutOptimistic.find((o) => o._id === data._id);
        if (alreadyExists) {
          return withoutOptimistic.map((o) => (o._id === data._id ? data : o));
        }
        // Step 3: otherwise prepend the confirmed server order
        const updated = [data, ...withoutOptimistic];
        try { _tSet('cachedOrders', updated); } catch {}
        return updated;
      });

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
        status: orderData.status,
        customerName: orderData.customerName,
        customerAddress: orderData.customerAddress,
        deliveryTime: orderData.deliveryTime,
        hasTakeaway: orderData.hasTakeaway,
        existingOrderId: orderData.existingOrderId, // For Add More Items functionality
      };

      const { data } = await API.post("/orders/manual", payload);
      
      // If backend merged the order, update existing entry instead of appending
      setOrders((prev) => {
        const exists = prev.find((o) => o._id === data._id);
        if (exists) {
          return prev.map((o) => (o._id === data._id ? data : o));
        }
        return [...prev, data];
      });
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
        return prev.map(b => {
          const key = b.orderRef || b._id || b.id;
          if (key === id) return { ...b, status: "Closed" };
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
    // reconnect socket once when provider mounts
    socket.connect();
    console.log("OrderContext: Socket initializing...");

    // Join restaurant-specific room for scoped events
    const rid = localStorage.getItem('restaurantId');
    if (rid) socket.emit('joinRoom', { restaurantId: rid, token: localStorage.getItem('token') || undefined });

    // Re-fetch bills when socket reconnects (covers missed events during disconnect)
    socket.on("connect", () => {
      console.log("OrderContext: Socket connected successfully");
      const r = localStorage.getItem('restaurantId');
      if (r) socket.emit('joinRoom', { restaurantId: r, token: localStorage.getItem('token') || undefined });
      const t = localStorage.getItem("token");
      if (t) fetchBills();
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
        const key = bill.orderRef || bill._id || bill.id;
        const exists = prev.find((b) => (b._id === key || b.id === key) || b.orderRef === key);
        
        if (exists) return prev.map((b) => ((b._id === key || b.id === key) || b.orderRef === key) ? bill : b);
        
        const next = [bill, ...prev];
        try { _tSet('cachedBills', next.slice(0, 100)); } catch (_) {}
        return next;
      });
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
        const exists = prev.find((b) => (b._id === id || b.id === id) || b.orderRef === updatedBill.orderRef);
        
        // If a bill is closed, we don't necessarily remove it from "bills" (since history is fine),
        // but we DO want to ensure the "orders" state is also updated.
        // The orderUpdated socket event usually handles this, but syncing here adds redundancy.
        
        // Merge logic: protect local pending updates from being overwritten by 
        // stale socket messages for 15 seconds (matching markBillPaid logic)
        if (exists?._pendingUpdate && (Date.now() - exists._pendingUpdate < 15000)) {
           return prev;
        }

        let next;
        if (exists) {
          next = prev.map((b) => 
            ((b._id === id || b.id === id) || b.orderRef === updatedBill.orderRef) ? updatedBill : b
          );
        } else {
          // If a new bill arrives via socket (e.g. from manual ordering or first addition),
          // ensure we don't duplicate it.
          next = [updatedBill, ...prev];
        }

        try { _tSet('cachedBills', next.slice(0, 100)); } catch (_) {}
        return next;
      });
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
          const isFinal = ["paid", "closed"].includes(normalizeStatus(order.status));
          if (!isFinal) continue;
          const existing = mergedMap.get(key);
          if (!existing || !["paid", "closed"].includes(normalizeStatus(existing.status))) {
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
  }, []);

  // Single hydrate + fetch on mount. Cache was already loaded via useState
  // initialisers above, so we only need to fire the network requests once.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchOrders();
      fetchBills();
    }

    // re-fetch only when the tab regains focus (user switched back)
    // Also detect restaurant switch and reset state accordingly.
    const onFocus = () => {
      const t = localStorage.getItem("token");
      if (!t) return;

      // Detect restaurant switch
      const liveRid = getCurrentRestaurantId();
      if (liveRid && liveRid !== _mountedRid.current) {
        _mountedRid.current = liveRid;
        // Reset state to the new restaurant's cache (or empty)
        const cachedOrders = tenantGet('cachedOrders', liveRid);
        const cachedBills = tenantGet('cachedBills', liveRid);
        const cachedKB = tenantGet('cachedKitchenBills', liveRid);
        setOrders(Array.isArray(cachedOrders) ? cachedOrders : []);
        setBills(Array.isArray(cachedBills) ? cachedBills : []);
        setKitchenBills(Array.isArray(cachedKB) ? cachedKB : []);
        setBillsReady(false);
      }

      fetchOrders();
      fetchBills();
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