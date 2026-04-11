import { useEffect, useState } from "react";
import {
  getSANotifications,
  markSANotificationRead,
  markAllSANotificationsRead,
  deleteSANotification,
} from "../api/restaurantApi";
import {
  Bell, CheckCheck, Trash2, CreditCard, Building2, 
  ShieldAlert, Zap, RefreshCw, Check, Clock, 
  AlertTriangle, DollarSign
} from "lucide-react";
import toast from "react-hot-toast";

const typeConfig = {
  payment:             { icon: DollarSign,   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Payment" },
  new_restaurant:      { icon: Building2,    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    label: "New Node" },
  subscription_expiry: { icon: AlertTriangle,color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   label: "Expiry" },
  suspension:          { icon: ShieldAlert,  color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    label: "Suspension" },
  system:              { icon: Zap,          color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  label: "System" },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)         return `${diff}s ago`;
  if (diff < 3600)       return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)      return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SuperAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchNotifications = async () => {
    try {
      const { data } = await getSANotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id) => {
    await markSANotificationRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllSANotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

  const handleDelete = async (id) => {
    const notif = notifications.find(n => n._id === id);
    await deleteSANotification(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (notif && !notif.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    toast.success("Notification removed");
  };

  const filtered = filter === "all" ? notifications
    : filter === "unread" ? notifications.filter(n => !n.isRead)
    : notifications.filter(n => n.type === filter);

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-[#020617] text-slate-200">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center relative">
            <Bell className="w-6 h-6 text-pink-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-pink-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#020617]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Notifications</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : "All caught up"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: "all", label: "All" },
          { id: "unread", label: "Unread" },
          { id: "payment", label: "Payments" },
          { id: "new_restaurant", label: "New Nodes" },
          { id: "subscription_expiry", label: "Expiry Alerts" },
          { id: "system", label: "System" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              filter === tab.id
                ? "bg-pink-600 text-white border-pink-500/50 shadow-lg shadow-pink-500/20"
                : "bg-slate-900/50 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-900/50 rounded-3xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-900/50 border border-slate-800 flex items-center justify-center">
            <Bell className="w-8 h-8 text-slate-700" />
          </div>
          <p className="text-slate-600 text-sm font-black uppercase tracking-widest">No Notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => {
            const cfg = typeConfig[notif.type] || typeConfig.system;
            const IconComp = cfg.icon;
            return (
              <div
                key={notif._id}
                className={`group flex items-start gap-4 p-5 rounded-3xl border transition-all cursor-pointer ${
                  notif.isRead
                    ? "bg-slate-900/30 border-slate-800/50 opacity-70 hover:opacity-100"
                    : `bg-slate-900/60 border-slate-700/80 ${cfg.border} hover:border-pink-500/30`
                }`}
                onClick={() => !notif.isRead && handleMarkRead(notif._id)}
              >
                {/* Icon */}
                <div className={`shrink-0 w-10 h-10 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                  <IconComp className={`w-5 h-5 ${cfg.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-white leading-tight">{notif.title}</p>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">{notif.message}</p>
                      
                      {/* Meta details */}
                      <div className="flex flex-wrap gap-3 mt-2">
                        {notif.restaurantId && (
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                            {notif.restaurantId}
                          </span>
                        )}
                        {notif.amount > 0 && (
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/15">
                            ₹{notif.amount.toLocaleString()}
                          </span>
                        )}
                        {notif.planName && (
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded-lg border border-indigo-500/15">
                            {notif.planName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time & Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(notif.createdAt)}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkRead(notif._id); }}
                            className="p-1.5 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-500 rounded-lg transition-all"
                            title="Mark read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(notif._id); }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
