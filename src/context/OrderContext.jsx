import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const { data } = await API.get("/orders");
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

      const { data } = await API.post("/orders", {
        orderItems: orderData.items,
        table: orderData.table,
        totalAmount: total,
      });
      setOrders([...orders, data]);
      return data;
    } catch (error) {
      console.error("Error adding order:", error);
    }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      const { data } = await API.put(`/orders/${id}/status`, { status });
      setOrders(orders.map((o) => (o._id === id ? data : o)));
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const clearOrders = () => {
    setOrders([]);
  };

  return (
    <OrderContext.Provider
      value={{ orders, addOrder, updateOrderStatus, clearOrders, fetchOrders, fetchTableOrders, isLoading }}
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