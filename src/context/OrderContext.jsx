import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";
import { io } from "socket.io-client";
import { TAKEAWAY_TABLE } from "./CartContext";

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
  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState(() => {
    try {
      const cached = localStorage.getItem("cachedBills");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }); // separate collection for invoices, hydrated from storage
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    // only fetch if we have a token (admin or logged in user)
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setIsLoading(true);
      // support optional limit param if needed to reduce payload size
      const { data } = await API.get("/orders?limit=200");
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableOrders = async (tableNum) => {
    try {
      const { data } = await API.get(`/orders/table/${tableNum}`);
      setOrders(data);
    } catch (error) {
      console.error("Error fetching table orders:", error);
    }
  };

  // fetch bills (invoices) - for admin billing screen
  const fetchBills = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // try to hydrate immediately from cache for instant UI
    try {
      const cached = localStorage.getItem("cachedBills");
      if (cached) {
        setBills(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("failed to read cached bills", e);
    }

    try {
      setIsLoading(true);
      // limit to last 500 invoices, server should support pagination too
      const { data } = await API.get("/bills?limit=500&sort=desc");
      // remove duplicates by orderRef or _id
      const seen = new Set();
      const unique = data.filter(b => {
        const key = b.orderRef || b._id || b.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setBills(unique);
      try {
        localStorage.setItem("cachedBills", JSON.stringify(unique));
      } catch (e) {}
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addOrder = async (orderData) => {
    // when we create an order locally we can optimistically append it
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

      const payload = {
        orderItems: orderData.orderItems || orderData.items,
        // if table is empty / falsy treat as a takeaway to match
        // frontend semantics and avoid disappearing orders.
        table: orderData.table || TAKEAWAY_TABLE,
        totalAmount: orderData.totalAmount || total,
        // forward optional metadata if provided
        notes: orderData.notes,
        billDetails: orderData.billDetails,
        paymentMethod: orderData.paymentMethod,
        status: orderData.status, // e.g. "Preparing" from cart
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

      // If the backend merged the order, it returns 200 and the updated object.
      // We should update the existing order in state instead of appending.
      setOrders((prev) => {
        const exists = prev.find((o) => o._id === data._id);
        if (exists) {
          return prev.map((o) => (o._id === data._id ? data : o));
        }
        return [...prev, data];
      });

      // NOTE: Backend already creates/updates bills automatically.
      // No need to create bills here - this would cause duplicates.

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
      };

      const { data } = await API.post("/orders/manual", payload);
      setOrders((prev) => [...prev, data]);
      return data;
    } catch (error) {
      console.error("Error adding manual order:", error);
      throw error;
    }
  };


  const updateOrderStatus = async (id, status) => {
    try {
      const { data } = await API.put(`/orders/${id}/status`, { status });
      setOrders((prev) => prev.map((o) => (o._id === id ? data : o)));
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const clearOrders = () => {
    setOrders([]);
    setBills([]);
    localStorage.removeItem("orders");
  };

  useEffect(() => {
    // reconnect socket once when provider mounts
    socket.connect();

    socket.on("orderCreated", (order) => {
      setOrders((prev) => [order, ...prev]);
    });
    socket.on("orderUpdated", (order) => {
      setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
    });

    // listen for bills added so billing page updates automatically
    socket.on("billCreated", (bill) => {
      setBills((prev) => [bill, ...prev]);
    });

    // listen for bill updates (e.g., when Add More Items merges into existing bill)
    socket.on("billUpdated", (updatedBill) => {
      setBills((prev) => {
        const exists = prev.find((b) => (b._id || b.id) === (updatedBill._id || updatedBill.id) || b.orderRef === updatedBill.orderRef);
        if (exists) {
          return prev.map((b) => 
            ((b._id || b.id) === (updatedBill._id || updatedBill.id) || b.orderRef === updatedBill.orderRef) ? updatedBill : b
          );
        }
        // If not found, add it (edge case)
        return [updatedBill, ...prev];
      });
      // Also update localStorage cache immediately
      try {
        const cached = localStorage.getItem("cachedBills");
        if (cached) {
          const parsed = JSON.parse(cached);
          const updated = parsed.map((b) => 
            ((b._id || b.id) === (updatedBill._id || updatedBill.id) || b.orderRef === updatedBill.orderRef) ? updatedBill : b
          );
          localStorage.setItem("cachedBills", JSON.stringify(updated));
        }
      } catch (e) {}
    });

    // if the server sends full snapshot (future enhancement)
    socket.on("ordersSnapshot", (list) => {
      setOrders(list);
    });

    return () => {
      socket.off("orderCreated");
      socket.off("orderUpdated");
      socket.off("billCreated");
      socket.off("billUpdated");
      socket.off("ordersSnapshot");
      socket.disconnect();
    };
  }, []);

  // persist to localstorage so reloads have instant data
  useEffect(() => {
    try {
      localStorage.setItem("orders", JSON.stringify(orders));
    } catch (_) {}
  }, [orders]);

  // hydrate from cache on first render
  useEffect(() => {
    const cached = localStorage.getItem("orders");
    if (cached) {
      try {
        setOrders(JSON.parse(cached));
      } catch (_) {}
    }
    // always fetch fresh data regardless of cache if token exists
    const token = localStorage.getItem("token");
    if (token) {
      fetchOrders();
    }

    // ensure bills are hydrated as well
    const billsCache = localStorage.getItem("cachedBills");
    if (billsCache) {
      try {
        setBills(JSON.parse(billsCache));
      } catch (_) {}
    }
    if (token) {
      fetchBills();
    }
  }, []);

  // watch for login status changes to fetch data
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      if (token && orders.length === 0 && !isLoading) {
        fetchOrders();
      }
    };

    // check on mount and when window gains focus
    checkAuth();
    window.addEventListener("focus", checkAuth);
    // also check periodically or when custom event fires
    const interval = setInterval(checkAuth, 5000); 

    return () => {
      window.removeEventListener("focus", checkAuth);
      clearInterval(interval);
    };
  }, [orders.length, isLoading]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        bills,
        addOrder,
        addManualOrder,
        updateOrderStatus,
        clearOrders,
        fetchOrders,
        fetchTableOrders,
        fetchBills,
        isLoading,
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