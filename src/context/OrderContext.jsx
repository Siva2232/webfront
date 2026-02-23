import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";
import { io } from "socket.io-client";

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
  const [bills, setBills] = useState([]); // separate collection for invoices
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
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
    try {
      setIsLoading(true);
      const { data } = await API.get("/bills");
      setBills(data);
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
        orderItems: orderData.items,
        table: orderData.table,
        totalAmount: total,
        // forward optional metadata if provided
        notes: orderData.notes,
        billDetails: orderData.billDetails,
        paymentMethod: orderData.paymentMethod,
        status: orderData.status, // e.g. "Preparing" from cart
      };
      const { data } = await API.post("/orders", payload);
      setOrders([...orders, data]);

      // also create a bill record -- backend auto-creates one, but we
      // can optionally ensure it here for clients that bypass order API
      try {
        await API.post("/bills", {
          orderRef: data._id,
          table: data.table,
          items: data.items,
          totalAmount: data.totalAmount,
          status: data.status,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          billDetails: data.billDetails,
        });
      } catch (err) {
        // ignore; server already created on its side
      }

      return data;
    } catch (error) {
      console.error("Error adding order:", error);
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

    // if the server sends full snapshot (future enhancement)
    socket.on("ordersSnapshot", (list) => {
      setOrders(list);
    });

    return () => {
      socket.off("orderCreated");
      socket.off("orderUpdated");
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
    // always fetch fresh data regardless of cache
    fetchOrders();
  }, []);

  return (
    <OrderContext.Provider
      value={{
        orders,
        bills,
        addOrder,
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