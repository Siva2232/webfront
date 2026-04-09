import { useEffect, useState, useMemo } from "react";
import { getAnalytics } from "../api/restaurantApi";
import { 
  Building2, CheckCircle2, Clock, XCircle, DollarSign, Zap, 
  Users, ShoppingBag, TrendingUp, Calendar, ArrowUpRight, 
  ArrowDownRight, MoreVertical, Globe, ShieldCheck, Activity,
  Smartphone, CreditCard, BarChart2, TrendingDown
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { motion } from "framer-motion";

const StatCardFull = ({ label, value, icon: Icon, color, trend, subValue, percentage }) => (
  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-6 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300">
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity ${color}`} />
    
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {percentage !== undefined && (
        <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300`}>
          {percentage}% focus
        </span>
      )}
    </div>

    <div>
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-none mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-white tracking-tight">{value ?? "—"}</h3>
        {subValue && <span className="text-slate-500 text-sm font-medium">{subValue}</span>}
      </div>
      {trend && (
         <p className={`mt-2 text-xs font-bold flex items-center gap-1 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
           {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
           {Math.abs(trend)}% from last month
         </p>
      )}
    </div>
  </div>
);

export default function SuperAdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30"); // "30" or "all"

  const handleDownloadReport = () => {
    // Basic browser print as a quick placeholder for reporting
    window.print();
    // Alternatively, a toast could be shown here if a toast library was available
    // console.log("Report download triggered");
  };

  useEffect(() => {
    getAnalytics()
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const featureData = useMemo(() => {
    if (!stats?.featureUsage) return [];
    const labels = {
      hr: "HR",
      accounting: "Accounts",
      kitchenPanel: "Kitchen",
      qrMenu: "QR Menu",
      waiterPanel: "Waiter",
      onlineOrders: "Online"
    };
    return Object.entries(stats.featureUsage).map(([key, value]) => ({
      name: labels[key] || key,
      value: value,
      fullMark: stats.total || 1
    }));
  }, [stats]);

  const revenueData = [
    { name: 'Week 1', revenue: 45000 },
    { name: 'Week 2', revenue: 52000 },
    { name: 'Week 3', revenue: 48000 },
    { name: 'Week 4', revenue: 61000 },
    { name: 'Week 5', revenue: 55000 },
    { name: 'Week 6', revenue: 67000 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen bg-[#020617]">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <BarChart2 className="text-indigo-500 w-8 h-8" />
            Deep Analytics
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Cross-tenant performance and module engagement metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTimeRange(timeRange === "30" ? "all" : "30")}
            className="bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Calendar className="w-4 h-4 text-slate-400" />
            {timeRange === "30" ? "Last 30 Days" : "All Time"}
          </button>
          <button 
            onClick={handleDownloadReport}
            className="bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-2xl text-sm font-black shadow-lg shadow-pink-500/20 transition-all"
          >
            Download Report
          </button>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-900 rounded-3xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCardFull label="Module Engagement" value={Math.round((featureData.reduce((acc, v) => acc + v.value, 0) / (featureData.length * (stats?.total || 1) || 1)) * 100)} icon={Zap} color="bg-indigo-600" subValue="%" />
            <StatCardFull label="Conversion Rate" value="8.4" icon={TrendingUp} color="bg-emerald-600" trend={1.2} subValue="%" />
            <StatCardFull label="Churn Risk" value={stats?.expired || 0} icon={ShieldCheck} color="bg-rose-600" subValue="Tenants" />
            <StatCardFull label="Avg Revenue/Tenant" value={`₹${Math.round((stats?.totalRevenue || 0) / (stats?.total || 1)).toLocaleString()}`} icon={DollarSign} color="bg-purple-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Revenue Trend */}
             <div className="bg-slate-900/50 border border-slate-800/50 rounded-[2.5rem] p-8">
               <h3 className="text-xl font-black text-white mb-6">Aggregate Revenue Growth</h3>
               <div className="h-80 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={revenueData}>
                     <defs>
                       <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                     <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                     <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                     />
                     <Area type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>

             {/* Module Comparison */}
             <div className="bg-slate-900/50 border border-slate-800/50 rounded-[2.5rem] p-8">
                <h3 className="text-xl font-black text-white mb-6">Module Market Share</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={featureData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={32}>
                        {featureData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'][index % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
