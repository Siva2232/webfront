import { useEffect, useState, useRef } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, CreditCard, BarChart3,
  Shield, LogOut, Settings, ChevronRight, ChevronDown,
  Bell, User, CreditCard as CardIcon, MessageSquare, Wallet, History, Bot
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getSANotifications,
  markAllSANotificationsRead,
  markSANotificationRead,
  deleteSANotification,
} from "../api/restaurantApi";

const nav = [
  { label: "Dashboard",     icon: LayoutDashboard, to: "/superadmin/dashboard" },
  { label: "Restaurants",   icon: Building2,       to: "/superadmin/restaurants" },
  { label: "Plans",         icon: CreditCard,      to: "/superadmin/plans" },
  { label: "Payment Settings", icon: Wallet,       to: "/superadmin/payment-settings" },
  { label: "Payment History",  icon: History,      to: "/superadmin/payment-history" },
  { label: "Analytics",     icon: BarChart3,       to: "/superadmin/analytics" },
  { label: "Analytics Robot", icon: Bot,           to: "/superadmin/analyze-robot" },
  { label: "Support Team",  icon: User,            to: "/superadmin/support-team" },
  { label: "Notifications", icon: Bell,            to: "/superadmin/notifications" },
  { label: "Support",       icon: MessageSquare,   to: "/superadmin/support" },
];

