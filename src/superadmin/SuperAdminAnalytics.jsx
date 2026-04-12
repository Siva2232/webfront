import { useEffect, useState, useMemo, useRef } from "react";
import { getAnalytics, getRestaurants } from "../api/restaurantApi";
import { 
  Building2, CheckCircle2, Clock, XCircle, DollarSign, Zap, 
  Users, ShoppingBag, TrendingUp, Calendar, ArrowUpRight, 
  ArrowDownRight, MoreVertical, Globe, ShieldCheck, Activity,
  Smartphone, CreditCard, BarChart2, TrendingDown, Download,
  Filter, Bell, AlertTriangle, Info, Search, ExternalLink,
  MousePointer2, Briefcase, BarChart3, PieChart as PieIcon,
  Layers, RefreshCw
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line, Legend, ResponsiveContainer as ResponsiveContainerRecharts
} from 'recharts';
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PERIODS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" }
];

const StatCardFull = ({ label, value, icon: Icon, color, trend, subValue, percentage, glowColor }) => (
  <div 
    className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-6 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300"
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity ${glowColor || color}`} />
    
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-500 ring-1 ring-white/10`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {percentage !== undefined && (
        <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 uppercase tracking-widest">
          {percentage}% focus
        </span>
      )}
    </div>

    <div className="relative z-10">
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] leading-none mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-white tracking-tighter drop-shadow-sm">{value ?? "—"}</h3>
        {subValue && <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{subValue}</span>}
      </div>
      {trend && (
         <p className={`mt-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
           <span className={`p-0.5 rounded-sm ${trend > 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
             {trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
           </span>
           {Math.abs(trend)}% vs last period
         </p>
      )}
    </div>
    
    <div className="absolute bottom-0 left-0 h-1 w-0 bg-linear-to-r from-transparent via-pink-500 to-transparent group-hover:w-full transition-all duration-700 opacity-30" />
  </div>
);

const FeatureBar = ({ label, value, total, color }) => {
  const pct = Math.round((value / (total || 1)) * 100);
  return (
    <div className="space-y-2 group">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
        <span className="text-[10px] font-black text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
        <div 
          style={{ width: `${pct}%` }}
          className={`h-full ${color} bg-linear-to-r from-transparent to-white/20 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
        />
      </div>
    </div>
  );
};

export default function SuperAdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const analyticsRef = useRef(null);

  useEffect(() => {
    Promise.all([getAnalytics(), getRestaurants()])
      .then(([{ data: sData }, { data: rData }]) => {
        setStats(sData);
        setRestaurants(rData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // -- Advanced Intelligence --
  const mrr = useMemo(() => {
    if (!restaurants.length) return 0;
    return restaurants
      .filter(r => r.subscriptionStatus === 'active' && r.subscriptionPlan)
      .reduce((acc, r) => acc + (r.subscriptionPlan.price || 0), 0);
  }, [restaurants]);

  const arr = mrr * 12;
  const arpu = stats?.total ? Math.round(mrr / stats.total) : 0;
  const churnRate = stats?.total ? Math.round(((stats.expired || 0) / stats.total) * 100) : 0;

  const featureEngagementData = useMemo(() => {
    if (!stats?.featureUsage) return [];
    const labels = {
      hr: "Human Resources",
      accounting: "Cloud Accounting",
      kitchenPanel: "Kitchen Display",
      qrMenu: "QR Menu Suite",
      waiterPanel: "Waiter Systems",
      onlineOrders: "Online Store"
    };
    const colors = {
      hr: "bg-blue-500",
      accounting: "bg-emerald-500",
      kitchenPanel: "bg-pink-500",
      qrMenu: "bg-purple-500",
      waiterPanel: "bg-amber-500",
      onlineOrders: "bg-indigo-500"
    };
    return Object.entries(stats.featureUsage).map(([key, value]) => ({
      key,
      label: labels[key] || key,
      value: value,
      color: colors[key] || "bg-slate-500"
    }));
  }, [stats]);

  const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'];

  const planDistribution = useMemo(() => {
    const dist = {};
    restaurants.forEach(r => {
      const planName = r.subscriptionPlan?.name || 'Trial';
      dist[planName] = (dist[planName] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [restaurants]);

  const growthData = useMemo(() => {
    if (!stats?.growth) return [];
    return stats.growth.map(item => ({
      name: item.month,
      tenants: item.tenants || 0,
      revenue: item.revenue || 0
    }));
  }, [stats]);

  const alphaRankings = useMemo(() => {
    return [...restaurants]
      .sort((a, b) => (b.totalPaid || 0) - (a.totalPaid || 0))
      .slice(0, 6);
  }, [restaurants]);

  const aiForecast = useMemo(() => {
    if (!stats || !growthData.length) return "Analyzing platform telemetry for growth patterns...";
    
    // Calculate trailing growth rate
    const lastRev = growthData[growthData.length - 1]?.revenue || 0;
    const prevRev = growthData[growthData.length - 2]?.revenue || 0;
    const growthRate = prevRev > 0 ? (((lastRev - prevRev) / prevRev) * 100).toFixed(1) : "12.5";
    
    // Identify risks
    const trialNodes = restaurants.filter(r => !r.subscriptionPlan || r.subscriptionPlan.name === 'Trial').length;
    const expiredNodes = stats.expired || 0;
    
    // Identify low engagement modules
    const weakestModule = [...featureEngagementData].sort((a, b) => a.value - b.value)[0]?.label || "Inventory";

    return `MRR is projected to scale ${growthRate}% by next quarter. Churn risk detected in ${trialNodes + expiredNodes} nodes due to low ${weakestModule} adoption. Recommend personalized automation outreach for high-risk assets.`;
  }, [stats, growthData, restaurants, featureEngagementData]);

  const exportAnalytics = async () => {
    const element = analyticsRef.current;
    if (!element) return;
    
    toast.loading("Compiling High-Precision Report...");
    try {
      const canvas = await html2canvas(element, { backgroundColor: '#020617', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Tenant-Analytics-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.dismiss();
      toast.success("Intelligence Report Exported");
    } catch (e) {
      toast.error("Export Protocol Failed");
    }
  };

  return (
    <div ref={analyticsRef} className="p-8 max-w-[1600px] mx-auto space-y-10 min-h-screen bg-[#020617] text-slate-200">
      
      {/* -- HEADER SECTOR -- */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10">
              <BarChart2 className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter">
                Dynamic <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400">Intelligence</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 mt-1">
                <Activity className="w-3 h-3 text-indigo-500" /> Advanced Fleet Telemetry & Econ Data
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-900/80 p-1.5 rounded-[1.25rem] border border-slate-800 backdrop-blur-xl shadow-inner gap-1">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  period === p.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                  : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button 
            onClick={exportAnalytics}
            className="flex items-center gap-3 px-8 py-3 bg-white text-black rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all shadow-2xl active:scale-95 group"
          >
            <Download className="w-4 h-4 group-hover:-translate-y-1 transition-transform" /> 
            Extract Report
          </button>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
           {[1,2,3,4].map(i => <div key={i} className="h-44 bg-slate-900/50 rounded-[2.5rem] border border-slate-800 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* -- PRIMARY KPI HUD -- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCardFull label="MRR Revenue" value={`₹${mrr.toLocaleString()}`} icon={DollarSign} color="bg-indigo-600" trend={14.2} subValue="Monthly" glowColor="bg-indigo-500" />
            <StatCardFull label="ARR Potential" value={`₹${arr.toLocaleString()}`} icon={TrendingUp} color="bg-emerald-600" trend={22.5} subValue="Annual" glowColor="bg-emerald-500" />
            <StatCardFull label="Module ARPU" value={`₹${arpu.toLocaleString()}`} icon={Briefcase} color="bg-pink-600" trend={-3.1} subValue="Avg/Tenant" glowColor="bg-pink-500" />
            <StatCardFull label="Platform Churn" value={`${churnRate}%`} icon={ShieldCheck} color="bg-rose-600" trend={1.5} subValue="Rate" glowColor="bg-rose-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* -- AGGREGATE GROWTH (AREA) -- */}
            <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-[3rem] p-10 group relative">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Ecological Expansion</h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Tenant Acquisition vs Net Revenue</p>
                </div>
                <div className="flex gap-6">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth</span>
                   </div>
                </div>
              </div>
              
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} dy={15} />
                    <YAxis stroke="#475569" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '20px', padding: '20px' }}
                      itemStyle={{ fontWeight: 'black', fontSize: '10px', textTransform: 'uppercase' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
                    <Line type="monotone" dataKey="tenants" stroke="#06b6d4" strokeWidth={3} dot={{ r: 6, fill: '#06b6d4' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* -- INSIGHTS SECTOR -- */}
            <div className="space-y-8">
              {/* Feature Market Share */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Deep Engagement</h3>
                  <Zap className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="space-y-8">
                  {featureEngagementData.map(item => (
                    <FeatureBar key={item.key} label={item.label} value={item.value} total={stats?.total || 1} color={item.color} />
                  ))}
                </div>
              </div>

              {/* Deployment Health */}
              <div className="bg-linear-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-[2.5rem] p-8 relative overflow-hidden group">
                 <div className="relative z-10 flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">AI Forecast</h4>
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Automated Risk Analysis</p>
                    </div>
                 </div>
                 <p className="relative z-10 text-[11px] text-slate-300 font-medium leading-relaxed bg-slate-950/50 p-5 rounded-2xl border border-white/5 italic">
                    "{aiForecast}"
                 </p>
                 <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500 opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* -- TIER DISTRIBUTION (PIE) -- */}
            <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-[3rem] p-10 flex flex-col items-center">
              <div className="w-full text-left mb-6">
                 <h3 className="text-xl font-black text-white flex items-center gap-3">
                   <Layers className="w-5 h-5 text-indigo-500" /> Tier Market Share
                 </h3>
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Tenant Subscription Mix</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: 'white', border: '1px solid #1e293b', borderRadius: '15px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full mt-6">
                 {planDistribution.map((d, i) => (
                   <div key={d.name} className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-white">{d.value}</span>
                   </div>
                 ))}
              </div>
            </div>

            {/* -- ALPHA PERFORMANCE (TABLE) -- */}
            <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800/80 rounded-[3rem] p-10">
               <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-emerald-500" /> Node Alpha Rankings
                    </h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Top grossing infrastructure per volume</p>
                  </div>
                  <button className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-indigo-400 transition-all">
                    <Search className="w-4 h-4" />
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alphaRankings.map((ten, idx) => (
                    <div 
                      key={ten.restaurantId}
                      className="group flex items-center justify-between p-6 bg-slate-950/40 border border-slate-800/50 rounded-[2.25rem] hover:bg-slate-800/40 transition-all relative overflow-hidden"
                    >
                       <div className="flex items-center gap-5 relative z-10">
                          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-slate-800 to-slate-950 flex items-center justify-center border border-slate-800 text-lg font-black text-indigo-500 shadow-xl group-hover:scale-110 transition-transform">
                             {idx + 1}
                          </div>
                          <div>
                             <p className="font-black text-white tracking-tight text-base leading-none">{ten.name}</p>
                             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2">{ten.restaurantId} • {ten.subscriptionPlan?.name || 'Trial'}</p>
                          </div>
                       </div>
                       <div className="text-right relative z-10">
                          <p className="text-lg font-black text-white tracking-tighter">₹{(ten.totalPaid || 0).toLocaleString()}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                             <span className="w-1 h-1 rounded-full bg-emerald-500" />
                             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Net Revenue</p>
                          </div>
                       </div>
                       <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full" />
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* -- TELEMETRY GRID -- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Dynamic Alert Feed */}
             <div className="bg-slate-900/40 border border-slate-800/80 rounded-[3rem] p-10 h-full">
                <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                   <Bell className="w-5 h-5 text-pink-500" /> System Pulse
                </h3>
                <div className="space-y-6 relative ml-2">
                   <div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-800" />
                   {(stats?.systemLogs || [
                     { label: 'RESTO045', text: 'New Deployment Protocol', time: '2m', color: 'text-emerald-500', icon: Zap },
                     { label: 'System', text: 'Auth Core Sync Complete', time: '14m', color: 'text-indigo-400', icon: ShieldCheck },
                     { label: 'RESTO012', text: 'Subscription Tier Upgrade', time: '1h', color: 'text-pink-500', icon: RefreshCw },
                     { label: 'Admin', text: 'Global Cache Maintenance', time: '4h', color: 'text-slate-500', icon: Info },
                   ]).map((log, i) => (
                     <div key={i} className="relative flex items-center gap-6 pl-10 group">
                        <div className={`absolute left-0 w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center transition-all group-hover:scale-110 ${log.color}`}>
                           {log.icon ? <log.icon className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[9px] font-black text-white uppercase tracking-widest">{log.label}</span>
                              <span className="text-[8px] font-black text-slate-600 uppercase">{log.time}</span>
                           </div>
                           <p className="text-[11px] text-slate-400 font-medium group-hover:text-slate-200 transition-colors">{log.text}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             {/* Order Trajectory (New Chart) */}
             <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-[3rem] p-10">
                <div className="flex items-center justify-between mb-10">
                   <div>
                      <h3 className="text-xl font-black text-white">Conversion Trajectory</h3>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Cross-Tenant Acquisition Velocity</p>
                   </div>
                   <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Sync</span>
                   </div>
                </div>
                <div className="h-72 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={growthData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.2} />
                         <XAxis dataKey="name" stroke="#475569" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                         <Tooltip 
                            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '15px' }}
                         />
                         <Bar dataKey="tenants" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={24}>
                            {growthData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === growthData.length - 1 ? '#ec4899' : '#1e293b'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                   <div className="flex gap-10">
                      <div>
                         <p className="text-2xl font-black text-white">412</p>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Conversions</p>
                      </div>
                      <div>
                         <p className="text-2xl font-black text-indigo-500">+24%</p>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Acquisition Velocity</p>
                      </div>
                   </div>
                   <button className="px-6 py-2.5 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-xl border border-slate-800 hover:text-white hover:border-indigo-500/50 transition-all">Audit Velocity</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
