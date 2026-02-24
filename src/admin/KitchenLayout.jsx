
import { NavLink, Outlet, useNavigate, } from "react-router-dom";
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
} from "lucide-react";
import toast from "react-hot-toast";

export default function KitchenLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const menuItems = [
    { name: "Dashboard", icon: BarChart2, path: "dashboard" },
    { name: "Orders", icon: ShoppingCart, path: "orders" },
    { name: "Bill", icon: Receipt, path: "bill" },
  ];

  const handleLogout = () => {
    const logoutToastId = toast.loading(
      <div className="flex flex-col items-center">
        <p className="mb-2">Are you sure you want to log out?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(logoutToastId);
              localStorage.removeItem("isKitchenLoggedIn");
              toast.success("Logged out successfully");
              navigate("/kitchen/login", { replace: true });
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
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-indigo-100 selection:text-indigo-700">
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
        <div className="h-24 flex items-center px-6 justify-between">
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed && "lg:hidden"}`}>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-800">
              Kitchen<span className="text-orange-500"> Panel</span>
            </span>
          </div>
          <button
            onClick={() => (isMobileOpen ? setIsMobileOpen(false) : setIsCollapsed(!isCollapsed))}
            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-colors"
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
                to={`/kitchen/${item.path}`}
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
        <header className="h-20 flex items-center justify-between px-6 bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(prev => !prev)} className="lg:hidden p-2 text-slate-600">
              <Menu size={24} />
            </button>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 hidden lg:block">
              Kitchen Control
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <Notification targetPath="/kitchen/orders" />
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Kitchen" alt="avatar" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-slate-800 leading-none">Kitchen User</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">Staff</p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-64 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden p-2"
                  >
                    <div className="p-4 border-b border-slate-50">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Account</p>
                      <p className="text-sm font-bold text-slate-800">kitchen@demo.com</p>
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

        <Outlet />
      </div>
    </div>
  );
}
