import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Notification from "../components/Notification";
import { useState, useEffect, useRef } from "react";
import {
  ShoppingCart,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  BarChart2,
  Menu,
  ChevronDown,
  Ticket,
  CheckCircle2,
  CalendarDays,
  CalendarX2
} from "lucide-react";
import toast from "react-hot-toast";
import { useOrders } from "../context/OrderContext";
import { useUI } from "../context/UIContext";
import "../styles/staff-panel-mobile.css";

export default function KitchenLayout() {
  const location = useLocation();
  const { fetchOrders, fetchBills, fetchActiveKitchenBills } = useOrders();
  const { subscribeNotifyPolling, fetchNotifications } = useUI();

  useEffect(() => {
    const unsub = subscribeNotifyPolling();
    fetchNotifications();
    return unsub;
  }, [subscribeNotifyPolling, fetchNotifications]);

  useEffect(() => {
    const p = location.pathname;
    if (p.includes("/kitchen/dashboard") || p.includes("/kitchen/orders")) fetchOrders();
    if (/^\/kitchen\/bill(\/|$)/.test(p)) fetchBills();
    if (p.includes("/kitchen/kot") || p.includes("/kitchen/kitchen-bill")) fetchActiveKitchenBills();
  }, [location.pathname, fetchOrders, fetchBills, fetchActiveKitchenBills]);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("userInfo") || "{}");

  const menuItems = [
    { name: "Dashboard", icon: BarChart2, path: "/kitchen/dashboard" },
    { name: "Attendance", icon: CheckCircle2, path: "/kitchen/attendance" },
    { name: "Attendance History", icon: CalendarDays, path: "/kitchen/attendance-history" },
    { name: "Leave Requests", icon: CalendarX2, path: "/kitchen/leaves" },
    { name: "Orders", icon: ShoppingCart, path: "/kitchen/orders" },
    { name: "KOT", icon: Ticket, path: "/kitchen/kot" },
  ];

  const handleLogout = () => {
    const logoutToastId = toast.loading(
      <div className="flex flex-col items-center">
        <p className="mb-2">Are you sure you want to log out?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(logoutToastId);              localStorage.removeItem("token");
              localStorage.removeItem("userInfo");              localStorage.removeItem("isKitchenLoggedIn");
              localStorage.removeItem("restaurantId");
              // Hard reload so all context state and socket rooms are fully reset
              window.location.href = "/login?kitchenLogout=true";
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
      </div>
    );
    setIsProfileOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobileMenu = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  };

  return (
    <div
      data-staff-panel
      className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-indigo-100 selection:text-indigo-700"
    >
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-[70] h-screen flex flex-col
          bg-white border-r border-slate-200 transition-all duration-500 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-[90px]" : "w-72"}
        `}
      >
        <div className="flex h-20 shrink-0 items-center justify-between px-4 lg:h-24 lg:px-6">
          <div className={`flex min-w-0 items-center gap-3 overflow-hidden ${isCollapsed && "lg:hidden"}`}>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-800 sm:text-xl">
              Kitchen<span className="text-orange-500"> Panel</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => (isMobileOpen ? setIsMobileOpen(false) : setIsCollapsed(!isCollapsed))}
            className="hidden shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 lg:block"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 max-h-[calc(100vh-160px)] overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const baseClasses = `
              group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300
              active:scale-95 touch-none select-none
            `;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={({ isActive }) => `
                  ${baseClasses}
                  ${
                    isActive
                      ? "bg-orange-500 text-white shadow-[0_10px_25px_-5px_rgba(15,23,42,0.25)] border border-orange-700"
                      : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent"
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={22}
                      className={`flex-shrink-0 transition-transform duration-300 ${
                        isActive ? "scale-110" : "group-hover:scale-110"
                      }`}
                    />
                    <span
                      className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
                        isCollapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
                      }`}
                    >
                      {item.name}
                    </span>
                    {isActive && !isCollapsed && (
                      <motion.div
                        layoutId="activeDot"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"
                      />
                    )}
                    {isCollapsed && (
                      <div className="hidden lg:block absolute left-full ml-6 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 pointer-events-none z-[100] shadow-xl">
                        {item.name}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-6 border-t border-slate-100">
          <div className={`bg-slate-50 rounded-2xl p-4 flex items-center gap-3 ${isCollapsed && "lg:justify-center"}`}>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
              B
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Standard Plan</p>
                <p className="text-[10px] text-slate-400 truncate">Unlimited Products</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* main content container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <header className="sticky top-0 z-50 flex h-14 min-w-0 items-center justify-between gap-2 border-b border-slate-100 bg-white/70 px-3 backdrop-blur-md sm:px-4 lg:h-20 lg:gap-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              className="shrink-0 rounded-xl p-2 text-slate-600 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h2 className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 sm:text-sm sm:tracking-[0.2em] lg:hidden">
              Kitchen
            </h2>
            <h2 className="hidden text-sm font-black uppercase tracking-[0.2em] text-slate-400 lg:block">
              Kitchen Control
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-6">
            <Notification targetPath="/kitchen/orders" />
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-full border border-transparent p-1 pr-2 transition-all hover:border-slate-100 hover:bg-slate-50 sm:gap-3 sm:pr-3"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm sm:h-10 sm:w-10">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name || 'Kitchen'}`} alt="avatar" />
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-bold leading-none text-slate-800">{user.name || 'Kitchen User'}</p>
                  <p className="mt-1 text-[10px] font-medium text-slate-400">{user.role || 'Staff'}</p>
                </div>
                <ChevronDown
                  size={14}
                  className={`hidden text-slate-400 transition-transform sm:block ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 z-[100] mt-2 w-[min(100vw-1.5rem,16rem)] rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-2xl shadow-slate-200 sm:mt-4 sm:w-64"
                  >
                    <div className="p-4 border-b border-slate-50">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Account</p>
                      <p className="text-sm font-bold text-slate-800">{user.email || 'kitchen@demo.com'}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <LogOut size={18} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main data-staff-main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
