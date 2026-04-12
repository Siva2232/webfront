import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, CreditCard, BarChart3,
  Shield, LogOut, Settings, ChevronRight, ChevronDown,
  Bell, User, CreditCard as CardIcon, MessageSquare
} from "lucide-react";
import toast from "react-hot-toast";
import { getSANotifications, markAllSANotificationsRead } from "../api/restaurantApi";

const nav = [
  { label: "Dashboard",     icon: LayoutDashboard, to: "/superadmin/dashboard" },
  { label: "Restaurants",   icon: Building2,       to: "/superadmin/restaurants" },
  { label: "Plans",         icon: CreditCard,      to: "/superadmin/plans" },
  { label: "Analytics",     icon: BarChart3,       to: "/superadmin/analytics" },
  { label: "Support Team",  icon: User,            to: "/superadmin/support-team" },
  { label: "Notifications", icon: Bell,            to: "/superadmin/notifications" },
  { label: "Support",       icon: MessageSquare,   to: "/superadmin/support" },
];

export default function SuperAdminLayout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user || !isSuperAdmin) {
      navigate("/superadmin/login");
    }
  }, [user, isSuperAdmin, navigate]);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    // Hard reload ensures all context state resets cleanly
    window.location.href = '/superadmin/login';
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
                 onClick={() => navigate("/superadmin/notifications")}
                 className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all relative"
               >
                 <Bell size={20} />
                 {unreadCount > 0 && (
                   <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-pink-500 rounded-full text-white text-[8px] font-black flex items-center justify-center border-2 border-[#020617] shadow-[0_0_8px_#ec4899]">
                     {unreadCount > 9 ? "9+" : unreadCount}
                   </span>
                 )}
               </button>
               <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all">
                 <Settings size={20} />
               </button>
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
                      <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-2xl transition-all group">
                        <User size={18} className="text-slate-500 group-hover:text-pink-400" />
                        <span>Security Profile</span>
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
