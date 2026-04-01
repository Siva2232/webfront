import { useEffect, useState } from "react";
import { RefreshCw, Calendar, TrendingUp, TrendingDown, LayoutDashboard, PieChart as PieIcon, Activity } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip,
} from "recharts";
import { getSummary, getMonthlyReport, getCashFlow, getProfitLoss } from "../../api/accountingApi";
import toast from "react-hot-toast";

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
// Premium Luxinity Palette
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#14b8a6"];

const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split("T")[0];
};

export default function Reports() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [cashflow, setCashflow] = useState(null);
  const [pl, setPl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pl");

  const load = async () => {
    setLoading(true);
    try {
      const [s, m, cf, p] = await Promise.all([
        getSummary({ from, to }),
        getMonthlyReport({ year }),
        getCashFlow({ from, to }),
        getProfitLoss({ from, to }),
      ]);
      setSummary(s.data);
      setMonthly(m.data);
      setCashflow(cf.data);
      setPl(p.data);
    } catch { toast.error("Failed to sync financial reports"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to, year]);

  const tabs = [
    { key: "pl", label: "Profit & Loss", icon: <LayoutDashboard size={14} /> },
    { key: "monthly", label: "Monthly Analysis", icon: <Activity size={14} /> },
    { key: "cashflow", label: "Cash Flow", icon: <PieIcon size={14} /> },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md uppercase tracking-widest">Analytics Engine</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Financial Intelligence</h1>
          <p className="text-sm text-slate-400 font-medium">Strategic overview of your business health</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-2xl shadow-sm">
            <div className="flex flex-col px-3 border-r border-slate-100">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Start Date</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-xs font-bold text-slate-800 focus:outline-none bg-transparent" />
            </div>
            <div className="flex flex-col px-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">End Date</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-xs font-bold text-slate-800 focus:outline-none bg-transparent" />
            </div>
          </div>
          <button onClick={load} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* High-Impact Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm group hover:border-indigo-100 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={20} /></div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total Revenue</span>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{fmt(summary.totalIncome)}</p>
            <div className="mt-2 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-400 w-2/3" />
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm group hover:border-rose-100 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><TrendingDown size={20} /></div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total Outflow</span>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{fmt(summary.totalExpense)}</p>
            <div className="mt-2 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
               <div className="h-full bg-rose-400 w-1/2" />
            </div>
          </div>

          <div className={`rounded-[32px] p-7 border transition-all shadow-sm ${summary.netProfit >= 0 ? "bg-slate-900 border-slate-900 shadow-indigo-200" : "bg-orange-50 border-orange-100"}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${summary.netProfit >= 0 ? "bg-white/10 text-white" : "bg-orange-100 text-orange-600"}`}><Activity size={20} /></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${summary.netProfit >= 0 ? "text-slate-400" : "text-orange-400"}`}>Net Profitability</span>
            </div>
            <p className={`text-3xl font-black tracking-tighter ${summary.netProfit >= 0 ? "text-white" : "text-orange-700"}`}>{fmt(summary.netProfit)}</p>
            <p className={`text-[10px] font-bold mt-2 ${summary.netProfit >= 0 ? "text-indigo-300" : "text-orange-400"}`}>CURRENT MARGIN ANALYSIS</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-[20px] w-fit border border-slate-100">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all uppercase tracking-widest ${tab === t.key ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-600"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Ledger Data...</p>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          {tab === "pl" && pl && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Income Breakdown */}
              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                  <div className="w-2 h-6 bg-emerald-400 rounded-full" /> Revenue Streams
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pl.income} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5}>
                        {pl.income.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={4} />)}
                      </Pie>
                      <PieTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {pl.income.map((row, i) => (
                      <div key={i} className="flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-xs font-bold text-slate-500">{row.name}</span>
                        </div>
                        <span className="text-sm font-black text-slate-800">{fmt(row.amount)}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-slate-50 flex justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Total</span>
                      <span className="text-sm font-black text-emerald-600">{fmt(pl.totalIncome)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                  <div className="w-2 h-6 bg-rose-400 rounded-full" /> Capital Outlay
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pl.expense} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5}>
                        {pl.expense.map((_, i) => <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} cornerRadius={4} />)}
                      </Pie>
                      <PieTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {pl.expense.map((row, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ background: COLORS[(i+2) % COLORS.length] }} />
                          <span className="text-xs font-bold text-slate-500">{row.name}</span>
                        </div>
                        <span className="text-sm font-black text-slate-800">{fmt(row.amount)}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-slate-50 flex justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Total</span>
                      <span className="text-sm font-black text-rose-600">{fmt(pl.totalExpense)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "monthly" && (
            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-2xl font-black text-slate-900">Performance Over Time</h2>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-black text-slate-600 focus:ring-2 focus:ring-indigo-100">
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y} Fiscal Year</option>)}
                </select>
              </div>
              
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthly} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="income" name="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar dataKey="profit" name="Net" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tab === "cashflow" && cashflow && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-emerald-600 rounded-[40px] p-10 text-white shadow-xl shadow-emerald-100">
                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-2">Liquidity In</p>
                <h3 className="text-4xl font-black tracking-tighter mb-6">{fmt(cashflow.cashIn)}</h3>
                <div className="w-full h-24 bg-white/10 rounded-3xl flex items-center justify-center">
                  <TrendingUp size={40} className="opacity-40" />
                </div>
              </div>
              <div className="bg-rose-600 rounded-[40px] p-10 text-white shadow-xl shadow-rose-100">
                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-2">Liquidity Out</p>
                <h3 className="text-4xl font-black tracking-tighter mb-6">{fmt(cashflow.cashOut)}</h3>
                <div className="w-full h-24 bg-white/10 rounded-3xl flex items-center justify-center">
                  <TrendingDown size={40} className="opacity-40" />
                </div>
              </div>
              <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-xl shadow-slate-200">
                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-2">Closing Position</p>
                <h3 className="text-4xl font-black tracking-tighter mb-6">{fmt(cashflow.netCash)}</h3>
                <div className="w-full h-24 bg-indigo-500 rounded-3xl flex items-center justify-center">
                  <Activity size={40} className="opacity-40" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}