import React, { useState, useEffect } from 'react';
import { useOrders } from "../context/OrderContext";
import {
  ShoppingBag, Activity, CheckCircle, Sparkles, Coffee,
  Clock, Flame, BellRing, ChevronRight, MessageSquare, Timer,
  Users, DollarSign, UtensilsCrossed, PackageCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const gradientMap = {
  Preparing: "from-amber-400 to-orange-500",
  Cooking: "from-orange-500 to-rose-500",
  Ready: "from-indigo-500 to-purple-600",
  Served: "from-emerald-500 to-teal-600",
};

const statusStep = { Preparing: 1, Cooking: 2, Ready: 3, Served: 4 };

export default function OrdersDashboard() {
  const { orders, updateOrderStatus, fetchOrders } = useOrders();
  const navigate = useNavigate();
  const prevCountRef = React.useRef(orders.length);

  // if we're on orders dashboard and a new order arrives, show its bill automatically
  React.useEffect(() => {
    if (orders.length > prevCountRef.current) {
      // did not exist before
      navigate("/admin/bill");
    }
    prevCountRef.current = orders.length;
  }, [orders, navigate]);

  // Orders are already hydrated by OrderProvider (which caches + fetches),
  // and socket events keep the list fresh. No periodic polling needed here.
  useEffect(() => {
    if (orders.length === 0) {
      fetchOrders();
    }
  }, []);

  // DASHBOARD CALCULATIONS
  const activeOrders = orders.filter((o) => o.status !== "Served").sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const servedOrders = orders.filter((o) => o.status === "Served").sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Updated to include GST in Revenue stats if available
  const totalRevenue = orders.reduce((acc, order) => {
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = order.billDetails?.cgst ? (order.billDetails.cgst + order.billDetails.sgst) : (subtotal * 0.05);
    return acc + subtotal + tax;
  }, 0);

  const totalItemsSold = orders.reduce((acc, order) => {
    return acc + order.items.reduce((sum, item) => sum + item.qty, 0);
  }, 0);

  // 6 STATS DATA
  const stats = [
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Live Tables", value: new Set(activeOrders.map(o => o.table)).size, icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Ready", value: orders.filter(o => o.status === "Ready").length, icon: BellRing, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Total Served", value: servedOrders.length, icon: PackageCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Items Sold", value: totalItemsSold, icon: UtensilsCrossed, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Kitchen Load", value: activeOrders.length > 5 ? "High" : "Normal", icon: Activity, color: "text-slate-600", bg: "bg-slate-50" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* HEADER & ANALYTICS */}
        <header className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Control <span className="text-orange-500">Center</span></h1>
              <p className="text-slate-400 font-bold mt-2 uppercase tracking-[0.3em] text-[10px]">Real-time Operations & History</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm flex flex-col items-center text-center gap-3 transition-all hover:shadow-md">
                <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}><stat.icon size={20} /></div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-xl font-black text-slate-800 italic">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        {/* 1. LIVE ORDERS SECTION */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em]">Ongoing Preparations ({activeOrders.length})</h2>
          </div>

          {activeOrders.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
               <Coffee size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Kitchen is currently clear</p>
            </div>
          ) : (
            <div className="grid gap-8">
              {activeOrders.map((order) => (
                <PremiumOrderCard key={order._id} order={order} updateOrderStatus={updateOrderStatus} />
              ))}
            </div>
          )}
        </section>

        {/* 2. HISTORY SECTION */}
        {servedOrders.length > 0 && (
          <section className="space-y-8 pt-10 border-t border-slate-100">
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-12 bg-slate-200" />
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Recently Served</h2>
              <div className="h-[1px] w-12 bg-slate-200" />
            </div>
            
            <div className="grid gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[0.5] hover:grayscale-0">
              {servedOrders.slice(0, 5).map((order) => (
                <PremiumOrderCard key={order._id || order.id} order={order} updateOrderStatus={updateOrderStatus} isCompleted />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function PremiumOrderCard({ order, updateOrderStatus, isCompleted }) {
  const [timeAgo, setTimeAgo] = useState("");
  
  // Billing Logic
  const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const cgst = order.billDetails?.cgst || (subtotal * 0.025);
  const sgst = order.billDetails?.sgst || (subtotal * 0.025);
  const grandTotal = order.billDetails?.grandTotal || (subtotal + cgst + sgst);

  const status = order.status;
  const currentStep = statusStep[status] || 1;
  const gradient = gradientMap[status] || "from-slate-400 to-slate-600";

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
      setTimeAgo(diff < 1 ? "Just now" : `${diff}m ago`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  return (
    <div className={`relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-sm transition-all ${isCompleted ? 'scale-[0.98]' : ''}`}>
      {!isCompleted && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-50">
          <div 
            className={`h-full bg-gradient-to-r ${gradient} transition-all duration-1000`}
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      )}

      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-5">
            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-2xl italic shadow-lg`}>
              {order.table}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Table {order.table}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Timer size={12}/> {timeAgo} • #{(order._id || order.id || "").slice(-5)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black italic">{item.qty}</span>
                  <span className="font-bold text-slate-700">{item.name}</span>
                </div>
                <span className="text-slate-400 font-bold italic text-sm">₹{(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* ADDED KITCHEN NOTES DISPLAY */}
          {order.notes && (
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex gap-3 items-start">
              <MessageSquare size={16} className="text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-wider mb-1">Kitchen Request</p>
                <p className="text-sm font-bold text-slate-700 leading-tight italic">"{order.notes}"</p>
              </div>
            </div>
          )}
        </div>

        {/* BILL BREAKDOWN FOR DASHBOARD */}
        <div className="w-full md:w-48 flex flex-col justify-center border-l border-slate-50 md:pl-8 space-y-2">
           <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
             <span>Items</span>
             <span>₹{subtotal.toLocaleString()}</span>
           </div>
           <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
             <span>GST</span>
             <span>₹{(cgst + sgst).toLocaleString()}</span>
           </div>
           <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
             <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Total Bill</span>
             <span className="text-lg font-black text-slate-900 italic">₹{grandTotal.toLocaleString()}</span>
           </div>
        </div>

        {!isCompleted && (
          <div className="w-full md:w-56 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center italic">Move Status</p>
            <div className="flex flex-col gap-2">
              {["Preparing", "Cooking", "Ready", "Served"].map((s) => (
                <button
                  key={s}
                  onClick={() => updateOrderStatus(order._id || order.id, s)}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${s === status ? 'bg-white text-slate-900 shadow-sm opacity-50' : 'bg-white text-slate-500 hover:bg-slate-900 hover:text-white border border-slate-100'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="flex flex-col justify-center items-center px-8 text-emerald-500">
             <CheckCircle size={32} />
             <span className="text-[10px] font-black uppercase mt-2">Served</span>
          </div>
        )}
      </div>
    </div>
  );
}