export default function SuperAdminLayout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Guard BEFORE rendering any UI — avoid one-frame flash of the dark sidebar
  // when a non–super-admin lands on a /superadmin/* URL.
  if (!user || !isSuperAdmin) {
    return <Navigate to="/superadmin/login" replace />;
  }

  // Fetch unread notification count and poll every 30s
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await getSANotifications();
        setUnreadCount(data.unreadCount || 0);
      } catch { /* silent */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const { data } = await getSANotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setNotifLoading(false);
    }
  };

  const toggleNotifications = async () => {
    setIsNotifOpen((prev) => !prev);
    // load on open (or refresh if already loaded)
    if (!isNotifOpen) {
      await fetchNotifications();
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markSANotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleDelete = async (id) => {
    try {
      const notif = notifications.find((n) => n._id === id);
      await deleteSANotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (notif && !notif.isRead) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllSANotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all read");
    }
  };

  const notificationTarget = (n) => {
    const type = n?.type || "system";
    if (type === "payment") return "/superadmin/payment-history";
    if (type === "support_ticket") return "/superadmin/support";
    if (type === "new_restaurant") return "/superadmin/restaurants";
    if (type === "subscription_expiry") return "/superadmin/restaurants";
    if (type === "suspension") return "/superadmin/restaurants";
    return "/superadmin/notifications";
  };

  const handleNotificationOpen = async (n) => {
    if (!n) return;
    // mark read first (best effort)
    if (!n.isRead) {
      await handleMarkRead(n._id);
    }
    setIsNotifOpen(false);
    navigate(notificationTarget(n), {
      state: {
        restaurantId: n.restaurantId || "",
        notificationId: n._id,
        notificationType: n.type,
      },
    });
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    const logoutToastId = toast.loading(
      <div className="flex flex-col items-center">
        <p className="mb-2">Are you sure you want to sign out?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(logoutToastId);
              logout();
              toast.success("Logged out");
              window.location.href = "/superadmin/login";
            }}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg"
          >
            Yes
          </button>
          <button
            onClick={() => toast.dismiss(logoutToastId)}
            className="px-4 py-2 bg-slate-200 rounded-lg"
          >
            No
          </button>
        </div>
      </div>,
    );
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800/50">
          <div className="w-10 h-10 bg-linear-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-white text-base tracking-tight leading-none">KMC Admin</p>
            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mt-1">Super Control</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/superadmin/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 group select-none ${
                  isActive
                    ? "bg-pink-600/10 text-pink-400 border border-pink-500/20 shadow-[0_0_20px_rgba(236,72,153,0.05)]"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-pink-500" : "text-slate-500 group-hover:text-pink-400"} transition-colors`} />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.to === "/superadmin/notifications" && unreadCount > 0 && (
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-pink-600 text-white min-w-[1.1rem] text-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {isActive && item.to !== "/superadmin/notifications" && (
                    <motion.div 
                      layoutId="activeNav"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_10px_#ec4899]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Support Card */}
        <div className="px-4 py-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
             <div className="p-2 bg-pink-500/10 rounded-lg w-fit mb-3">
               <Shield className="w-4 h-4 text-pink-500" />
             </div>
             <p className="text-xs font-bold text-white mb-1">Secure Mode</p>
             <p className="text-[10px] text-slate-500 font-medium">Platform-wide encryption active</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header / Top Navbar */}
        <header className="h-20 shrink-0 bg-[#020617]/50 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <div className="h-8 w-1 bg-pink-500 rounded-full" />
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Management Console</h2>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick Actions */}
            <div className="hidden sm:flex items-center gap-3 pr-6 border-r border-slate-800/50">
               <button 
                 onClick={toggleNotifications}
                 className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all relative"
               >
                 <Bell size={20} />
                 {unreadCount > 0 && (
                   <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-pink-500 rounded-full text-white text-[8px] font-black flex items-center justify-center border-2 border-[#020617] shadow-[0_0_8px_#ec4899]">
                     {unreadCount > 9 ? "9+" : unreadCount}
                   </span>
                 )}
               </button>
               <button
                 onClick={() => navigate("/superadmin/payment-settings")}
                 className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all"
                 title="Payment settings"
               >
                 <Settings size={20} />
               </button>
            </div>

            {/* Notifications Popup */}
            <div className="relative" ref={notifRef}>
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-14 z-50 w-[22rem] overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Notifications
                        </p>
                        <p className="mt-1 text-sm font-black text-white">
                          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={fetchNotifications}
                          className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                        >
                          Refresh
                        </button>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="rounded-xl bg-pink-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-pink-500"
                          >
                            Read all
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[26rem] overflow-auto">
                      {notifLoading ? (
                        <div className="flex items-center justify-center py-10 text-slate-400">
                          Loading...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                          <p className="text-sm font-bold text-slate-500">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800/60">
                          {notifications.slice(0, 12).map((n) => (
                            <div
                              key={n._id}
                              className={`px-5 py-4 transition hover:bg-slate-800/30 ${
                                n.isRead ? "opacity-70" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleNotificationOpen(n)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p className="text-sm font-black text-white truncate">
                                    {n.title}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                                    {n.message}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {n.restaurantId ? (
                                      <span className="rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        {n.restaurantId}
                                      </span>
                                    ) : null}
                                    {n.amount > 0 ? (
                                      <span className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                        ₹{Number(n.amount).toLocaleString("en-IN")}
                                      </span>
                                    ) : null}
                                    {n.planName ? (
                                      <span className="rounded-lg border border-indigo-500/15 bg-indigo-500/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-300">
                                        {n.planName}
                                      </span>
                                    ) : null}
                                  </div>
                                </button>

                                <div className="flex shrink-0 flex-col items-end gap-2">
                                  {!n.isRead && (
                                    <span className="mt-1 h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(n._id)}
                                    className="rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400"
                                  >
                                    Del
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-800/60 px-5 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNotifOpen(false);
                          navigate("/superadmin/notifications");
                        }}
                        className="w-full rounded-2xl bg-slate-950/60 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-950"
                      >
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl hover:bg-slate-800/50 border border-transparent hover:border-slate-800 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-slate-700 to-slate-800 p-0.5">
                  <div className="w-full h-full rounded-[10px] bg-slate-900 overflow-hidden flex items-center justify-center">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Super'}`} 
                      alt="avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-black text-white leading-none tracking-tight">{user?.name || 'Administrator'}</p>
                  <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mt-1">Super Admin</p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-500 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden p-2"
                  >
                    <div className="p-4 border-b border-slate-800/50">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Master Account</p>
                      <p className="text-sm font-black text-white truncate">{user?.email || 'master@kmc.com'}</p>
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-2xl transition-all group"
                        onClick={() => { navigate("/superadmin/profile"); setIsProfileOpen(false); }}
                      >
                        <User size={18} className="text-slate-500 group-hover:text-pink-400" />
                        <span>Security Profile</span>
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-2xl transition-all group"
                        onClick={() => { navigate("/superadmin/payment-settings"); setIsProfileOpen(false); }}
                      >
                        <Wallet size={18} className="text-slate-500 group-hover:text-pink-400" />
                        <span>Payment Settings</span>
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-2xl transition-all group"
                        onClick={() => { navigate("/superadmin/payment-history"); setIsProfileOpen(false); }}
                      >
                        <History size={18} className="text-slate-500 group-hover:text-pink-400" />
                        <span>Payment History</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-2xl transition-all group" onClick={() => navigate("/superadmin/plans")}>
                        <CardIcon size={18} className="text-slate-500 group-hover:text-pink-400" />
                        <span>Billing Control</span>
                      </button>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/50">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                      >
                        <LogOut size={18} />
                        Sign Out Console
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-[#020617]/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
