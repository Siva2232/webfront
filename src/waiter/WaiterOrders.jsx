import React, { useEffect } from "react";
import OrdersDashboard from "../admin/Orders";
import { useOrders } from "../context/OrderContext";

export default function WaiterOrders() {
  const { orders, fetchOrders } = useOrders();

  useEffect(() => {
    // Waiters need to see the full list of active orders
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* We reuse the admin Orders dashboard which shows analytics and live order cards */}
        <OrdersDashboard overrideOrders={orders} />
      </div>
    </div>
  );
}
