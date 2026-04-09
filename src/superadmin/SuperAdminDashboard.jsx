import { useEffect, useState, useMemo } from "react";
import { getAnalytics, getRestaurants } from "../api/restaurantApi";
import { 
  Building2, CheckCircle2, Clock, XCircle, DollarSign, Zap, 
  Users, ShoppingBag, TrendingUp, Calendar, ArrowUpRight, 
  ArrowDownRight, MoreVertical, Globe, ShieldCheck, Activity,
  Smartphone, CreditCard, LayoutDashboard
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { motion } from "framer-motion";
const StatCard = ({ label, value, icon: Icon, color, trend, subValue }) => (
  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-6 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300">
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity ${color}`} />
    
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
          trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>

    <div>
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-none mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-white tracking-tight">{value ?? "—"}</h3>
        {subValue && <span className="text-slate-500 text-sm font-medium">{subValue}</span>}
      </div>
    </div>
  </div>
);

const FeatureCard = ({ label, count, total, icon: Icon, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
            <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
          </div>
          <span className="text-sm font-bold text-slate-200">{label}</span>
        </div>
        <span className="text-xs font-black text-slate-500 tracking-tighter">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className={`h-full ${color.replace('bg-', 'bg-gradient-to-r from-')} to-blue-500 rounded-full`}
        />
      </div>
    </div>
  );
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAnalytics(), getRestaurants()])
      .then(([{ data: sData }, { data: rData }]) => {
        setStats(sData);
        setRestaurants(rData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Active', value: stats.active, color: '#10b981' },
      { name: 'Trial', value: stats.trial, color: '#f59e0b' },
      { name: 'Others', value: (stats.expired || 0) + (stats.suspended || 0), color: '#ef4444' },
    ];
  }, [stats]);

  const recentTenants = restaurants.slice(0, 8);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen bg-[#020617]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-pink-500 w-8 h-8" />
            General Overview
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Real-time status of your tenant restaurants and subscriptions</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 bg-slate-900 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard label="Total Reach" value={stats?.total} icon={Building2} color="bg-blue-600" trend={12} subValue="Tenants" />
            <StatCard label="Operational" value={stats?.active} icon={CheckCircle2} color="bg-emerald-600" trend={8} subValue="Active" />
            <StatCard label="In Trial" value={stats?.trial} icon={Clock} color="bg-amber-600" trend={-4} subValue="Reviewing" />
            <StatCard label="Gross Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color="bg-purple-600" trend={22} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Chart */}
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/50 rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-white">Tenant Distribution</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Acquisition by status</p>
                </div>
                <div className="flex items-center gap-4">
                  {chartData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl">
                              <p className="text-xs font-black text-slate-500 uppercase mb-1">{payload[0].payload.name}</p>
                              <p className="text-lg font-black text-white">{payload[0].value} Restaurants</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={60}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Feature Adoption */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-[2.5rem] p-8">
              <h2 className="text-xl font-black text-white mb-2">Feature Adoption</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Ecosystem penetration</p>
              
              <div className="space-y-4">
                <FeatureCard label="HR Management" count={stats?.featureUsage?.hr || 0} total={stats?.total || 1} icon={Users} color="bg-blue-500" />
                <FeatureCard label="Accounting" count={stats?.featureUsage?.accounting || 0} total={stats?.total || 1} icon={DollarSign} color="bg-emerald-500" />
                <FeatureCard label="Kitchen Ops" count={stats?.featureUsage?.kitchenPanel || 0} total={stats?.total || 1} icon={Zap} color="bg-pink-500" />
                <FeatureCard label="QR Menu" count={stats?.featureUsage?.qrMenu || 0} total={stats?.total || 1} icon={Smartphone} color="bg-purple-500" />
                <FeatureCard label="Waitlist" count={stats?.featureUsage?.waiterPanel || 0} total={stats?.total || 1} icon={Smartphone} color="bg-amber-500" />
              </div>
            </div>
          </div>

          {/* Recent Tenant Table */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-slate-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Latest Deployments</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Recent tenant registrations</p>
              </div>
              <button className="text-pink-500 text-sm font-black hover:underline tracking-tight">View All Tenants</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Restaurant</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Plan</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentTenants.map((ten) => (
                    <tr key={ten._id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg font-black text-white border border-slate-700">
                            {ten.name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-white leading-none">{ten.name}</p>
                            <p className="text-xs text-slate-500 mt-1">{ten.restaurantId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          ten.subscriptionStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                          ten.subscriptionStatus === 'suspended' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {ten.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-indigo-400" />
                          <span className="text-sm font-bold text-slate-300">{ten.subscriptionPlan?.name || 'Trial'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-white">₹{ten.totalPaid || 0}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                          <MoreVertical size={16} className="text-slate-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
