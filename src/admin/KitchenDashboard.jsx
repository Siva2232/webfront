import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "../context/OrderContext";
import {
  ShoppingCart,
  BellRing,
  Flame,
  Coffee,
  PackageCheck,
} from "lucide-react";

export default function KitchenDashboard() {
  const { orders = [], fetchOrders } = useOrders();
  const navigate = useNavigate();

  useEffect(() => {
    if (orders.length === 0) {
      fetchOrders();
    }
  }, [orders, fetchOrders]);

  const activeOrders = orders.filter((o) => o.status !== "Served");
  const preparing = orders.filter((o) => o.status === "Preparing").length;
  const cooking = orders.filter((o) => o.status === "Cooking").length;
  const ready = orders.filter((o) => o.status === "Ready").length;
  const served = orders.filter((o) => o.status === "Served").length;

  const previewOrders = activeOrders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-6 font-sans text-slate-900">
      <header className="mb-8">
        <h1 className="text-4xl font-black">Kitchen Dashboard</h1>
        <p className="text-slate-500">Realtime overview for the kitchen team</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <StatCard label="Active" value={activeOrders.length} icon={ShoppingCart} color="bg-orange-100" />
        <StatCard label="Preparing" value={preparing} icon={Flame} color="bg-amber-100" />
        <StatCard label="Cooking" value={cooking} icon={Coffee} color="bg-red-100" />
        <StatCard label="Ready" value={ready} icon={BellRing} color="bg-indigo-100" />
        <StatCard label="Served" value={served} icon={PackageCheck} color="bg-emerald-100" />
      </div>

      <section>
        <h2 className="text-2xl font-black mb-4">Recent Active Orders</h2>
        {previewOrders.length === 0 ? (
          <p className="text-slate-400">No active orders at the moment.</p>
        ) : (
          <div className="space-y-4">
            {previewOrders.map((o) => (
              <div
                key={o._id || o.id}
                className="p-4 bg-white rounded-xl border border-slate-200 flex justify-between items-center"
              >
                <div>
                  <p className="font-black">Table {o.table}</p>
                  <p className="text-sm text-slate-500">#{(o._id || o.id).slice(-5)}</p>
                </div>
                <div className="text-sm text-slate-700">{o.status}</div>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => navigate("/kitchen/orders")}
          className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-xl"
        >
          See All Orders
        </button>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className={`p-6 rounded-2xl shadow-sm flex flex-col items-center ${color}`}>      
      <Icon size={24} className="mb-2 text-slate-700" />
      <span className="text-3xl font-black text-slate-900">{value}</span>
      <span className="text-xs font-bold text-slate-500 uppercase mt-1">{label}</span>
    </div>
  );
}
