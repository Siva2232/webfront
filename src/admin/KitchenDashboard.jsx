import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "../context/OrderContext";
import {
  ShoppingCart,
  BellRing,
  Flame,
  Coffee,
  PackageCheck,
  Package,
} from "lucide-react";

export default function KitchenDashboard() {
  const { orders = [], fetchOrders, isLoading } = useOrders();
  const navigate = useNavigate();

  useEffect(() => {
    // only fetch if we have a token and no orders at all
    const token = localStorage.getItem("token");
    if (token && orders.length === 0 && !isLoading) {
      fetchOrders();
    }
  }, []);

  const activeOrders = orders.filter((o) => o.status !== "Served");
  const preparing = orders.filter((o) => o.status === "Preparing").length;
  const cooking = orders.filter((o) => o.status === "Cooking").length;
  const ready = orders.filter((o) => o.status === "Ready").length;
  const served = orders.filter((o) => o.status === "Served").length;
  // Count takeaway orders
  const takeawayCount = orders.filter(o => (o.table === "99" || o.table === "98" || o.hasTakeaway) && o.status !== "Served").length;

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

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
        <StatCard label="Active" value={activeOrders.length} icon={ShoppingCart} color="bg-orange-100" />
        <StatCard label="Takeaway" value={takeawayCount} icon={Package} color="bg-rose-100" />
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
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-black text-white ${o.table === "99" || o.table === "98" ? 'bg-rose-500' : 'bg-slate-900'}`}>
                    {o.table === "99" ? "TA" : o.table === "98" ? "DL" : o.table}
                  </div>
                  <div>
                    <h4 className="font-black flex items-center gap-2">
                       {o.table === "99" ? "Takeaway" : o.table === "98" ? "Delivery" : `Table ${o.table}`}
                       {o.hasTakeaway && (o.table !== "99" && o.table !== "98") && (
                         <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black uppercase rounded-full flex items-center gap-1 border border-orange-200">
                           <Package size={8} /> + TA
                         </span>
                       )}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">#{(o._id || o.id).slice(-5)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    o.status === "Ready" ? "bg-indigo-100 text-indigo-600" :
                    o.status === "Cooking" ? "bg-orange-100 text-orange-600" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => navigate("/kitchen/kitchen-bill")}
            className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100"
          >
            Kitchen Bills
          </button>
          <button
            onClick={() => navigate("/kitchen/orders")}
            className="px-6 py-3 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
          >
            Full Orders View
          </button>
        </div>
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
