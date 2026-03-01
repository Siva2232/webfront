import { useParams } from "react-router-dom";
import { useOrders } from "../context/OrderContext";
import StatusBadge from "../components/StatusBadge";
import { useEffect } from "react";
import { TAKEAWAY_TABLE } from "../context/CartContext";
import { Package } from "lucide-react";

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
          {(order.table === TAKEAWAY_TABLE || !order.table) ? "Takeaway" : `Table ${order.table}`}
        </p>

        <StatusBadge status={order.status} />

        <div className="mt-6 space-y-2 text-sm text-left">
          {order.items.map(item => (
            <div key={item._id || item.id} className={`flex justify-between p-2 rounded-lg ${order.table !== TAKEAWAY_TABLE && item.isTakeaway ? 'bg-orange-50 border border-orange-100' : ''}`}>
              <div className="flex flex-col">
                <span className="font-bold flex items-center gap-2">
                  {item.name} × {item.qty}
                  {order.table !== TAKEAWAY_TABLE && item.isTakeaway && (
                    <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[8px] font-black uppercase rounded flex items-center gap-1">
                      <Package size={8} /> TAKEAWAY
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-gray-400">₹{item.price} each</span>
              </div>
              <span className="font-mono">₹{item.price * item.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
