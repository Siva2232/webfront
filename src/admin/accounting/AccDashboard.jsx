import React, { useEffect, useState, useMemo } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Activity,
  ArrowRight,
  ChevronRight,
  Download,
  Calendar,
  LayoutDashboard,
  CreditCard,
  Building,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import accApi from "../../api/accApi";
import toast from "react-hot-toast";
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import ModernKPICard from "./dashboard/components/ModernKPICard";
import StickyPageHeader from "../components/StickyPageHeader";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AccDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      // Use getReports for a much more detailed dataset than standard dashboard
      const res = await accApi.getReports({
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      const reportData = res.data?.status === 'success' ? res.data.data : res.data;
      setData(reportData);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const expensePieData = useMemo(() => {
    if (!data?.expenseByLedger) return [];
    return Object.entries(data.expenseByLedger)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="relative">
           <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
           <Activity className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={24} />
        </div>
        <p className="text-slate-400 font-bold animate-pulse">Syncing Financial Cloud...</p>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />

      <StickyPageHeader
        icon={LayoutDashboard}
        eyebrow="Accounting"
        title="Dashboard"
        subtitle={`Reporting period: ${format(new Date(dateRange.start), "MMM dd")} - ${format(
          new Date(dateRange.end),
          "MMM dd, yyyy",
        )}`}
        rightAddon={
          <>
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Syncing" : "Refresh"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <Download size={14} />
              Full report
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">

      {/* TOP KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ModernKPICard 
          label="Net Profit" 
          val={summary.netProfit} 
          icon={Activity} 
          color="indigo" 
          trend="+14.2%" 
          isProfit={summary.netProfit >= 0} 
        />
        <ModernKPICard 
          label="Total Revenue" 
          val={summary.totalIncome} 
          icon={TrendingUp} 
          color="emerald" 
          trend="+8.1%" 
        />
        <ModernKPICard 
          label="Liquid Cash" 
          val={summary.cashInHand} 
          icon={Wallet} 
          color="amber" 
          trend="-2.4%" 
        />
        <ModernKPICard 
          label="Bank Assets" 
          val={summary.bankBalance} 
          icon={Building} 
          color="blue" 
          trend="Stable" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* MAIN CHART SECTION */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                 <TrendingUp size={100} />
              </div>
              
              <div className="flex justify-between items-end mb-8 relative z-10">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      Growth Analytics 
                    </h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Revenue vs Operating Costs</p>
                 </div>
                 <div className="flex gap-3">
                    <div className="flex items-center gap-1.5">
                       <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                       <span className="text-[10px] font-black text-slate-600">REVENUE</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                       <span className="text-[10px] font-black text-slate-600">EXPENSES</span>
                    </div>
                 </div>
              </div>

              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.chartData}>
                    <defs>
                      <linearGradient id="chartIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                      dy={8} 
                      tickFormatter={(val) => format(new Date(val), 'dd MMM')}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                      tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '12px'}}
                      itemStyle={{fontWeight: '900', fontSize: '13px'}}
                    />
                    <Area type="monotone" dataKey="income" name="Revenue" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#chartIncome)" />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={4} fill="transparent" strokeDasharray="8 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* RECENT ACTIVITIES TABLE */}
           <div className="bg-white rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/40 p-6">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900">Recent Transactions</h3>
                  <button className="group flex items-center gap-1.5 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:gap-3 transition-all">
                    Full Ledger <ChevronRight size={14}/>
                  </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                      <th className="pb-4">Reference No</th>
                      <th className="pb-4">Description</th>
                      <th className="pb-4">Ledgers</th>
                      <th className="pb-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data?.recentTransactions?.slice(0, 6).map((tx, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/80 transition-all">
                        <td className="py-4 font-bold text-slate-400 text-[11px]">#TX-{tx._id?.slice(-6).toUpperCase()}</td>
                        <td className="py-4">
                           <div className="font-black text-slate-800 text-xs">{tx.description}</div>
                           <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{format(new Date(tx.date), 'MMM dd, hh:mm a')}</div>
                        </td>
                        <td className="py-4">
                           <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-600">{tx.entries[0]?.ledger?.name}</span>
                              <ArrowRight size={8} className="text-slate-300"/>
                              <span className="text-[11px] font-bold text-indigo-500">{tx.entries[1]?.ledger?.name}</span>
                           </div>
                        </td>
                        <td className="py-4 text-right">
                           <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-black shadow-md shadow-slate-900/10">
                              ₹{(tx.entries[0]?.amount || 0).toLocaleString()}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </div>

        {/* SIDEBAR DETAILS */}
        <div className="lg:col-span-4 space-y-6">
           {/* EXPENSE DISTRIBUTION */}
           <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/40">
              <h3 className="text-lg font-black text-slate-900 mb-6 border-b border-slate-50 pb-3 flex items-center gap-2">
                <TrendingDown className="text-rose-500" size={18}/> Expense Map
              </h3>
              <div className="h-[240px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {expensePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 8px 12px -2px rgb(0 0 0 / 0.1)'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest">Total Out</span>
                  <span className="text-xl font-black text-slate-900">₹{(summary.totalExpenses || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                 {expensePieData.map((item, i) => (
                   <div key={i} className="flex justify-between items-center group cursor-default">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                         <span className="text-xs font-black text-slate-600 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-400">₹{item.value.toLocaleString()}</span>
                   </div>
                 ))}
                 {expensePieData.length === 0 && (
                   <div className="text-center py-8">
                      <p className="text-slate-300 font-bold italic text-sm">No expenses in this period</p>
                   </div>
                 )}
              </div>
           </div>

           {/* BALANCE CARDS (MINI) */}
           <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-600/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                 <CreditCard size={80} />
              </div>
              <div className="relative z-10">
                 <p className="text-indigo-200 font-black uppercase tracking-[0.2em] text-[9px] mb-6">Asset Allocation</p>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                       <div className="flex items-center gap-2">
                          <Wallet className="text-indigo-300" size={18}/>
                          <span className="font-bold text-indigo-100 text-sm">Cash Flow</span>
                       </div>
                       <span className="font-black text-lg">₹{(summary.cashInHand || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                       <div className="flex items-center gap-2">
                          <Building className="text-indigo-300" size={18}/>
                          <span className="font-bold text-indigo-100 text-sm">Bank Nodes</span>
                       </div>
                       <span className="font-black text-lg">₹{(summary.bankBalance || 0).toLocaleString()}</span>
                    </div>
                 </div>
                 
                 <div className="mt-8 pt-6 border-t border-indigo-500/30 flex justify-between items-end">
                    <div>
                       <p className="text-[9px] font-black uppercase text-indigo-300 tracking-widest mb-0.5">Cumulative Value</p>
                       <h4 className="text-2xl font-black">₹{((summary.cashInHand || 0) + (summary.bankBalance || 0)).toLocaleString()}</h4>
                    </div>
                    <div className="flex gap-1 mb-1">
                       {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-5 bg-indigo-500/40 rounded-full" style={{height: `${8 + (Math.random()*15)}px`}}></div>)}
                    </div>
                 </div>
              </div>
           </div>

           {/* PROFIT RATIO */}
           <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700"></div>
              <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] mb-1.5">Net Margin</p>
              <div className="flex items-baseline gap-2">
                 <h2 className={`text-3xl font-black ${summary.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} tracking-tighter`}>
                   {summary.totalIncome ? ((summary.netProfit / summary.totalIncome) * 100).toFixed(1) : "0"}%
                 </h2>
                 <span className="text-[10px] font-black text-slate-500 uppercase">Profitability Ratio</span>
              </div>
              <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-1000 ${summary.netProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                   style={{width: `${Math.min(Math.abs(summary.totalIncome ? (summary.netProfit / summary.totalIncome) * 100 : 0), 100)}%`}}
                 ></div>
              </div>
           </div>
        </div>

      </div>
      </div>
    </div>
  );
}
