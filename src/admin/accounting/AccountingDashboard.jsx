import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, BookOpen,
  ArrowUpRight, ArrowDownRight, Plus, RefreshCw, ChevronRight,
  Wallet, Calendar, PieChart
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { getDashboardStats, getMonthlyReport } from "../../api/accountingApi";
import toast from "react-hot-toast";

const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const StatCard = ({ label, value, sub, icon: Icon, color, trend }) => (
  <div className="relative overflow-hidden bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 group hover:border-indigo-100 transition-all duration-300">
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.03] ${color} group-hover:scale-110 transition-transform duration-500`} />
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-current/20`}>
        <Icon size={22} className="text-white" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend === "up" ? "+12%" : "-5%"}
        </div>
      )}
    </div>
    <div className="space-y-1">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="text-3xl font-black text-slate-800 tracking-tight">{value}</div>
      {sub && <p className="text-[11px] text-slate-500 font-medium">{sub}</p>}
    </div>
  </div>
);

export default function AccountingDashboard() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  const load = async () => {
    setLoading(true);
    try {
      const [s, m] = await Promise.all([
        getDashboardStats(),
        getMonthlyReport({ year }),
      ]);
      setStats(s.data);
      setMonthly(m.data);
    } catch {
      toast.error("Failed to load accounting data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
    window.addEventListener('transactionsUpdated', load);
    return () => window.removeEventListener('transactionsUpdated', load);
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
      <div className="w-12 h-12 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-slate-400 font-medium text-sm animate-pulse">Syncing Ledgers...</p>
    </div>
  );

  const recentTx = stats?.recentTransactions || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase tracking-tighter">Finance Hub</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">{year} Fiscal Year</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Accounting Overview</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all active:scale-95 shadow-sm">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <Link to="/admin/accounting/expenses/new" className="group flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
            <Plus size={18} /> Add New Entry
          </Link>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Income" value={fmt(stats?.totalIncome)} sub={`Current Month: ${fmt(stats?.monthIncome)}`} icon={TrendingUp} color="bg-emerald-500" trend="up" />
        <StatCard label="Total Expense" value={fmt(stats?.totalExpense)} sub={`Current Month: ${fmt(stats?.monthExpense)}`} icon={TrendingDown} color="bg-rose-500" trend="down" />
        <StatCard label="Net Profit" value={fmt(stats?.netProfit)} sub={`Month P&L: ${fmt(stats?.monthProfit)}`} icon={DollarSign} color="bg-indigo-600" trend={stats?.netProfit >= 0 ? "up" : "down"} />
        <StatCard label="Total Ledgers" value={stats?.totalLedgers || 0} sub="Managed business accounts" icon={BookOpen} color="bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Analytics Chart */}
        <div className="xl:col-span-2 bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Revenue Analytics</h2>
              <p className="text-xs text-slate-400 font-medium">Comparison of monthly cash flow</p>
            </div>
            <select className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 px-4 py-2 outline-none cursor-pointer hover:bg-slate-100">
              <option>Last 12 Months</option>
              <option>Last Quarter</option>
            </select>
          </div>
          
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v >= 1000 ? v/1000 + 'k' : v}`} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="income" name="Income" fill="url(#incomeGradient)" radius={[6, 6, 0, 0]} barSize={12} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={12} />
                <Bar dataKey="profit" name="Profit" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Wallet size={20} />
              </div>
              <h2 className="font-bold text-lg">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "New Expense", to: "/admin/accounting/expenses/new", icon: TrendingDown },
                { label: "New Income", to: "/admin/accounting/income/new", icon: TrendingUp },
                { label: "Financial Reports", to: "/admin/accounting/reports", icon: PieChart },
              ].map((link) => (
                <Link key={link.label} to={link.to} className="flex items-center justify-between p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all font-semibold text-sm group">
                  <div className="flex items-center gap-3">
                    <link.icon size={16} />
                    {link.label}
                  </div>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
              Recent Activity
              <Link to="/admin/accounting/transactions" className="text-[10px] uppercase tracking-widest text-indigo-600 hover:underline">See All</Link>
            </h3>
            <div className="space-y-4">
              {recentTx.slice(0, 4).map((tx) => {
                const isIncome = tx.transactionType === "income" || tx.transactionType === "pos_sale";
                return (
                  <div key={tx._id} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isIncome ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white" : "bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white"}`}>
                        {isIncome ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 leading-tight line-clamp-1">{tx.note || tx.transactionType}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(tx.date).toLocaleDateString("en-IN", { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-black ${isIncome ? "text-emerald-600" : "text-rose-500"}`}>
                      {isIncome ? "+" : "-"}{fmt(tx.totalAmount).replace("₹", "")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}