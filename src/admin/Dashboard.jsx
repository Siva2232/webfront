import React, { useMemo, useState } from 'react';
import { Link } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrderContext";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Package,
  ShoppingBag,
  Activity,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  CheckCircle,
  IndianRupee,
  Zap,
  Crown,
  Award,
  ShieldCheck,
  History,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Dashboard() {
  const { products = [] } = useProducts();
  const { orders = [] } = useOrders();

  // --- ANALYTICS LOGIC ---
  const activeOrders = orders.filter((o) => o.status !== "Served").length;
  const unavailableProducts = products.filter((p) => !p.isAvailable);
  
  // Calculate Actual Total Revenue from Order History
  const totalRevenue = useMemo(() => {
    return orders.reduce((acc, order) => acc + (order.billDetails?.grandTotal || 0), 0);
  }, [orders]);

  // Calculate Best Selling Dishes
  const bestSellers = useMemo(() => {
    const itemMap = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        itemMap[item.name] = (itemMap[item.name] || 0) + item.qty;
      });
    });

    return Object.entries(itemMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // Top 5 items
  }, [orders]);

  // Pie chart data for inventory status
  const pieData = useMemo(() => {
    const liveCount = products.filter(p => p.isAvailable).length;
    const outCount = products.length - liveCount;
    return [
      { name: 'Active Stock', value: liveCount, color: '#6366f1' },
      { name: 'Out of Stock', value: outCount, color: '#f43f5e' }
    ];
  }, [products]);

  // Critical products alert
  const criticalProducts = useMemo(() => {
    return products
      .filter(p => {
        const cost = p.costPrice || p.price * 0.6;
        const margin = p.price ? ((p.price - cost) / p.price) * 100 : 0;
        return !p.isAvailable || margin < 30;
      })
      .map(p => ({
        ...p,
        issue: !p.isAvailable ? "Out of Stock" : "Low Margin"
      }))
      .slice(0, 5);
  }, [products]);

  // Export functionality
  const handleExport = (format) => {
    const data = products.map(p => ({
      Name: p.name,
      Price: p.price,
      GST: (p.price * 0.18).toFixed(2),
      Status: p.isAvailable ? 'Live' : 'Stocked'
    }));
    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory_Report");
      XLSX.writeFile(wb, `Inventory_Report.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.text("Inventory Report", 14, 20);
      doc.autoTable({ head: [['Product', 'Price', 'Tax']], body: data.map(o => [o.Name, o.Price, o.GST]) });
      doc.save("Inventory_Report.pdf");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* --- 1. PREMIUM HEADER --- */}
        <header className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-2xl">
                <Zap className="text-white" size={20} fill="currentColor" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600">Enterprise Monitor</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 leading-tight">
              Control <span className="text-slate-400">Center</span>
            </h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 bg-white p-2.5 pr-8 rounded-[2.2rem] border border-slate-100 shadow-sm"
          >
             <div className="bg-indigo-600 text-white p-3.5 rounded-[1.6rem] shadow-lg shadow-indigo-100">
                <IndianRupee size={22} strokeWidth={2.5} />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Revenue</p>
                <p className="text-2xl font-black text-slate-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
             </div>
          </motion.div>
        </header>

        {/* --- 2. STATS GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Live Inventory" 
            value={products.length} 
            icon={Package} 
            color="indigo" 
            trend="+12%" 
          />
          <StatCard 
            label="Order Volume" 
            value={orders.length} 
            icon={ShoppingBag} 
            color="emerald" 
            trend="+28%" 
          />
          <StatCard 
            label="Active Queue" 
            value={activeOrders} 
            icon={Activity} 
            color="amber" 
            trend="Live" 
          />
          <StatCard 
            label="Stock Alerts" 
            value={unavailableProducts.length} 
            icon={AlertTriangle} 
            color="rose" 
            trend="Critical" 
            isAlert={unavailableProducts.length > 0}
          />
        </div>

        {/* --- 3. ANALYTICS VIEW: BEST SELLERS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 rounded-2xl text-white">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Best Sellers</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance Volume</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {bestSellers.length > 0 ? (
                bestSellers.map((item, idx) => (
                  <div key={item.name} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                        {idx === 0 && <Crown size={14} className="text-amber-500" />}
                        {item.name}
                      </span>
                      <span className="text-xs font-black text-slate-400">{item.qty} Sales</span>
                    </div>
                    <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.qty / bestSellers[0].qty) * 100}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className={`h-full rounded-full ${idx === 0 ? 'bg-indigo-600' : 'bg-slate-900'}`}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                  Waiting for sales data...
                </div>
              )}
            </div>
          </motion.div>

          {/* Performance Highlight Card */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-indigo-600 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-indigo-100"
          >
            <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
               <Award size={240} />
            </div>
            
            <div className="relative z-10">
               <div className="h-14 w-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 mb-8">
                 <Sparkles size={28} />
               </div>
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-2">Most Popular Item</h3>
               {bestSellers[0] ? (
                 <>
                   <p className="text-5xl font-black tracking-tighter leading-none mb-4">{bestSellers[0].name}</p>
                   <div className="flex items-center gap-2 text-indigo-100 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/10">
                     <TrendingUp size={14} />
                     <span className="text-xs font-bold uppercase tracking-widest">{bestSellers[0].qty} units sold</span>
                   </div>
                 </>
               ) : (
                 <p className="text-xl font-bold">Collecting Data...</p>
               )}
            </div>

            <Link to="/admin/products" className="relative z-10 bg-white text-indigo-600 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-2xl transition-all">
               Update Catalog <ArrowUpRight size={16} />
            </Link>
          </motion.div>
        </div>

        {/* --- 4. INVENTORY & FISCAL HEALTH SECTION --- */}
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3">
            <ShieldCheck className="text-indigo-600" size={28} />
            Inventory & Fiscal Health
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Stock Distribution */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="lg:col-span-5 bg-slate-900 hover:bg-white p-8 rounded-3xl text-white hover:text-slate-900 shadow-2xl border border-transparent hover:border-slate-200 transition-all duration-300 flex flex-col items-center justify-center group"
            >
              <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-indigo-400 group-hover:text-indigo-600">
                Current Stock Status
              </h3>
              
              <div className="h-[260px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      innerRadius={70} 
                      outerRadius={95} 
                      paddingAngle={6} 
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-3 mt-6">
                {pieData.map((d, i) => (
                  <div 
                    key={i} 
                    className="flex justify-between items-center bg-white/5 group-hover:bg-slate-50 p-4 rounded-2xl border border-white/10 group-hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-sm font-bold">{d.name}</span>
                    </div>
                    <span className="text-base font-black group-hover:text-indigo-600">{d.value}</span>
                  </div>
                ))}
              </div>

              {/* Critical Products Alert */}
              {criticalProducts.length > 0 && (
                <div className="mt-8 bg-gradient-to-r from-rose-50 to-rose-100/40 border border-rose-200 rounded-3xl p-6 w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-rose-600" size={20} />
                    <h4 className="font-bold text-rose-800">Critical Products Alert</h4>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    {criticalProducts.map(p => (
                      <div key={p._id || p.id} className="flex justify-between items-center font-medium">
                        <span className="text-slate-800">{p.name}</span>
                        <span className={`${
                          p.issue === "Out of Stock" ? 'text-rose-700' : 'text-amber-700'
                        }`}>
                          {p.issue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Financial Ledger */}
            <div className="lg:col-span-7 bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8">
                <div>
                  <h3 className="text-base md:text-lg font-black flex items-center gap-3">
                    <History className="text-rose-500" size={20} />
                    Financial Ledger
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">
                    Showing {products.length} products
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleExport('xlsx')} 
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs md:text-sm font-black uppercase hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    <FileSpreadsheet size={16}/> Excel
                  </button>
                  <button 
                    onClick={() => handleExport('pdf')} 
                    className="flex items-center gap-2 px-5 py-3 bg-rose-50 text-rose-600 rounded-2xl text-xs md:text-sm font-black uppercase hover:bg-rose-600 hover:text-white transition-all"
                  >
                    <FileText size={16}/> PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-xs font-black text-slate-500 uppercase tracking-wider">Product</th>
                      <th className="pb-4 text-xs font-black text-slate-500 uppercase tracking-wider">Price</th>
                      <th className="pb-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tax 18%</th>
                      <th className="pb-4 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.slice(0, 10).map((p, i) => (
                      <tr key={i} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-4 font-medium text-sm">{p.name}</td>
                        <td className="py-4 font-black text-indigo-600">₹{p.price?.toLocaleString() || "—"}</td>
                        <td className="py-4 text-sm text-slate-600">₹{(p.price * 0.18).toFixed(0)}</td>
                        <td className="py-4">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider ${
                            p.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {p.isAvailable ? 'Active' : 'Out of Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* --- 5. INVENTORY STATUS SECTION --- */}
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[3rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
          
          <div className="relative bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-xl shadow-slate-200/50">
            {unavailableProducts.length > 0 ? (
              <StockAlertSection items={unavailableProducts} />
            ) : (
              <EmptyStateSection count={products.length} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- INTERNAL COMPONENTS (REMAINING UNCHANGED) ---------- */

const StatCard = ({ label, value, icon: Icon, color, trend, isAlert }) => {
  const themes = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", accent: "bg-indigo-600", glow: "group-hover:shadow-indigo-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", accent: "bg-emerald-600", glow: "group-hover:shadow-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-500", accent: "bg-amber-500", glow: "group-hover:shadow-amber-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-500", accent: "bg-rose-500", glow: "group-hover:shadow-rose-100" },
  };
  const theme = themes[color];

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className={`group relative bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-2xl ${theme.glow}`}
    >
      <div className={`absolute top-6 right-6 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}>
        <Icon size={100} strokeWidth={1} />
      </div>
      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <div className={`p-4 rounded-2xl ${theme.bg} ${theme.text} transition-transform duration-500 group-hover:scale-110 shadow-sm`}>
            <Icon size={28} strokeWidth={2} />
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
            isAlert ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-50 text-slate-500 font-bold border border-slate-100'
          }`}>
            {trend}
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h3>
            <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{label}</p>
        </div>
      </div>
      <div className={`absolute bottom-6 left-8 right-8 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 ${theme.accent}`} />
    </motion.div>
  );
};

const StockAlertSection = ({ items }) => (
  <div className="flex flex-col lg:flex-row">
    <div className="lg:w-1/3 p-12 bg-rose-500 text-white flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10">
         <AlertTriangle size={180} strokeWidth={1} />
      </div>
      <div className="space-y-6 relative z-10">
        <div className="h-16 w-16 rounded-[1.5rem] bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-4xl font-black tracking-tighter leading-[0.9]">Critical <br/> Inventory</h3>
        <p className="text-rose-100 font-medium text-lg">{items.length} items require immediate restock.</p>
      </div>
      <Link to="/admin/products" className="mt-10 flex items-center gap-3 font-black uppercase text-[10px] tracking-[0.2em] bg-white text-rose-600 w-fit px-8 py-5 rounded-2xl shadow-lg">
        Open Catalog <ArrowUpRight size={16} />
      </Link>
    </div>
    <div className="flex-1 p-8 lg:p-12 space-y-4 max-h-[600px] overflow-y-auto bg-slate-50/30">
      {items.map((item, idx) => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} key={item.id} className="flex items-center justify-between p-5 bg-white rounded-[2rem] border border-slate-100 group/item transition-all">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-[1.2rem] overflow-hidden grayscale group-hover/item:grayscale-0 transition-all shadow-inner">
              <img src={item.image || "https://via.placeholder.com/150"} alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="font-black text-slate-800 text-lg tracking-tight group-hover/item:text-rose-600">{item.name}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: Restricted</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <div className="h-2 w-2 rounded-full bg-rose-500 mb-2 animate-pulse" />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Out of Stock</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const EmptyStateSection = ({ count }) => (
  <div className="p-20 text-center space-y-8 bg-gradient-to-b from-white to-emerald-50/20">
    <div className="relative inline-block">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute inset-0 bg-emerald-500 blur-[60px] opacity-10" />
      <div className="relative w-24 h-24 rounded-[2rem] bg-emerald-50 flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100 shadow-xl shadow-emerald-100">
        <CheckCircle size={48} strokeWidth={1.5} />
      </div>
    </div>
    <div className="max-w-md mx-auto space-y-2">
      <h3 className="text-3xl font-black text-slate-900 tracking-tight">Operation Clean</h3>
      <p className="text-slate-500 font-medium text-lg leading-relaxed">All inventory is synchronized. No stock-outs detected across {count} items.</p>
    </div>
    <Link to="/admin/products" className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-indigo-600 transition-all">
      Manage Inventory <ArrowUpRight size={16} />
    </Link>
  </div>
);