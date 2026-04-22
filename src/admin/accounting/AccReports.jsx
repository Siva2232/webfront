import React, { useEffect, useState } from "react";
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Calendar, 
  Download,
  DollarSign,
  Briefcase,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import accApi from "../../api/accApi";
import toast from "react-hot-toast";
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AccReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await accApi.getReports({
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      console.log('Report raw response:', res);
      // Determine if the data is in res.data or res.data.data
      const reportData = res.data?.status === 'success' ? res.data.data : res.data;
      setReport(reportData);
    } catch (err) {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  const incomeData = report && report.incomeByLedger ? Object.entries(report.incomeByLedger).map(([name, value]) => ({ name, value })) : [];
  const expenseData = report && report.expenseByLedger ? Object.entries(report.expenseByLedger).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Advanced Analytics</h1>
          <p className="text-slate-500 font-medium text-sm">Detailed financial performance insights</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <input 
              type="date" 
              className="px-3 py-1.5 border-none focus:ring-0 text-xs font-bold text-slate-600 outline-none"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
            />
            <div className="flex items-center text-slate-300">|</div>
            <input 
              type="date" 
              className="px-4 py-2 border-none focus:ring-0 text-sm font-bold text-slate-600 outline-none"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
            />
          </div>
          <button onClick={fetchReport} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-sm"><RefreshCw size={18}/></button>
          <button className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition text-sm"><Download size={18}/> Export Data</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* SECTION 1: KEY PERFORMANCE INDICATORS */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard 
            title="Total Revenue" 
            value={`₹${(report?.summary?.totalIncome || 0).toLocaleString()}`} 
            icon={<TrendingUp className="text-emerald-500" />} 
            trend="+12.5%" 
            isPositive={true}
          />
          <KPICard 
            title="Total Expenses" 
            value={`₹${(report?.summary?.totalExpenses || 0).toLocaleString()}`} 
            icon={<TrendingDown className="text-rose-500" />} 
            trend="+2.1%" 
            isPositive={false}
          />
          <KPICard 
            title="Net Profit" 
            value={`₹${(report?.summary?.netProfit || 0).toLocaleString()}`} 
            icon={<Activity className="text-indigo-500" />} 
            trend="+8.4%" 
            isPositive={true}
          />
          <KPICard 
            title="Cash & Bank" 
            value={`₹${((report?.summary?.cashInHand || 0) + (report?.summary?.bankBalance || 0)).toLocaleString()}`} 
            icon={<DollarSign className="text-amber-500" />} 
            trend="Stable" 
            isPositive={true}
          />
        </div>

        {/* SECTION 2: PROPHIT & REVENUE TREND */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Activity className="text-indigo-600" size={20} /> Revenue vs Expense Trend
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report?.chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{fontWeight: 'bold'}}
                />
                <Area type="monotone" dataKey="income" name="Revenue" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={4} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 3: REVENUE BREAKDOWN (PIE) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <PieChartIcon className="text-emerald-600" size={20} /> Income Sources
          </h3>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {incomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-slate-400 font-bold text-[10px] uppercase">Total Income</span>
              <span className="text-xl font-black text-slate-900">₹{report?.summary?.totalIncome?.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
             {incomeData.map((item, i) => (
               <div key={i} className="flex justify-between items-center px-3 py-1.5 bg-slate-50 rounded-lg">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                    <span className="text-xs font-bold text-slate-700">{item.name}</span>
                 </div>
                 <span className="text-xs font-black text-slate-900">₹{item.value.toLocaleString()}</span>
               </div>
             ))}
          </div>
        </div>

        {/* SECTION 4: RECENT FINANCIAL TRANSACTIONS */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="text-amber-500" size={20} /> Recent Activities
              </h3>
              <button className="text-xs font-bold text-indigo-600 hover:underline">View All Ledger</button>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-100">
                    <th className="pb-3 font-black">Date</th>
                    <th className="pb-3 font-black">Description</th>
                    <th className="pb-3 font-black">Ref Type</th>
                    <th className="pb-3 font-black text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {report?.recentTransactions?.map((tx, idx) => {
                    const totalAmt = tx.entries.reduce((sum, e) => sum + e.amount, 0) / 2; // Simple math for double entry visualization
                    return (
                      <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-bold text-slate-600 text-xs">{format(new Date(tx.date), 'dd MMM')}</td>
                        <td className="py-3">
                          <p className="font-bold text-slate-900 text-xs mb-0.5">{tx.description}</p>
                          <p className="text-[9px] font-medium text-slate-400">{tx.entries[0]?.ledger?.name} → {tx.entries[1]?.ledger?.name}</p>
                        </td>
                        <td className="py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            tx.referenceType === 'Bill' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {tx.referenceType}
                          </span>
                        </td>
                        <td className="py-3 font-black text-slate-900 text-right text-xs">₹{totalAmt.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
           </div>
        </div>

        {/* SECTION 5: EXPENSE DISTRIBUTION (BAR) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
           <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <TrendingDown className="text-rose-600" size={20} /> Expense Map
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
             <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Efficiency Note</p>
             <p className="text-[10px] text-rose-800 font-medium leading-tight">
               Operating expenses account for <span className="font-black">
                 {report?.summary?.totalIncome ? ((report.summary.totalExpenses / report.summary.totalIncome) * 100).toFixed(1) : 0}%
               </span> of total revenue this period.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function KPICard({ title, value, icon, trend, isPositive }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-3">
        <div className="p-2.5 bg-slate-50 rounded-xl">
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded ${
          isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        }`}>
          {isPositive ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
          {trend}
        </div>
      </div>
      <div>
        <h4 className="text-slate-500 font-bold text-xs mb-0.5">{title}</h4>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
