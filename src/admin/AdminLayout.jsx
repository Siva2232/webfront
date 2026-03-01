import React from "react";
import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Notification from "../components/Notification";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Table,
  Users,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Settings,
  ChevronDown,
  Sparkles,
  ImagePlus,
  AlertTriangle,
  X,
  Headset,
  BarChart2,
  Receipt,
  BarChart,
  UserPlus,
  DollarSign,
  Clock,
  FileText,
  Zap,
  UtensilsCrossed,
} from "lucide-react";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrderContext";
import toast from "react-hot-toast";

export default function AdminLayout() {
  const { products = [] } = useProducts();
  const { fetchOrders, fetchBills } = useOrders();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showStockAlert, setShowStockAlert] = useState(false);
  // ids that have been cleared from the alert list (until refresh)
  const [clearedIds, setClearedIds] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const stockRef = useRef(null);

  // track which top‑level menu has its submenu open (if any)
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const menuItems = [
    { name: "Analytics", icon: BarChart2, path: "reports" },
    { name: "Dashboard", icon: LayoutDashboard, path: "dashboard" },
    { name: "Products", icon: Package, path: "products" },
    { name: "Orders", icon: ShoppingCart, path: "orders" },
    { name: "Manual Order", icon: UtensilsCrossed, path: "manual-order" },
    { name: "Bill", icon: Receipt, path: "bill" },
    { name: "Tables", icon: Table, path: "tables" },
    {
      name: "Staff",
      icon: Users,
      path: "staff",
      // submenu entries use `tab` to control the staff page's active tab
      children: [
        { name: "Overview", tab: "overview" },
        { name: "Create Staff", tab: "create" },
        { name: "Salaries", tab: "salary" },
        { name: "Salary History", tab: "salaryHistory" },
      ],
    },
    { name: "Add Banner", icon: ImagePlus, path: "banner" },
    { name: "Add Offers", icon: Sparkles, path: "offers" },
    {
      name: "Expense Tracker",
      icon: FileText,
      path: "expense",
      children: [
        { name: "Purchase", tab: "purchase", path: "expense/purchase" },
        { name: "Utility", tab: "utility", path: "expense/utility" },
        { name: "Direct Expense", tab: "direct", path: "expense/direct" },
        { name: "Indirect Expense", tab: "indirect", path: "expense/indirect" },
      ],
    },
    { name: "Kitchen Features",
      icon: Settings,
      path: "new-feature", // just placeholder - won't be used anyway
      disabled: true,
    },
  ];

  // Count out-of-stock products, excluding any cleared by user
  const outOfStockProducts = products.filter(
    (p) => p && !p.isAvailable && !clearedIds.includes(p._id || p.id)
  );
  const lowStockCount = outOfStockProducts.length;

  const handleLogout = () => {
    // custom confirmation using toast so browser dialog is avoided
    const logoutToastId = toast.loading(
      <div className="flex flex-col items-center">
        <p className="mb-2">Are you sure you want to log out?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(logoutToastId);              localStorage.removeItem("token");
              localStorage.removeItem("userInfo");              localStorage.removeItem("isAdminLoggedIn");
              toast.success("Logged out successfully");
              // flag the logout so the shared login page won't auto-switch
              // to the kitchen if that session is still active
              navigate("/login?adminLogout=true", { replace: true });
            }}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg"
          >Yes</button>
          <button
            onClick={() => toast.dismiss(logoutToastId)}
            className="px-4 py-2 bg-slate-200 rounded-lg"
          >No</button>
        </div>
      </div>
    );
    setIsProfileOpen(false);
  };

  useEffect(() => {
    if (localStorage.getItem("showWelcomeMessage") === "true") {
      setShowWelcome(true);
      localStorage.removeItem("showWelcomeMessage");
      setTimeout(() => setShowWelcome(false), 4000);
    }
    // Refresh core admin data on mount
    fetchOrders();
    fetchBills();
  }, []);

  // Close profile dropdown & stock alert when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (stockRef.current && !stockRef.current.contains(e.target)) {
        setShowStockAlert(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // automatically expand the staff submenu if we're on a staff path
  useEffect(() => {
    if (
      location.pathname.startsWith("/admin/staff") ||
      location.pathname.startsWith("/admin/expense")
    ) {
      // open the appropriate submenu by looking at the path
      if (location.pathname.startsWith("/admin/staff")) setOpenSubmenu("Staff");
      else if (location.pathname.startsWith("/admin/expense")) setOpenSubmenu("Expense Tracker");
    } else {
      setOpenSubmenu(null);
    }
  }, [location.pathname, location.search]);

  // Helper to close mobile sidebar only on mobile
  const closeMobileMenu = () => {
    if (window.innerWidth < 1024) {
      // lg breakpoint in tailwind
      setIsMobileOpen(false);
    }
  };

  // toggle a top‑level submenu open/closed
  const toggleSubmenu = (name) => {
    setOpenSubmenu((prev) => (prev === name ? null : name));
  };

  // click handler for items that have children; opens submenu and optionally navigates
  const handleParentItemClick = (item) => {
    const isOpen = openSubmenu === item.name;
    if (isOpen) {
      setOpenSubmenu(null);
    } else {
      setOpenSubmenu(item.name);
    }
    closeMobileMenu();
  };

const handleClearAllStockAlerts = () => {
  // use toast-based confirm instead of native dialog
  const toastId = toast.loading(
    <div className="flex flex-col items-center">
      <p className="mb-2">Clear all low stock alerts? This won't change actual stock levels.</p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            toast.dismiss(toastId);
            const ids = outOfStockProducts.map(p => p._id || p.id);
            setClearedIds(prev => [...prev, ...ids]);
            setShowStockAlert(false);
            toast.success("Stock alerts cleared");
          }}
          className="px-4 py-2 bg-rose-500 text-white rounded-lg"
        >Yes</button>
        <button
          onClick={() => toast.dismiss(toastId)}
          className="px-4 py-2 bg-slate-200 rounded-lg"
        >No</button>
      </div>
    </div>
  );
};
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-indigo-100 selection:text-indigo-700">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-[70] h-screen flex flex-col
          bg-white border-r border-slate-200 transition-all duration-150 ease-out
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
              My Cafe<span className="text-indigo-600"> Admin</span>
            </span>
          </div>
          <button
            onClick={() => (isMobileOpen ? setIsMobileOpen(false) : setIsCollapsed(!isCollapsed))}
            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

       <nav className="flex-1 px-4 space-y-1 mt-4 max-h-[calc(100vh-160px)] overflow-y-auto no-scrollbar">
  {menuItems.map((item) => {
    // Shared classes for both Disabled and Active states to maintain visual harmony
    const baseClasses = `
      group relative flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-colors duration-100
      active:scale-[0.98] touch-none select-none
    `;

    // 1. DISABLED / COMING SOON STATE
    if (item.disabled) {
      return (
        <div key={item.name} className="relative">
          <div
            className={`
              ${baseClasses}
              text-slate-400 cursor-not-allowed bg-slate-50/50 border border-transparent
            `}
          >
            <item.icon size={22} className="flex-shrink-0 opacity-50" />
            
            <span
              className={`transition-opacity duration-100 whitespace-nowrap overflow-hidden ${
                isCollapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
              }`}
            >
              {item.name}
            </span>

            {/* Premium "Soon" Badge */}
            <span className={`
              ml-auto text-[10px] font-black uppercase tracking-tighter bg-slate-200/50 text-slate-500 px-2 py-0.5 rounded-md
              ${isCollapsed ? "lg:hidden" : "block"}
            `}>
              Soon
            </span>
          </div>

          {/* Tooltip: Hidden on touch devices to avoid "sticky hover" bugs */}
          <div className={`
            hidden lg:block pointer-events-none absolute z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-100
            bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl shadow-2xl whitespace-nowrap
            ${isCollapsed ? "left-20 top-1/2 -translate-y-1/2" : "left-4 top-full mt-2"}
          `}>
            Coming Soon
          </div>
        </div>
      );
    }

    // 2. MENU ITEM WITH CHILDREN (dropdown)
    if (item.children) {
      const isOpen = openSubmenu === item.name;
      return (
        <div key={item.name} className="relative">
          <button
            onClick={() => handleParentItemClick(item)}
            className={`w-full text-left ${baseClasses} ${
              isOpen
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <item.icon size={22} className="flex-shrink-0" />
            <span
              className={`transition-opacity duration-100 whitespace-nowrap overflow-hidden ${
                isCollapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
              }`}
            >
              {item.name}
            </span>
            {!isCollapsed && (
              <ChevronDown
                size={16}
                className={`ml-auto transition-transform duration-100 ${isOpen ? "rotate-180" : ""}`}
              />
            )}
          </button>

          {/* submenu list */}
          {isOpen && !isCollapsed && (
            <div className="ml-10 mt-1 flex flex-col space-y-1">
              {(() => {
                const currentTab = new URLSearchParams(location.search).get("tab");
                return item.children.map((child) => {
                  let icon = null;
                  if (child.tab === "overview") icon = <BarChart size={14} className="inline mr-1" />;
                  else if (child.tab === "create") icon = <UserPlus size={14} className="inline mr-1" />;
                  else if (child.tab === "salary") icon = <DollarSign size={14} className="inline mr-1" />;
                  else if (child.tab === "salaryHistory") icon = <Clock size={14} className="inline mr-1" />;
                  else if (child.tab === "purchase") icon = <ShoppingCart size={14} className="inline mr-1" />;
                  else if (child.tab === "utility") icon = <Zap size={14} className="inline mr-1" />;
                  else if (child.tab === "direct") icon = <DollarSign size={14} className="inline mr-1" />;
                  else if (child.tab === "indirect") icon = <Clock size={14} className="inline mr-1" />;
                  const isActiveChild =
                    (child.path && location.pathname.endsWith(child.path)) ||
                    currentTab === child.tab;
                  return (
                    <button
                      key={child.tab}
                      onClick={() => {
                        if (child.path) {
                          navigate(`/admin/${child.path}`);
                        } else {
                          navigate(`/admin/${item.path}?tab=${child.tab}`);
                        }
                        closeMobileMenu();
                      }}
                      className={`w-full text-left text-sm pl-3 py-2 rounded-lg flex items-center transition-colors ${
                        isActiveChild
                          ? "bg-slate-200 text-slate-900"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {icon}
                      {child.name}
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </div>
      );
    }

    // 3. NORMAL ACTIVE CLICKABLE NAV LINK
    return (
      <NavLink
        key={item.path}
        to={`/admin/${item.path}`}
        onClick={closeMobileMenu}
        className={({ isActive }) => `
          ${baseClasses}
          ${
            isActive
              ? "bg-slate-900 text-white shadow-[0_10px_25px_-5px_rgba(15,23,42,0.25)] border border-slate-800"
              : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent"
          }
        `}
      >
        {({ isActive }) => (
          <>
            <item.icon 
              size={22} 
              className="flex-shrink-0"
            />
            
            <span
              className={`transition-opacity duration-100 whitespace-nowrap overflow-hidden ${
                isCollapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
              }`}
            >
              {item.name}
            </span>

            {/* Active Indicator Dot (Mobile/Expanded only) */}
            {isActive && !isCollapsed && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}

            {/* Desktop Collapsed Tooltip */}
            {isCollapsed && (
              <div className="hidden lg:block absolute left-full ml-6 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-[100] shadow-xl">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-24 flex items-center justify-between px-6 lg:px-10 bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2 text-slate-600">
              <Menu size={24} />
            </button>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 hidden sm:block">
              Internal Management System
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <Notification />

            {/* STOCK ALERT WITH DROPDOWN */}
            <div className="relative" ref={stockRef}>
  <button
    onClick={() => setShowStockAlert(!showStockAlert)}
    className={`relative p-3 rounded-full transition-all duration-200 ${
      lowStockCount > 0
        ? "hover:bg-red-50 text-red-600 active:bg-red-100"
        : "hover:bg-slate-100 text-slate-400 active:bg-slate-200"
    }`}
    aria-label={lowStockCount > 0 ? `Low stock alert: ${lowStockCount} items` : "No low stock alerts"}
  >
    <AlertTriangle size={24} className={lowStockCount > 0 ? "animate-pulse" : ""} />
    {lowStockCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full border-2 border-white shadow-md px-1.5">
        {lowStockCount > 99 ? "99+" : lowStockCount}
      </span>
    )}
  </button>

  <AnimatePresence>
    {showStockAlert && (
      <>
        {/* Mobile backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] sm:hidden"
          onClick={() => setShowStockAlert(false)}
        />

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.1 }}
          className="fixed left-4 right-4 top-20 mx-auto w-[calc(100vw-32px)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96 lg:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[100]"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Stock Alerts</h3>
              </div>

              <button
                onClick={() => setShowStockAlert(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 sm:hidden"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} critically low
              </span>

              {lowStockCount > 0 && (
                <button
                  onClick={handleClearAllStockAlerts}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[60vh] sm:max-h-[420px] overflow-y-auto divide-y divide-slate-50">
            {outOfStockProducts.length > 0 ? (
              outOfStockProducts.map((product) => (
                <div
                  key={product._id || product.id}
                  onClick={() => {
                    // go to product list filtered for sold-out items
                    navigate(`/admin/products?filter=out-of-stock`);
                    setShowStockAlert(false);
                  }}
                  className="px-5 sm:px-6 py-4 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors flex items-center gap-4 group"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/admin/products?filter=out-of-stock`);
                      setShowStockAlert(false);
                    }
                  }}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                    <img
                      src={product.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{product.name}</p>
                    <p className="text-sm text-slate-600 mt-0.5">
                      ₹{product.price?.toLocaleString() || "—"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-100">
                      0 LEFT
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-slate-500">
                <Package size={40} className="mx-auto mb-4 text-slate-300" strokeWidth={1.4} />
                <p className="font-medium">No items are out of stock</p>
                <p className="text-sm mt-1 text-slate-400">You're all good!</p>
              </div>
            )}
          </div>

          {/* Footer Action */}
          {outOfStockProducts.length > 0 && (
            <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => {
                  navigate("/admin/products?filter=out-of-stock");
                  setShowStockAlert(false);
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-950 active:bg-black text-white rounded-xl font-medium transition-all text-sm shadow-sm"
              >
                View & Manage Low Stock →
              </button>
            </div>
          )}
        </motion.div>
      </>
    )}
  </AnimatePresence>
</div>

            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="avatar" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-slate-800 leading-none">Alex Rivera</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">Super Admin</p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-4 w-64 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden p-2"
                  >
                    <div className="p-4 border-b border-slate-50">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Account</p>
                      <p className="text-sm font-bold text-slate-800">admin@luxehub.com</p>
                    </div>
                    <button
                      className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all duration-200 group"
                      onClick={() => {
                        navigate("customer");
                        setIsProfileOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Headset size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        <span>Customer Support</span>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1"
                      />
                    </button>
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

        <main className="flex-1 overflow-y-auto">
          <div className="py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Welcome Toast */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-10 right-10 z-[100] bg-slate-900 text-white p-1 pr-6 rounded-2xl flex items-center gap-4 shadow-2xl border border-slate-700"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-xl">👋</div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-400">System Ready</p>
              <p className="font-bold">Welcome back, Chief.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}