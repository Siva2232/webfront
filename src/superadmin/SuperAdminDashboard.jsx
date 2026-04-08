import { useEffect, useState } from "react";
import { getAnalytics } from "../api/restaurantApi";
import { Building2, CheckCircle2, Clock, XCircle, DollarSign, Zap, Users, ShoppingBag, TrendingUp } from "lucide-react";

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
    </div>
  </div>
);

const FeatureBar = ({ label, count, total }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{count} / {total}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time statistics across all tenant restaurants</p>
      </div>

      {loading ? (
        <p className="text-slate-400 animate-pulse">Loading analytics…</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Restaurants"  value={stats?.total}        icon={Building2}    color="bg-blue-600" />
            <StatCard label="Active"             value={stats?.active}       icon={CheckCircle2} color="bg-emerald-600" />
            <StatCard label="Trial"              value={stats?.trial}        icon={Clock}        color="bg-amber-600" />
            <StatCard label="Expired"            value={stats?.expired}      icon={XCircle}      color="bg-red-600" />
            <StatCard label="Suspended"          value={stats?.suspended}    icon={XCircle}      color="bg-rose-800" />
            <StatCard label="Total Revenue (₹)"  value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color="bg-purple-600" />
          </div>

          {/* Feature usage */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-pink-400" />
              Feature Usage Across Tenants
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats?.featureUsage && Object.entries({
                hr:           "HR Management",
                accounting:   "Accounting",
                inventory:    "Inventory",
                onlineOrders: "Online Orders",
                qrMenu:       "QR Menu",
                kitchenPanel: "Kitchen Panel",
                waiterPanel:  "Waiter Panel",
              }).map(([key, label]) => (
                <FeatureBar
                  key={key}
                  label={label}
                  count={stats.featureUsage[key] || 0}
                  total={stats.total || 1}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
