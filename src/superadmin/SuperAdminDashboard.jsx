import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAnalytics, getRestaurants, getSANotifications } from "../api/restaurantApi";
import { 
  Building2, CheckCircle2, Clock, XCircle, DollarSign, Zap, 
  Users, ShoppingBag, TrendingUp, Calendar, ArrowUpRight, 
  ArrowDownRight, MoreVertical, Globe, ShieldCheck, Activity,
  Smartphone, CreditCard, LayoutDashboard, Download, Filter,
  Bell, AlertTriangle, Info, Search, ExternalLink, Ban, 
  RefreshCw, MousePointer2, Briefcase, BarChart3, PieChart as PieIcon,Plus,
  MessageSquare, Bot
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line, Legend
} from 'recharts';
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" }
];

const ACTIVITY_ICONS = {
  payment: { icon: DollarSign, color: "text-emerald-500" },
  new_restaurant: { icon: Building2, color: "text-pink-500" },
  subscription_expiry: { icon: Clock, color: "text-amber-500" },
  suspension: { icon: Ban, color: "text-rose-500" },
  support_ticket: { icon: MessageSquare, color: "text-indigo-500" },
  system: { icon: ShieldCheck, color: "text-slate-400" },
};

function formatRelativeTime(dateInput, nowMs = Date.now()) {
  if (!dateInput) return "—";
  const then = new Date(dateInput).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.floor((nowMs - then) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateInput).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function mapNotificationToActivity(n) {
  return {
    id: n._id,
    type: n.type || "system",
    user: n.restaurantName || n.restaurantId || "System",
    action: n.title || n.message,
    createdAt: n.createdAt,
  };
}

function computePlatformInsights({ stats, restaurants, activityFeed, mrr }) {
  const total = stats?.total || 0;
  const active = stats?.active || 0;
  const trial = stats?.trial || 0;
  const suspended = stats?.suspended || 0;
  const expired = stats?.expired || 0;

  const avgPlanPrice = active > 0 ? Math.round(mrr / active) : 0;
  const trialUpside = Math.round(trial * avgPlanPrice * 0.35);

  const revenueMonths = stats?.revenueByMonth || [];
  const lastRev = revenueMonths[revenueMonths.length - 1]?.revenue || 0;
  const prevRev = revenueMonths[revenueMonths.length - 2]?.revenue || 0;
  const revenueGrowthPct =
    prevRev > 0 ? Math.round(((lastRev - prevRev) / prevRev) * 100) : lastRev > 0 ? 100 : 0;

  const growthMonths = stats?.growth || [];
  const lastTenants = growthMonths[growthMonths.length - 1]?.tenants || 0;
  const prevTenants = growthMonths[growthMonths.length - 2]?.tenants || 0;
  const tenantGrowthPct =
    prevTenants > 0
      ? Math.round(((lastTenants - prevTenants) / prevTenants) * 100)
      : lastTenants > 0
        ? 100
        : 0;

  const expiringSoon = restaurants.filter((r) => {
    if (!r.subscriptionExpiry) return false;
    const days = Math.ceil((new Date(r.subscriptionExpiry) - Date.now()) / 86400000);
    return days >= 0 && days <= 7 && ["active", "trial"].includes(r.subscriptionStatus);
  }).length;

  const healthPct = total > 0 ? Math.round((active / total) * 100) : 0;

  const payments24h = activityFeed.filter(
    (a) => a.type === "payment" && Date.now() - new Date(a.createdAt).getTime() < 86400000
  ).length;

  const newNodes30d = restaurants.filter(
    (r) => r.createdAt && Date.now() - new Date(r.createdAt).getTime() < 30 * 86400000
  ).length;

  const topFeature = (() => {
    const usage = stats?.featureUsage || {};
    const entries = Object.entries(usage).filter(([, v]) => v > 0);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const labels = {
      hr: "HR Portal",
      onlineOrders: "Online Orders",
      qrMenu: "QR Menu",
      kitchenPanel: "Kitchen Display",
      waiterPanel: "Waiter Systems",
      reservations: "Reservations",
    };
    return { name: labels[entries[0][0]] || entries[0][0], pct: total > 0 ? Math.round((entries[0][1] / total) * 100) : 0 };
  })();

  let summary = "";
  const tags = [];

  if (expiringSoon >= 2) {
    const atRisk = expiringSoon * avgPlanPrice;
    summary = `${expiringSoon} tenant${expiringSoon > 1 ? "s" : ""} expire within 7 days — up to ₹${atRisk.toLocaleString()} MRR at risk. Prioritize renewal outreach now.`;
    tags.push({ label: `${expiringSoon} Expiring`, tone: "amber" });
  } else if (revenueGrowthPct > 0 && lastRev > 0) {
    summary = `Subscription revenue grew ${revenueGrowthPct}% month-over-month. Platform MRR is ₹${mrr.toLocaleString()} across ${active} active node${active !== 1 ? "s" : ""}.`;
    tags.push({ label: `+${revenueGrowthPct}% Revenue`, tone: "pink" });
  } else if (trial >= 2 && trialUpside > 0) {
    summary = `${trial} trial${trial > 1 ? "s" : ""} on the grid — converting at typical rates could add ~₹${trialUpside.toLocaleString()} to monthly recurring revenue.`;
    tags.push({ label: `${trial} Trials`, tone: "indigo" });
  } else if (suspended > 0) {
    summary = `${suspended} node${suspended > 1 ? "s" : ""} suspended and ${expired} expired. Review account status to recover platform revenue and uptime.`;
    tags.push({ label: `${suspended} Suspended`, tone: "rose" });
  } else if (payments24h > 0) {
    summary = `${payments24h} subscription payment${payments24h > 1 ? "s" : ""} in the last 24 hours. Cashflow is active with ₹${mrr.toLocaleString()} current MRR.`;
    tags.push({ label: `${payments24h} Payments Today`, tone: "emerald" });
  } else if (newNodes30d > 0) {
    summary = `${newNodes30d} new tenant${newNodes30d > 1 ? "s" : ""} deployed in the last 30 days. Fleet health at ${healthPct}% active with ${total} total nodes.`;
    tags.push({ label: `+${newNodes30d} New Nodes`, tone: "emerald" });
  } else if (topFeature) {
    summary = `${topFeature.name} leads feature adoption at ${topFeature.pct}% penetration. ${active} active tenants generating ₹${mrr.toLocaleString()} MRR.`;
    tags.push({ label: `${topFeature.pct}% ${topFeature.name}`, tone: "indigo" });
  } else {
    summary = `Platform stable — ${active} active, ${trial} trial, ${total} total tenants. MRR ₹${mrr.toLocaleString()} with ${healthPct}% fleet health.`;
    tags.push({ label: `${healthPct}% Health`, tone: "emerald" });
  }

  if (tenantGrowthPct !== 0 && !tags.some((t) => t.label.includes("New"))) {
    tags.push({
      label: `${tenantGrowthPct >= 0 ? "+" : ""}${tenantGrowthPct}% Tenants`,
      tone: tenantGrowthPct >= 0 ? "emerald" : "rose",
    });
  }

  if (payments24h > 0 && !tags.some((t) => t.label.includes("Payment"))) {
    tags.push({ label: "Live Payments", tone: "emerald" });
  }

  return {
    summary,
    tags: tags.slice(0, 3),
    metrics: { revenueGrowthPct, tenantGrowthPct, healthPct, expiringSoon, payments24h },
  };
}

const TAG_STYLES = {
  pink: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

const StatCard = ({ label, value, icon: Icon, color, trend, subValue, glowColor }) => (
  <div 
    className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-6 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300"
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity ${glowColor || color}`} />
    
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-500 ring-1 ring-white/10`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm ${
          trend >= 0 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>

    <div className="relative z-10">
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] leading-none mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-white tracking-tighter drop-shadow-sm">{value ?? "—"}</h3>
        {subValue && <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{subValue}</span>}
      </div>
    </div>
    
    <div className="absolute bottom-0 left-0 h-1 w-0 bg-linear-to-r from-transparent via-pink-500 to-transparent group-hover:w-full transition-all duration-700 opacity-30" />
  </div>
);

const FeatureCard = ({ label, count, total, icon: Icon, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 hover:bg-slate-800/40 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all border border-white/5`}>
            <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
          </div>
          <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-[10px] font-black text-slate-500 tracking-widest bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
        <div 
          style={{ width: `${pct}%` }}
          className={`h-full ${color.replace('bg-', 'bg-')} bg-linear-to-r from-transparent to-white/20 rounded-full`}
        />
      </div>
    </div>
  );
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("overview");
  const [activityFeed, setActivityFeed] = useState([]);
  const [feedUpdatedAt, setFeedUpdatedAt] = useState(null);
  const [insightsUpdatedAt, setInsightsUpdatedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const dashboardRef = useRef(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [{ data: sData }, { data: rData }] = await Promise.all([
        getAnalytics({ skipCoalesce: true }),
        getRestaurants({ skipCoalesce: true }),
      ]);
      setStats(sData);
      setRestaurants(rData);
      setInsightsUpdatedAt(new Date());
      if (sData?.recentActivity?.length) {
        setActivityFeed((prev) => (prev.length ? prev : sData.recentActivity));
      }
    } catch {
      // keep last known snapshot on transient errors
    }
  }, []);

  const fetchActivityFeed = useCallback(async () => {
    try {
      const { data } = await getSANotifications({ skipCoalesce: true });
      const items = (data?.notifications || []).slice(0, 15).map(mapNotificationToActivity);
      setActivityFeed(items);
      setFeedUpdatedAt(new Date());
      setInsightsUpdatedAt(new Date());
    } catch {
      // keep last known feed on transient errors
    }
  }, []);

  useEffect(() => {
    Promise.all([getAnalytics(), getRestaurants()])
      .then(([{ data: sData }, { data: rData }]) => {
        setStats(sData);
        setRestaurants(rData);
        setInsightsUpdatedAt(new Date());
        if (sData?.recentActivity?.length) {
          setActivityFeed(sData.recentActivity);
          setFeedUpdatedAt(new Date());
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetchDashboardData();
    fetchActivityFeed();
    const pollId = setInterval(() => {
      fetchDashboardData();
      fetchActivityFeed();
    }, 30000);
    const tickId = setInterval(() => setNowTick(Date.now()), 60000);
    return () => {
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, [fetchDashboardData, fetchActivityFeed]);

  // -- Advanced Analytics Computations --
  const mrr = useMemo(() => {
    if (!restaurants.length) return 0;
    return restaurants
      .filter(r => r.subscriptionStatus === 'active' && r.subscriptionPlan)
      .reduce((acc, r) => acc + (r.subscriptionPlan.price || 0), 0);
  }, [restaurants]);

  const arr = mrr * 12;

  const aiInsights = useMemo(
    () => computePlatformInsights({ stats, restaurants, activityFeed, mrr }),
    [stats, restaurants, activityFeed, mrr]
  );

  const chartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Active', value: stats.active, color: '#10b981', glow: 'rgba(16,185,129,0.3)' },
      { name: 'Trial', value: stats.trial, color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
      { name: 'Others', value: (stats.expired || 0) + (stats.suspended || 0), color: '#ef4444', glow: 'rgba(239,68,68,0.3)' },
    ];
  }, [stats]);

  const revenueTrendData = useMemo(() => {
    if (!stats?.revenueByMonth) return [];
    return stats.revenueByMonth.map(item => ({
      name: item.month,
      revenue: item.revenue || 0,
      orders: item.orders || 0
    }));
  }, [stats]);

  const planDistribution = useMemo(() => {
    const dist = {};
    restaurants.forEach(r => {
      const planName = r.subscriptionPlan?.name || 'Trial';
      dist[planName] = (dist[planName] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [restaurants]);

  const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

  const alerts = useMemo(() => {
    const list = [];
    restaurants.forEach(r => {
      if (r.subscriptionExpiry) {
        const days = Math.ceil((new Date(r.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 7) list.push({ type: 'expiry', text: `${r.name} expires in ${days} days`, severity: 'warning' });
      }
      if (r.subscriptionStatus === 'suspended') list.push({ type: 'status', text: `${r.name} is suspended`, severity: 'error' });
    });
    return list.slice(0, 5);
  }, [restaurants]);

  const topPerforming = useMemo(() => {
    return [...restaurants]
      .sort((a, b) => (b.totalPaid || 0) - (a.totalPaid || 0))
      .slice(0, 5);
  }, [restaurants]);

  const exportDashboard = async (format = 'pdf') => {
    const element = dashboardRef.current;
    if (!element) return;
    
    toast.loading(`Preparing ${format.toUpperCase()} export...`);
    try {
      const canvas = await html2canvas(element, { backgroundColor: '#020617', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      if (format === 'image') {
        const link = document.createElement('a');
        link.download = `Saas-Dashboard-${new Date().toISOString().split('T')[0]}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Saas-Analytics-${new Date().toISOString().split('T')[0]}.pdf`);
      }
      toast.dismiss();
      toast.success("Export Complete");
    } catch (e) {
      toast.error("Export Failed");
    }
  };

  const recentTenants = restaurants.slice(0, 5);

  return (
    <div ref={dashboardRef} className="p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen bg-[#020617] text-slate-200">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div 
            className="flex items-center gap-4 mb-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-pink-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-pink-500/20 ring-1 ring-white/10">
              <LayoutDashboard className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter">
                Global Command <span className="text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-violet-500">Center</span>
              </h1>
              <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <Globe className="w-3 h-3 text-pink-500" /> Multi-Tenant SaaS Infrastructure
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  period === p.id ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => exportDashboard('image')}
              className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white hover:border-pink-500/50 transition-all group"
            >
              <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            {/* <button className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all shadow-xl active:scale-95">
              <Plus className="w-4 h-4" /> Deploy Node
            </button> */}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-40 bg-slate-900/50 animate-pulse rounded-[2.5rem] border border-slate-800" />
          ))}
        </div>
      ) : (
        <div 
          className="space-y-8"
        >
          {/* --- TOP HUD STATS --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
            <StatCard label="MRR" value={`₹${mrr.toLocaleString()}`} icon={DollarSign} color="bg-pink-600" trend={15} subValue="Monthly" glowColor="bg-pink-500" />
            <StatCard label="ARR" value={`₹${arr.toLocaleString()}`} icon={TrendingUp} color="bg-violet-600" trend={28} subValue="Annual" glowColor="bg-violet-500" />
            <StatCard label="Live Nodes" value={stats?.active} icon={ShieldCheck} color="bg-emerald-600" trend={12} subValue="Active" glowColor="bg-emerald-500" />
            <StatCard label="Total Reach" value={stats?.total} icon={Building2} color="bg-blue-600" trend={5} subValue="Tenants" glowColor="bg-blue-500" />
            <StatCard label="Gross Volume" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={Activity} color="bg-amber-600" trend={10} subValue="Revenue" glowColor="bg-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* --- REVENUE TREND (AREA CHART) --- */}
            <div className="lg:col-span-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-[3rem] p-10 relative group">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Revenue Dynamics</h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Cashflow analysis & forecasting</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Vol</span>
                   </div>
                </div>
              </div>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} dy={15} />
                    <YAxis stroke="#475569" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '20px', padding: '15px' }}
                      itemStyle={{ fontWeight: 'black', fontSize: '10px', textTransform: 'uppercase' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* --- AI INSIGHTS & ALERTS --- */}
            <div className="space-y-6">
              {/* AI Insights */}
              <div className="bg-linear-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-[2.5rem] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Zap className="w-5 h-5" fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Intelligence</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                         {insightsUpdatedAt
                           ? `Live · ${formatRelativeTime(insightsUpdatedAt, nowTick)}`
                           : "Analyzing Live Grid"}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                   <p className="text-xs text-slate-300 font-medium leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-white/5 italic">
                     &ldquo;{aiInsights.summary}&rdquo;
                   </p>
                   <div className="flex flex-wrap gap-2">
                      {aiInsights.tags.map((tag) => (
                        <span
                          key={tag.label}
                          className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg border ${TAG_STYLES[tag.tone] || TAG_STYLES.emerald}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                   </div>
                   <button
                     type="button"
                     onClick={() => navigate("/superadmin/analyze-robot")}
                     className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-300 hover:bg-indigo-500/20 transition-all"
                   >
                     <Bot className="w-4 h-4" /> Open Analytics Robot
                   </button>
                </div>
              </div>

              {/* Alerts Panel */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] p-8">
                 <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                   <Bell className="w-4 h-4 text-pink-500" /> Active Alerts
                 </h3>
                 <div className="space-y-3">
                    {alerts.map((alert, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border flex items-start gap-4 transition-all hover:scale-[1.02] ${
                        alert.severity === 'error' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'
                      }`}>
                        <div className={`mt-0.5 ${alert.severity === 'error' ? 'text-rose-500' : 'text-amber-500'}`}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 leading-tight">
                          {alert.text}
                        </p>
                      </div>
                    ))}
                    {alerts.length === 0 && (
                      <div className="text-center py-6 opacity-30">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest">System Stable</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- PLAN DISTRIBUTION (PIE) --- */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[3rem] p-10 flex flex-col items-center">
              <div className="w-full text-left mb-10">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-indigo-500" /> Tier Distribution
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Tenant market share</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      innerRadius={70}
                      outerRadius={100}
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
              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                 {planDistribution.map((d, i) => (
                   <div key={d.name} className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-2xl border border-white/5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{d.name}</span>
                      <span className="ml-auto text-[10px] font-black text-white">{d.value}</span>
                   </div>
                 ))}
              </div>
            </div>

            {/* --- TOP PERFORMING (TABLE) --- */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[3rem] p-10 lg:col-span-2">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" /> Alpha Tenants
                  </h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Top grossing infrastructure</p>
                </div>
                <button className="text-[10px] font-black text-pink-500 uppercase tracking-widest hover:underline">Full Audit</button>
              </div>
              
              <div className="space-y-4">
                 {topPerforming.map((ten, idx) => (
                   <div key={ten.restaurantId} className="group flex items-center justify-between p-5 bg-slate-950/30 border border-slate-800/50 rounded-[2rem] hover:bg-slate-800/40 transition-all">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 text-lg font-black text-white group-hover:scale-110 transition-transform">
                            {idx + 1}
                         </div>
                         <div>
                            <p className="font-black text-white tracking-tight">{ten.name}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{ten.restaurantId} • {ten.subscriptionPlan?.name || 'Standard'}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-lg font-black text-emerald-400">₹{(ten.totalPaid || 0).toLocaleString()}</p>
                         <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Lifetime Volume</p>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          {/* --- MODULE ECOSYSTEM --- */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-[3rem] p-10">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-xl font-black text-white">Module Ecosystem Penetration</h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">SaaS feature adoption metrics</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800 shadow-inner">
                   <Zap className="w-5 h-5 text-pink-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <FeatureCard label="HR Portal" count={stats?.featureUsage?.hr || 0} total={stats?.total || 1} icon={Users} color="bg-blue-500" />
                <FeatureCard label="Kitchen Display" count={stats?.featureUsage?.kitchenPanel || 0} total={stats?.total || 1} icon={MousePointer2} color="bg-pink-500" />
                <FeatureCard label="QR Menu Suite" count={stats?.featureUsage?.qrMenu || 0} total={stats?.total || 1} icon={Smartphone} color="bg-purple-500" />
                <FeatureCard label="Waiter Systems" count={stats?.featureUsage?.waiterPanel || 0} total={stats?.total || 1} icon={CreditCard} color="bg-amber-500" />
              </div>
          </div>

          {/* --- RECENT ACTIVITY & FLEET LIST --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Activity Feed */}
             <div className="bg-slate-900/40 border border-slate-800/80 rounded-[3rem] p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-pink-500" /> Real-time Feed
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Live</span>
                    {feedUpdatedAt && (
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter ml-1">
                        · {formatRelativeTime(feedUpdatedAt, nowTick)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-8 relative">
                   <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-800" />
                   {activityFeed.length === 0 ? (
                     <div className="text-center py-10 opacity-40">
                       <Activity className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No platform activity yet</p>
                     </div>
                   ) : (
                     activityFeed.map((act) => {
                       const meta = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.system;
                       const Icon = meta.icon;
                       return (
                         <div key={act.id} className="relative flex items-center gap-6 pl-10">
                           <div className={`absolute left-0 w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center ${meta.color}`}>
                             <Icon className="w-3.5 h-3.5" />
                           </div>
                           <div className="flex-1">
                             <div className="flex justify-between items-center">
                               <p className="text-[10px] font-black text-white uppercase tracking-widest">{act.user}</p>
                               <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                                 {formatRelativeTime(act.createdAt, nowTick)}
                               </span>
                             </div>
                             <p className="text-xs text-slate-400 font-medium mt-1">{act.action}</p>
                           </div>
                         </div>
                       );
                     })
                   )}
                </div>
             </div>

             {/* Deployment Registry (The Table) */}
             <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-[3rem] overflow-hidden flex flex-col">
                <div className="p-10 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">Infrastructure Fleet</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Tenant registry control</p>
                  </div>
                  <div className="flex gap-2">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input placeholder="Search Nodes..." className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:ring-1 focus:ring-pink-500/50 w-48 transition-all" />
                     </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50">
                        <th className="px-10 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Node</th>
                        <th className="px-10 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocol Status</th>
                        <th className="px-10 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Service Level</th>
                        <th className="px-10 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Life-Volume</th>
                        <th className="px-10 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Ops</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentTenants.map((ten) => (
                        <tr key={ten._id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-5">
                              <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-slate-800 to-slate-950 flex items-center justify-center text-lg font-black text-pink-500 border border-slate-800 shadow-xl">
                                {ten.name?.[0]}
                              </div>
                              <div>
                                <p className="text-sm font-black text-white tracking-tight">{ten.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{ten.restaurantId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-2">
                               <span className={`w-1.5 h-1.5 rounded-full ${ten.subscriptionStatus === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                               <span className={`text-[10px] font-black uppercase tracking-widest ${
                                 ten.subscriptionStatus === 'active' ? 'text-emerald-400' : 'text-rose-400'
                               }`}>
                                 {ten.subscriptionStatus}
                               </span>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-3">
                              <Zap size={12} className="text-indigo-400" />
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{ten.subscriptionPlan?.name || 'Trial'}</span>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <p className="text-sm font-black text-white">₹{(ten.totalPaid || 0).toLocaleString()}</p>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"><BarChart3 size={14}/></button>
                               <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"><ExternalLink size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-8 bg-slate-950/20 text-center">
                   <button className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-pink-500 transition-colors">Expand Full Fleet Protocol</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

