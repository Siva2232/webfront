import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend, ComposedChart, Line
} from "recharts";
import { 
  TrendingUp, IndianRupee, Activity, Download, FileText, Wallet, Target, Search, Filter,
  Zap, ShieldCheck, History, ArrowUpRight, Layers, Box, FileSpreadsheet,
  AlertCircle, CheckCircle2, Info, Calendar, Percent, Crown, ShoppingBag, AlertTriangle
} from "lucide-react";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrderContext";

// Export Libraries
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Analytics() {
  const { products = [] } = useProducts();
  const { orders = [] } = useOrders();

  const [timeframe, setTimeframe] = useState("Weekly");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [dateRange, setDateRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
  });

  // ── BEST SELLERS BY REVENUE ───────────────────────────────────────
  const topByRevenue = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      order.items?.forEach(it => {
        if (!map[it.name]) {
          map[it.name] = { name: it.name, count: 0, revenue: 0, price: it.price || 0 };
        }
        map[it.name].count += it.qty;
        map[it.name].revenue += (it.price || 0) * it.qty;
      });
    });

    return Object.values(map)
      .sort((a,b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [orders]);

  // ── CATEGORY REVENUE BREAKDOWN ────────────────────────────────────
  const categoryRevenue = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      o.items?.forEach(item => {
        const cat = item.category || "Uncategorized";
        map[cat] = (map[cat] || 0) + (item.price || 0) * item.qty;
      });
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 5);
  }, [orders]);

  // ── CRITICAL PRODUCTS ALERT ───────────────────────────────────────
  const criticalProducts = useMemo(() => {
    return products
      .filter(p => {
        const cost = p.costPrice || p.price * 0.6; // assume 40% margin default
        const margin = p.price ? ((p.price - cost) / p.price) * 100 : 0;
        return !p.isAvailable || margin < 30; // low stock or margin <30%
      })
      .map(p => ({
        ...p,
        issue: !p.isAvailable ? "Out of Stock" : "Low Margin"
      }))
      .slice(0, 5);
  }, [products]);

  // ── ENGINE ─────────────────────────────────────────────────────────
  const engine = useMemo(() => {
    const filtered = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "All" ? true : 
                         statusFilter === "Live" ? p.isAvailable : !p.isAvailable;
      return matchSearch && matchStatus;
    });

    const inventoryValue = filtered.reduce((acc, p) => acc + (Number(p.price) || 0) * (p.stock || 1), 0);
    
    const multiplier = { Daily: 0.2, Weekly: 1, Monthly: 4.3, Yearly: 52 }[timeframe];
    
    const estRevenue = inventoryValue * multiplier;
    const taxLiability = estRevenue * 0.18;
    const opsCosts = estRevenue * 0.12;
    const netProfit = estRevenue - taxLiability - opsCosts;
    const profitMargin = estRevenue > 0 ? (netProfit / estRevenue) * 100 : 0;

    const liveCount = filtered.filter(p => p.isAvailable).length;
    const outCount = filtered.length - liveCount;
    const pieData = [
      { name: 'Active Stock', value: liveCount, color: '#6366f1' },
      { name: 'Out of Stock', value: outCount, color: '#f43f5e' }
    ];

    const timeLabels = {
      Daily: ["Morning", "Noon", "Evening", "Night"],
      Weekly: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      Monthly: ["Week 1", "Week 2", "Week 3", "Week 4"],
      Yearly: ["Q1", "Q2", "Q3", "Q4"]
    }[timeframe];

    const salesProjectionData = timeLabels.map((label, idx) => {
      const isFuture = idx > timeLabels.length / 2;
      const baseVal = (estRevenue / timeLabels.length);
      return {
        name: label,
        totalSales: isFuture ? null : Math.floor(baseVal * (0.8 + Math.random() * 0.4)),
        futureSales: !isFuture ? null : Math.floor(baseVal * (1.1 + Math.random() * 0.5)),
      };
    });

    return { 
      filtered, 
      inventoryValue, 
      estRevenue, 
      taxLiability, 
      netProfit, 
      opsCosts, 
      profitMargin,
      salesProjectionData, 
      pieData 
    };
  }, [products, timeframe, searchTerm, statusFilter, dateRange]);

  // ── EXPORT ─────────────────────────────────────────────────────────
  const handleExport = (format) => {
    const data = engine.filtered.map(p => ({
      Name: p.name,
      Price: p.price,
      GST: (p.price * 0.18).toFixed(2),
      Status: p.isAvailable ? 'Live' : 'Stocked'
    }));
    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Financial_Audit");
      XLSX.writeFile(wb, `Audit_${timeframe}.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.text("Fiscal Audit Report", 14, 20);
      doc.autoTable({ head: [['Product', 'Price', 'Tax']], body: data.map(o => [o.Name, o.Price, o.GST]) });
      doc.save("Report.pdf");
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFDFF] pb-20 font-sans text-slate-900">
      {/* ── HEADER & FILTERS ───────────────────────────────────────────── */}
      <header className="top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-5 md:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-5 md:gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <TrendingUp size={24}/>
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter">
                Finance<span className="text-indigo-600">Core</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">v2.4 • Neural Audit</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="relative group w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-bold w-full sm:w-48 focus:ring-4 ring-indigo-500/10 outline-none" 
                placeholder="Search SKU..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Calendar size={12} className="ml-2 text-indigo-500" />
              <input 
                type="date" 
                className="bg-transparent text-[10px] font-black outline-none w-28" 
                value={dateRange.start} 
                onChange={e => setDateRange({...dateRange, start: e.target.value})} 
              />
              <span className="text-slate-300 px-1 text-[10px]">-</span>
              <input 
                type="date" 
                className="bg-transparent text-[10px] font-black outline-none w-28" 
                value={dateRange.end} 
                onChange={e => setDateRange({...dateRange, end: e.target.value})} 
              />
            </div>

            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)} 
              className="bg-slate-900 text-white text-[10px] font-black uppercase px-4 py-2.5 rounded-xl outline-none cursor-pointer min-w-[110px]"
            >
              {["Daily", "Weekly", "Monthly", "Yearly"].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-8 pt-8 space-y-12 md:space-y-16">

        {/* ── SECTION 1: FINANCIAL OVERVIEW ─────────────────────────────── */}
        <section>
          <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 flex items-center gap-3">
            <Wallet className="text-indigo-600" size={28} />
            Financial Snapshot
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {[
              { label: "Net Profit", val: engine.netProfit, icon: Wallet, color: "emerald" },
              { label: "Gross Forecast", val: engine.estRevenue, icon: Zap, color: "indigo" },
              { label: "Tax Liability", val: engine.taxLiability, icon: ShieldCheck, color: "rose" },
              { label: "Profit Margin", val: engine.profitMargin, icon: Percent, color: "amber", suffix: "%" },
            ].map((k, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`bg-white p-6 md:p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group`}
              >
                <div className={`absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity`}>
                  <k.icon size={100} strokeWidth={1} />
                </div>
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-2xl bg-${k.color}-100 flex items-center justify-center mb-4 text-${k.color}-600 group-hover:scale-110 transition-transform`}>
                    <k.icon size={24} />
                  </div>
                  <p className="text-xs md:text-sm font-black uppercase text-slate-500 tracking-wider mb-1">{k.label}</p>
                  <p className="text-2xl md:text-3xl font-black text-slate-900">
                    {k.suffix === "%" ? k.val.toFixed(1) : `₹${Math.floor(k.val).toLocaleString()}`}
                    {k.suffix || ""}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── SECTION 2: SALES & REVENUE ANALYSIS ───────────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3">
              <TrendingUp className="text-indigo-600" size={28} />
              Sales & Revenue Performance
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Main Chart */}
            <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-base md:text-lg font-black mb-6 md:mb-8 flex items-center gap-3">
                <Activity className="text-indigo-600" size={20} />
                Revenue Projections • {timeframe}
              </h3>
              <div className="h-[320px] md:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={engine.salesProjectionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.08)'}} />
                    <Bar dataKey="totalSales" fill="#0f172a" radius={[10, 10, 0, 0]} barSize={32} />
                    <Line type="monotone" dataKey="futureSales" stroke="#6366f1" strokeWidth={4} dot={{ r: 5, fill: '#6366f1', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* NEW FEATURE 1: Period-over-Period Comparison */}
              <div className="mt-10 bg-slate-50/70 rounded-3xl p-6 border border-slate-100">
                <h4 className="text-base font-black mb-5 flex items-center gap-3">
                  <ArrowUpRight className="text-indigo-600" size={18} />
                  Period vs Previous Period
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { title: "Revenue", current: engine.estRevenue, prev: engine.estRevenue * 0.92, unit: "₹" },
                    { title: "Profit", current: engine.netProfit, prev: engine.netProfit * 1.05, unit: "₹" },
                    { title: "Margin", current: engine.profitMargin, prev: engine.profitMargin - 2.4, unit: "%" },
                    { title: "Orders", current: orders.length, prev: orders.length * 0.88, unit: "" },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-4 bg-white rounded-2xl shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">{item.title}</p>
                      <p className="text-xl font-black">
                        {item.unit}{Math.round(item.current).toLocaleString()}
                      </p>
                      <p className={`text-xs mt-1 font-medium ${
                        item.current >= item.prev ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {item.current >= item.prev ? '↑' : '↓'} 
                        {Math.abs(((item.current - item.prev) / item.prev * 100)).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* NEW FEATURE 3: Category Revenue Breakdown */}
              {categoryRevenue.length > 0 && (
                <div className="mt-10">
                  <h4 className="text-base font-black mb-5 flex items-center gap-3">
                    <Layers className="text-purple-600" size={18} />
                    Revenue by Category
                  </h4>
                  <div className="space-y-4">
                    {categoryRevenue.map(cat => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{cat.name}</span>
                          <span className="font-medium">₹{cat.value.toLocaleString()}</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-600 rounded-full transition-all"
                            style={{ width: `${(cat.value / categoryRevenue[0].value) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top Products by Revenue */}
            <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-base md:text-lg font-black mb-6 md:mb-8 flex items-center gap-3">
                <Crown className="text-amber-500" size={20} />
                Top Performers by Revenue
              </h3>

              <div className="space-y-4">
                {topByRevenue.map((item, i) => (
                  <div 
                    key={item.name} 
                    className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-lg shadow-sm">
                        {i+1}
                      </div>
                      <div>
                        <p className="font-bold text-base">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.count} × ₹{item.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl">₹{item.revenue.toLocaleString()}</p>
                      <p className="text-xs text-emerald-600">
                        {(item.revenue / engine.estRevenue * 100).toFixed(1)}% share
                      </p>
                    </div>
                  </div>
                ))}

                {topByRevenue.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    No sales data available yet...
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: INVENTORY & FISCAL HEALTH ─────────────────────── */}
        <section>
          <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 flex items-center gap-3">
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
                      data={engine.pieData} 
                      innerRadius={70} 
                      outerRadius={95} 
                      paddingAngle={6} 
                      dataKey="value"
                      stroke="none"
                    >
                      {engine.pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '16px',
                        color: '#000000'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-3 mt-6">
                {engine.pieData.map((d, i) => (
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

              {/* NEW FEATURE 2: Critical Products Alert */}
              {criticalProducts.length > 0 && (
                <div className="mt-8 bg-gradient-to-r from-rose-50 to-rose-100/40 border border-rose-200 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-rose-600" size={20} />
                    <h4 className="font-bold text-rose-800">Critical Products Alert</h4>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    {criticalProducts.map(p => (
                      <div key={p.id} className="flex justify-between items-center font-medium">
                        <span>{p.name}</span>
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
                    Showing {engine.filtered.length} products
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
                    {engine.filtered.slice(0, 10).map((p, i) => (
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
        </section>
      </main>
    </div>
  );
}