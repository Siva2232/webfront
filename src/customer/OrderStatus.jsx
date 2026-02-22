import { useParams } from "react-router-dom";
import { useOrders } from "../context/OrderContext";
import StatusBadge from "../components/StatusBadge";
import { useEffect } from "react";

export default function OrderStatus() {
  const { orderId } = useParams();
  const { orders, fetchOrders } = useOrders();

  useEffect(() => {
    if (orders.length === 0) fetchOrders();
  }, []);

  const order = orders.find(o => o._id === orderId || o.id === orderId);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-2">Order Confirmed 🎉</h1>
        <p className="text-sm text-gray-500 mb-4">
          Table {order.table}
        </p>

        <StatusBadge status={order.status} />

        <div className="mt-6 space-y-2 text-sm text-left">
          {order.items.map(item => (
            <div key={item._id || item.id} className="flex justify-between">
              <span>{item.name} × {item.qty}</span>
              <span>₹{item.price * item.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
