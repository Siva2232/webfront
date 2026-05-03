import React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Notification from "../components/Notification";
import { useTheme } from "../context/ThemeContext";
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
  QrCode,
  Ticket,
  Layers,
  HandHelping,
  CheckCircle2,
  Loader2,
  CalendarDays,
  Scissors,
  Building2,
  UserCheck,
  CalendarCheck2,
  CalendarX2,
  Clock4,
  Banknote,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  PieChart,
  Repeat,
} from "lucide-react";
import API from "../api/axios";
import { useProducts } from "../context/ProductContext";
import { useUI } from "../context/UIContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

/** Match `/admin/{segment}` exactly or a nested route — avoids `includes()` bugs (e.g. `bill` vs `manual-bill`). */
function adminChildPathActive(pathname, childPath) {
  if (!childPath) return false;
  const base = `/admin/${childPath}`;
  return pathname === base || pathname.startsWith(`${base}/`);
}

const menuItems = [
  { name: "Analytics", icon: BarChart2, path: "reports" },
  { name: "Dashboard", icon: LayoutDashboard, path: "dashboard" },

  { name: "KOT", icon: Ticket, path: "kitchen-bill" },
  { name: "Bills", icon: Receipt, path: "bill" },
  {
    name: "Manage Menu",
    icon: Menu,
    path: "menu-manage",
    children: [
      { name: "Menu Item", icon: Package, path: "products" },
      { name: "Sub Items", icon: Layers, path: "sub-items" },
    ],
  },
  { name: "Manage Tokens", icon: Ticket, path: "tokens" },

  { name: "Orders Status", icon: ShoppingCart, path: "orders" },
  { name: "Manual Orders", icon: UtensilsCrossed, path: "manual-order" },
  { name: "Split Bills", icon: Scissors, path: "manual-bill" },
  {
    name: "Tables & QR",
    icon: Table,
    path: "tables",
    children: [
      { name: "Tables", path: "tables", icon: Table },
      { name: "QR Generator", path: "qr-generator", icon: QrCode },
      { name: "Reservations", path: "reservations", icon: CalendarDays },
    ],
  },

  { name: "Add Banners", icon: ImagePlus, path: "banner" },
  { name: "Add Offers", icon: Sparkles, path: "offers" },
  {
    name: "HR Management",
    icon: Building2,
    path: "hr",
    children: [
      { name: "HR Dashboard", icon: LayoutDashboard, path: "hr/dashboard" },
      { name: "Shifts", icon: Clock4, path: "hr/shifts" },
      { name: "Payroll", icon: Banknote, path: "hr/payroll" },
      { name: "Staff", icon: UserCheck, path: "hr/staff", flag: "hrStaff" },
      { name: "Attendance", icon: CalendarCheck2, path: "hr/attendance", flag: "hrAttendance" },
      { name: "Leaves", icon: CalendarX2, path: "hr/leaves", flag: "hrLeaves" },
    ],
  },
  {
    name: "Accounting",
    icon: DollarSign,
    path: "accounting",
    children: [
      { name: "Dashboard", icon: LayoutDashboard, path: "accounting" },
      { name: "Ledgers", icon: BookOpen, path: "accounting/ledgers" },
      { name: "Transactions", icon: ArrowLeftRight, path: "accounting/transactions" },
      { name: "Reports", icon: PieChart, path: "accounting/reports" },
    ],
  },
];

export default function AdminLayout() {
  const { products = [], subitems = [] } = useProducts();
  const {
    notifications = [],
    notificationsLoading,
    markNotificationAsRead,
    fetchNotifications,
    supportTicketCount,
    markAllSupportTicketsRead,
  } = useUI();
  const { branding, features, featuresReady } = useTheme();

  const featureMap = {
    hr: "hr",
    reports: "reports",
    "kitchen-bill": "kitchenPanel",
    tables: "qrMenu",
    orders: "onlineOrders",
    accounting: "accounting",
  };

  const serviceNotifications = notifications.filter((notif) => {
    if (notif.type === "WaiterCall") return features.waiterCall !== false;
    if (notif.type === "BillRequested" || notif.type === "BillRequest")
      return features.billRequest !== false;
    return false;
  });
  const showServiceNotificationControl =
    features.waiterCall !== false || features.billRequest !== false;
  const visibleMenuItems = menuItems.filter((item) => {
    const featureKey = featureMap[item.path];
    if (!featureKey) return true;
    // While flags load, keep full nav visible (no empty/staggered sidebar). Hide only once we know a module is off.
    if (!featuresReady) return true;
    return features[featureKey] !== false;
  });

  /**
   * HR: All HR routes live under the “HR Management” submenu. Staff / Attendance / Leaves are
   * optional per `hrStaff` / `hrAttendance` / `hrLeaves`. If parent `hr` is off but a submodule
   * flag is on, show one HR group after “Add Offers” with only those links.
   */
  const navMenuItems = useMemo(() => {
    const hrTemplate = menuItems.find((i) => i.path === "hr");

    const filterHrChildren = (children, { includeCore }) =>
      (children || []).filter((c) => {
        if (c.flag) {
          if (!featuresReady) return true;
          return features[c.flag] !== false;
        }
        return includeCore;
      });

    const out = visibleMenuItems.map((item) => {
      if (item.path !== "hr") return item;
      return {
        ...item,
        children: filterHrChildren(item.children, { includeCore: true }),
      };
    });

    if (featuresReady && features.hr === false && hrTemplate) {
      const orphanChildren = filterHrChildren(hrTemplate.children, { includeCore: false });
      if (orphanChildren.length > 0) {
        const insertAfter = "offers";
        const idx = out.findIndex((i) => i.path === insertAfter);
        const orphanGroup = { ...hrTemplate, children: orphanChildren };
        if (idx === -1) out.push(orphanGroup);
        else out.splice(idx + 1, 0, orphanGroup);
      }
    }

    return out.filter((item) => !item.children || item.children.length > 0);
  }, [visibleMenuItems, features, featuresReady]);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [showWaiterPanel, setShowWaiterPanel] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportModalLoading, setSupportModalLoading] = useState(false);
  const [supportModalTickets, setSupportModalTickets] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const waiterRef = useRef(null);
  const supportRef = useRef(null);

  const { user } = useAuth();
  // ids that have been cleared from the alert list (until refresh)
  const [clearedIds, setClearedIds] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const stockRef = useRef(null);

  // track which top‑level menu has its submenu open (if any)
  const [openSubmenu, setOpenSubmenu] = useState(null);

  // Count out-of-stock products and subitems, excluding any cleared by user
  const outOfStockProducts = products.filter(
    (p) => p && !p.isAvailable && !clearedIds.includes(p._id || p.id),
  );
  const outOfStockSubitems = subitems.filter(
    (s) => s && s.isAvailable === false && !clearedIds.includes(s._id || s.id),
  );
  const lowStockCount = outOfStockProducts.length + outOfStockSubitems.length;
  const outOfStockAlertItems = [
    ...outOfStockProducts.map((item) => ({ ...item, _alertType: "product" })),
    ...outOfStockSubitems.map((item) => ({ ...item, _alertType: "subitem" })),
  ];

  const loadSupportModalTickets = async () => {
    setSupportModalLoading(true);
    try {
      const { data } = await API.get("/support-tickets");
      setSupportModalTickets(data || []);
    } catch (error) {
      console.error("Error loading support tickets:", error);
      setSupportModalTickets([]);
    } finally {
      setSupportModalLoading(false);
    }
  };

  const handleSupportIconClick = async () => {
    if (showSupportModal) {
      setShowSupportModal(false);
      return;
    }

    try {
      if (supportTicketCount > 0) {
        await markAllSupportTicketsRead();
      }
      await loadSupportModalTickets();
    } catch (error) {
      console.error("Error opening support modal:", error);
    }
    setShowSupportModal(true);
  };

  const handleOpenSupportPage = () => {
    setShowSupportModal(false);
    navigate("/admin/customer", { state: { fromSupportNotification: true } });
  };

  const handleLogout = () => {
    // custom confirmation using toast so browser dialog is avoided
    const logoutToastId = toast.loading(
      <div className="flex flex-col items-center">
        <p className="mb-2">Are you sure you want to log out?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(logoutToastId);
              localStorage.removeItem("token");
              localStorage.removeItem("userInfo");
              localStorage.removeItem("isAdminLoggedIn");
              localStorage.removeItem("restaurantId");
              // Hard reload so all context state and socket rooms are fully reset
              window.location.href = "/login?adminLogout=true";
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
    setIsProfileOpen(false);
  };

  useEffect(() => {
    if (localStorage.getItem("showWelcomeMessage") === "true") {
      setShowWelcome(true);
      localStorage.removeItem("showWelcomeMessage");
      setTimeout(() => setShowWelcome(false), 4000);
    }
    // OrderContext already fetches on mount — no duplicate calls needed
  }, []);

  // Close profile dropdown, stock alert, and waiter panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (stockRef.current && !stockRef.current.contains(e.target)) {
        setShowStockAlert(false);
      }
      if (waiterRef.current && !waiterRef.current.contains(e.target)) {
        setShowWaiterPanel(false);
      }
      if (supportRef.current && !supportRef.current.contains(e.target)) {
        setShowSupportModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Digital clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Removed auto-open waiter panel: was causing re-renders on every notification change

  // automatically expand the submenu for current path
  useEffect(() => {
    const parent = menuItems.find(
      (item) =>
        item.children &&
        item.children.some((child) =>
          adminChildPathActive(location.pathname, child.path),
        ),
    );

    if (parent) {
      setOpenSubmenu(parent.name);
      return;
    }

    // fall back to exact path support for older HR routes
    if (
      location.pathname.startsWith("/admin/products") ||
      location.pathname.startsWith("/admin/sub-items")
    ) {
      setOpenSubmenu("Manage Menu");
    } else if (
      location.pathname.startsWith("/admin/tables") ||
      location.pathname.startsWith("/admin/qr-generator") ||
      location.pathname.startsWith("/admin/reservations")
    ) {
      setOpenSubmenu("Tables & QR");
    } else {
      setOpenSubmenu(null);
    }
  }, [location.pathname, location.search]);

  // When a parent submenu opens, scroll its block into view inside the sidebar (nav is overflow-y-auto)
  useEffect(() => {
    if (!openSubmenu) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const safe =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape(openSubmenu)
          : String(openSubmenu).replace(/"/g, '\\"');
      const el = document.querySelector(`[data-nav-group="${safe}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth", inline: "nearest" });
    };
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [openSubmenu, location.pathname, isCollapsed]);

  // Helper to close mobile sidebar only on mobile
  const closeMobileMenu = () => {
    if (window.innerWidth < 1024) {
      // lg breakpoint in tailwind
      setIsMobileOpen(false);
    }
  };

  /** Top-level routes (no submenu): collapse every dropdown so only one nav “mode” at a time */
  const handleLeafNavClick = () => {
    setOpenSubmenu(null);
    closeMobileMenu();
  };

  const isSidebarSectionActive = (item) => {
    if (!item.children?.length) return false;
    const base = `/admin/${item.path}`.replace(/\/$/, "");
    return item.children.some((c) => {
      if (c.path) return adminChildPathActive(location.pathname, c.path);
      if (c.tab) {
        const tab = new URLSearchParams(location.search).get("tab");
        return (
          location.pathname.replace(/\/$/, "") === base &&
          tab === c.tab
        );
      }
      return false;
    });
  };

  /** First sub-link for parent rows (Manage Menu → Menu Item, Tables & QR → Tables, etc.) */
  const handleParentItemClick = (item) => {
    const children = item.children || [];
    const firstPathChild = children.find((c) => c.path);
    const firstTabChild = children.find((c) => c.tab && !c.path);

    const isOpen = openSubmenu === item.name;
    const sectionActive = isSidebarSectionActive(item);

    // Second click on same group while already inside it: collapse only
    if (isOpen && sectionActive) {
      setOpenSubmenu(null);
      closeMobileMenu();
      return;
    }

    setOpenSubmenu(item.name);
    if (firstPathChild) {
      navigate(`/admin/${firstPathChild.path}`);
    } else if (firstTabChild) {
      navigate(`/admin/${item.path}?tab=${firstTabChild.tab}`);
    }
    closeMobileMenu();
  };

  const handleClearAllStockAlerts = () => {
    // use toast-based confirm instead of native dialog
    const toastId = toast.loading(
      <div className="flex flex-col items-center">
        <p className="mb-2">
          Clear all low stock alerts? This won't change actual stock levels.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(toastId);
              const ids = [
                ...outOfStockProducts.map((p) => p._id || p.id),
                ...outOfStockSubitems.map((s) => s._id || s.id),
              ];
              setClearedIds((prev) => [...prev, ...ids]);
              setShowStockAlert(false);
              toast.success("Stock alerts cleared");
            }}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg"
          >
            Yes
          </button>
          <button
            onClick={() => toast.dismiss(toastId)}
            className="px-4 py-2 bg-slate-200 rounded-lg"
          >
            No
          </button>
        </div>
      </div>,
    );
  };
  return (
    <div
      className="min-h-screen flex font-sans selection:bg-indigo-100 selection:text-indigo-700"
      style={{
        "--primary": branding.primaryColor || "#f72585",
        "--secondary": branding.secondaryColor || "#0f172a",
        "--accent": branding.accentColor || "#7209b7",
        "--sidebar-bg": branding.sidebarBgColor || "#ffffff",
        "--sidebar-text": branding.sidebarTextColor || "#1e293b",
        fontFamily: `'${branding.fontFamily || "Inter"}', sans-serif`,
      }}
    >
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
      {/* fixed on lg too — sticky scrolled away with the page; fixed keeps nav + footer anchored */}
      <aside
        className={`
          fixed top-0 left-0 z-[70] h-screen flex flex-col overflow-hidden
          border-r border-slate-200 transition-all duration-150 ease-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-[90px]" : "w-72"}
        `}
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderRightColor: "color-mix(in srgb, var(--sidebar-bg), black 10%)",
        }}
      >
        <div className="h-24 shrink-0 flex items-center px-6 justify-between">
          <div
            className={`flex items-center gap-3 overflow-hidden ${isCollapsed && "lg:hidden"}`}
          >
            {branding.logo ? (
              <img
                src={branding.logo}
                alt={branding.name || "Logo"}
                className="w-10 h-10 rounded-2xl object-contain shadow-lg"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200"
                style={{ backgroundColor: branding.primaryColor || "#0f172a" }}
              >
                <Sparkles className="text-white w-6 h-6" />
              </div>
            )}
            <span
              className="text-xl font-black tracking-tight"
              style={{ color: "var(--sidebar-text)" }}
            >
              {branding.name}
              <span style={{ color: branding.primaryColor || "#6366f1" }}>
                {branding.name ? " Admin" : "Admin Panel"}
              </span>
            </span>
          </div>
          <button
            onClick={() =>
              isMobileOpen
                ? setIsMobileOpen(false)
                : setIsCollapsed(!isCollapsed)
            }
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"
            style={{
              color: "color-mix(in srgb, var(--sidebar-text), transparent 50%)",
            }}
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-4 space-y-1 mt-4 no-scrollbar">
          {navMenuItems.map((item) => {
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
                        isCollapsed
                          ? "lg:w-0 lg:opacity-0"
                          : "w-auto opacity-100"
                      }`}
                    >
                      {item.name}
                    </span>

                    {/* Premium "Soon" Badge */}
                    <span
                      className={`
              ml-auto text-[10px] font-black uppercase tracking-tighter bg-slate-200/50 text-slate-500 px-2 py-0.5 rounded-md
              ${isCollapsed ? "lg:hidden" : "block"}
            `}
                    >
                      Soon
                    </span>
                  </div>

                  {/* Tooltip: Hidden on touch devices to avoid "sticky hover" bugs */}
                  <div
                    className={`
            hidden lg:block pointer-events-none absolute z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-100
            bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl shadow-2xl whitespace-nowrap
            ${isCollapsed ? "left-20 top-1/2 -translate-y-1/2" : "left-4 top-full mt-2"}
          `}
                  >
                    Coming Soon
                  </div>
                </div>
              );
            }

            // 2. MENU ITEM WITH CHILDREN (dropdown)
            if (item.children) {
              const isOpen = openSubmenu === item.name;
              const isActive = item.children.some((child) =>
                adminChildPathActive(location.pathname, child.path),
              );
              const expandedBg =
                isOpen && !isActive
                  ? "color-mix(in srgb, var(--sidebar-text) 10%, transparent)"
                  : "transparent";
              return (
                <div
                  key={item.name}
                  className="relative scroll-my-2"
                  data-nav-group={item.name}
                >
                  <button
                    onClick={() => handleParentItemClick(item)}
                    className={`w-full text-left ${baseClasses}`}
                    style={{
                      backgroundColor: isActive
                        ? "var(--primary)"
                        : expandedBg,
                      color: isActive ? "#fff" : "var(--sidebar-text)",
                    }}
                  >
                    <item.icon size={22} className="flex-shrink-0" />
                    <span
                      className={`transition-opacity duration-100 whitespace-nowrap overflow-hidden ${
                        isCollapsed
                          ? "lg:w-0 lg:opacity-0"
                          : "w-auto opacity-100"
                      }`}
                    >
                      {item.name}
                    </span>
                    {!isCollapsed && (
                      <ChevronDown
                        size={16}
                        className={`ml-auto transition-transform duration-100 ${isOpen ? "rotate-180" : ""}`}
                        style={{
                          color: isActive ? "#fff" : "var(--sidebar-text)",
                        }}
                      />
                    )}
                  </button>

                  {/* submenu list */}
                  {isOpen && !isCollapsed && (
                    <div className="ml-10 mt-1 flex flex-col space-y-1">
                      {(() => {
                        const currentTab = new URLSearchParams(
                          location.search,
                        ).get("tab");
                        return item.children.map((child) => {
                          let icon = null;
                          if (child.icon) {
                            icon = React.cloneElement(<child.icon />, {
                              size: 14,
                              className: "inline mr-1",
                            });
                          } else if (child.tab === "overview")
                            icon = (
                              <BarChart size={14} className="inline mr-1" />
                            );
                          else if (child.tab === "create")
                            icon = (
                              <UserPlus size={14} className="inline mr-1" />
                            );
                          else if (child.tab === "salary")
                            icon = (
                              <DollarSign size={14} className="inline mr-1" />
                            );
                          else if (child.tab === "salaryHistory")
                            icon = <Clock size={14} className="inline mr-1" />;
                          else if (child.tab === "purchase")
                            icon = (
                              <ShoppingCart size={14} className="inline mr-1" />
                            );
                          else if (child.tab === "utility")
                            icon = <Zap size={14} className="inline mr-1" />;
                          else if (child.tab === "direct")
                            icon = (
                              <DollarSign size={14} className="inline mr-1" />
                            );
                          else if (child.tab === "indirect")
                            icon = <Clock size={14} className="inline mr-1" />;
                          const isActiveChild =
                            (child.path &&
                              location.pathname.endsWith(child.path)) ||
                            currentTab === child.tab;
                          const key = child.tab || child.path || child.name;
                          return child.path ? (
                          <NavLink
                            key={key}
                            to={`/admin/${child.path}`}
                            end
                            onClick={closeMobileMenu}
                            className="w-full text-left text-sm pl-3 py-2 rounded-lg flex items-center transition-colors font-semibold"
                            style={({ isActive }) => ({
                              backgroundColor: isActive
                                ? "var(--primary)"
                                : "transparent",
                              color: isActive ? "#fff" : "var(--sidebar-text)",
                              opacity: isActive ? 1 : 0.88,
                            })}
                          >
                            {icon}
                            {child.name}
                          </NavLink>
                        ) : (
                          <button
                            key={key}
                            onClick={() => {
                              navigate(`/admin/${item.path}?tab=${child.tab}`);
                              closeMobileMenu();
                            }}
                            className="w-full text-left text-sm pl-3 py-2 rounded-lg flex items-center transition-colors font-semibold"
                            style={{
                              backgroundColor: isActiveChild
                                ? "var(--primary)"
                                : "transparent",
                              color: isActiveChild ? "#fff" : "var(--sidebar-text)",
                              opacity: isActiveChild ? 1 : 0.88,
                            }}
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
                onClick={handleLeafNavClick}
                className={({ isActive }) => `
          ${baseClasses}
        `}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? "var(--primary)" : "transparent",
                  color: isActive ? "#fff" : "var(--sidebar-text)",
                  border: isActive
                    ? "1px solid rgba(0,0,0,0.1)"
                    : "1px solid transparent",
                })}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={22} className="flex-shrink-0" />

                    <span
                      className={`transition-opacity duration-100 whitespace-nowrap overflow-hidden ${
                        isCollapsed
                          ? "lg:w-0 lg:opacity-0"
                          : "w-auto opacity-100"
                      }`}
                    >
                      {item.name}
                    </span>

                    {/* Active Indicator Dot (Mobile/Expanded only) */}
                    {isActive && !isCollapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50" />
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

        {/* Bottom brand — compact */}
        <div
          className="shrink-0 px-2 pb-2 pt-1"
          style={{
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderColor:
              "color-mix(in srgb, var(--sidebar-text) 12%, var(--sidebar-bg))",
          }}
        >
          <div
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
              isCollapsed ? "justify-center px-1" : ""
            }`}
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--sidebar-text) 6%, var(--sidebar-bg))",
            }}
            title="Powered by MyCafe"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white shadow-sm ring-1 ring-black/5"
              aria-hidden
            >
              <Sparkles size={13} strokeWidth={2.25} className="text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 text-left leading-none">
                <p
                  className="text-[8px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--sidebar-text) 50%, var(--sidebar-bg))",
                  }}
                >
                  Powered by
                </p>
                <p
                  className="mt-0.5 truncate text-[11px] font-black tracking-tight"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  MyCafe
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main: offset by sidebar width on desktop (fixed sidebar is out of flex flow) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-150 ease-out ${
          isCollapsed ? "lg:ml-[90px]" : "lg:ml-72"
        }`}
        style={{ backgroundColor: "#F8FAFC" }}
      >
        {/* Header */}
        <header className="h-24 flex items-center justify-between px-6 lg:px-10 bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 hidden sm:block">
              Internal Management System
            </h2>
          </div>

          <div className="flex items-center gap-6 ml-[-0px]">
            {/* Digital Clock */}
            <div className="hidden sm:flex flex-col items-end justify-center text-right pr-4 border-r border-slate-200">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-0.5">
                Time
              </span>
              <span className="text-2xl font-light tabular-nums tracking-tight text-slate-950 leading-none">
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-1">
                {currentTime.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {/* Waiter Notifications */}
            {showServiceNotificationControl && (
              <div className="relative" ref={waiterRef}>
                <button
                  onClick={() => setShowWaiterPanel((prev) => !prev)}
                  className={`relative p-2 sm:p-3 rounded-full transition-all duration-200 ${
                    serviceNotifications.length > 0
                      ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                      : "hover:bg-slate-100 text-slate-400"
                  }`}
                  aria-label="Open waiter notification panel"
                >
                  {notificationsLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <HandHelping
                      size={24}
                      className={
                        serviceNotifications.length > 0 ? "animate-bounce" : ""
                      }
                    />
                  )}
                  {serviceNotifications.length > 0 && !notificationsLoading && (
                    <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full border-2 border-white shadow-md px-1.5">
                      {serviceNotifications.length}
                    </span>
                  )}
                </button>

                {/* Notification Popup if any */}
                <AnimatePresence>
                  {showWaiterPanel && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-80 max-w-[95vw] md:max-w-[350px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
                    >
                      <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                          <HandHelping size={16} className="text-amber-500" />
                          Service Calls
                        </h3>
                        <span className="px-2 py-1 bg-amber-100 text-amber-600 text-[10px] font-bold rounded-full uppercase">
                          {serviceNotifications.length} Active
                        </span>
                      </div>
                      <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                        {serviceNotifications.map((notif) => (
                          <div
                            key={notif._id}
                            className={`p-4 border-b border-slate-50 transition-colors group ${notif.type === "BillRequested" ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-slate-50"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-bold text-slate-800">
                                    Table {notif.table}
                                  </p>
                                  {notif.type === "BillRequested" && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded uppercase tracking-tighter">
                                      <Receipt size={10} /> Bill Request
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-xs mt-0.5 font-medium ${notif.type === "BillRequested" ? "text-indigo-600" : "text-slate-500"}`}
                                >
                                  {notif.message ||
                                    (notif.type === "BillRequested"
                                      ? "Requesting final bill"
                                      : "Needs assistance")}
                                </p>
                                <span className="text-[10px] font-bold text-slate-400 mt-2 block uppercase tracking-tighter">
                                  {new Date(notif.createdAt).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  markNotificationAsRead(notif._id)
                                }
                                className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity ${
                                  notif.type === "BillRequested"
                                    ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                }`}
                                title="Mark as Completed"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Support Ticket Chat Count */}
            <div className="relative" ref={supportRef}>
              <button
                onClick={handleSupportIconClick}
                className={`relative p-2 sm:p-3 rounded-full transition-all duration-200 ${
                  supportTicketCount > 0
                    ? "bg-sky-50 text-sky-600 hover:bg-sky-100"
                    : "hover:bg-slate-100 text-slate-400"
                }`}
                aria-label="Open support chat notification modal"
              >
                <Headset
                  size={24}
                  className={supportTicketCount > 0 ? "animate-pulse" : ""}
                />
                {supportTicketCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sky-600 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full border-2 border-white shadow-md px-1.5">
                    {supportTicketCount > 99 ? "99+" : supportTicketCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showSupportModal && (
                  <motion.div
                    initial={{ opacity: 0, y: -12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    className="absolute right-0 mt-4 w-[320px] lg:w-[380px] bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/80 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                            Support Notifications
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {supportTicketCount} unread ticket
                            {supportTicketCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowSupportModal(false)}
                          className="text-slate-400 hover:text-slate-600"
                          aria-label="Close support modal"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto no-scrollbar">
                      {supportModalLoading ? (
                        <div className="p-6 text-center text-slate-500">
                          Loading support tickets…
                        </div>
                      ) : supportModalTickets.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                          No support tickets found.
                        </div>
                      ) : (
                        supportModalTickets.map((ticket) => (
                          <button
                            key={ticket._id}
                            onClick={() => {
                              setShowSupportModal(false);
                              navigate("/admin/customer", {
                                state: {
                                  fromSupportNotification: true,
                                  selectedTicketId: ticket._id,
                                },
                              });
                            }}
                            className="w-full text-left p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-slate-900 truncate">
                                  {ticket.subject}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate mt-1">
                                  {ticket.messages[ticket.messages.length - 1]
                                    ?.text || "No message yet"}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${
                                  ticket.status === "Resolved"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : ticket.status === "Open"
                                      ? "bg-amber-100 text-amber-600"
                                      : "bg-sky-100 text-sky-600"
                                }`}
                              >
                                {ticket.status}
                              </span>
                            </div>
                            <div className="mt-3 text-[10px] text-slate-400 flex items-center justify-between">
                              <span>
                                {new Date(
                                  ticket.lastMessageAt,
                                ).toLocaleString()}
                              </span>
                              {!ticket.isRead && (
                                <span className="font-black text-slate-900">
                                  Unread
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                      <button
                        onClick={handleOpenSupportPage}
                        className="w-full rounded-2xl bg-slate-900 text-white py-3 text-sm font-bold hover:bg-slate-800 transition-colors"
                      >
                        Open Support Center
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
                aria-label={
                  lowStockCount > 0
                    ? `Low stock alert: ${lowStockCount} items`
                    : "No low stock alerts"
                }
              >
                <AlertTriangle
                  size={24}
                  className={lowStockCount > 0 ? "animate-pulse" : ""}
                />
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
                              <AlertTriangle
                                size={18}
                                className="text-red-600"
                              />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">
                              Stock Alerts
                            </h3>
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
                            {lowStockCount} item{lowStockCount !== 1 ? "s" : ""}{" "}
                            critically low
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
                        {lowStockCount > 0 ? (
                          outOfStockAlertItems.map((item) => (
                            <div
                              key={item._id || item.id}
                              onClick={() => {
                                // navigate to the appropriate archive page for this item type
                                const target =
                                  item._alertType === "subitem"
                                    ? "/admin/sub-items?filter=out-of-stock"
                                    : "/admin/products?filter=out-of-stock";
                                navigate(target);
                                setShowStockAlert(false);
                              }}
                              className="px-5 sm:px-6 py-4 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors flex items-center gap-4 group"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  navigate(
                                    `/admin/products?filter=out-of-stock`,
                                  );
                                  setShowStockAlert(false);
                                }
                              }}
                            >
                              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 flex items-center justify-center">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                ) : item._alertType === "subitem" ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50 text-indigo-400">
                                    <Layers size={24} />
                                    <span className="text-[8px] font-black uppercase mt-0.5">
                                      LIB
                                    </span>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                    <Package
                                      className="text-slate-400"
                                      size={24}
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span
                                    className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                      item._alertType === "subitem"
                                        ? "bg-indigo-100 text-indigo-600"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {item._alertType}
                                  </span>
                                  <p className="text-xs font-medium text-slate-400">
                                    ₹{item.price?.toLocaleString() || "—"}
                                  </p>
                                </div>
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
                            <Package
                              size={40}
                              className="mx-auto mb-4 text-slate-300"
                              strokeWidth={1.4}
                            />
                            <p className="font-medium">
                              No items are out of stock
                            </p>
                            <p className="text-sm mt-1 text-slate-400">
                              You're all good!
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer Action */}
                      {(outOfStockProducts.length > 0 ||
                        outOfStockSubitems.length > 0) && (
                        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-2">
                          {outOfStockProducts.length > 0 && (
                            <button
                              onClick={() => {
                                navigate("/admin/products?filter=out-of-stock");
                                setShowStockAlert(false);
                              }}
                              className="w-full py-3 bg-slate-900 hover:bg-slate-950 active:bg-black text-white rounded-xl font-medium transition-all text-sm shadow-sm"
                            >
                              View Product Low Stock →
                            </button>
                          )}
                          {outOfStockSubitems.length > 0 && (
                            <button
                              onClick={() => {
                                navigate(
                                  "/admin/sub-items?filter=out-of-stock",
                                );
                                setShowStockAlert(false);
                              }}
                              className="w-full py-3 bg-slate-900 hover:bg-slate-950 active:bg-black text-white rounded-xl font-medium transition-all text-sm shadow-sm"
                            >
                              View Sub-item Low Stock →
                            </button>
                          )}
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
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name || "Admin"}`}
                    alt="avatar"
                  />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-slate-800 leading-none">
                    {user.name || "Alex Rivera"}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">
                    {user.role === "superadmin" ? "Admin" : (user.role || "Admin")}
                  </p>
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
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                        Account
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {user.email || "admin@luxehub.com"}
                      </p>
                    </div>

                    {/* Subscription Status Item */}
                    <div className="mx-2 mt-2">
                      <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50/50 border border-slate-100/50 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500 shrink-0">
                          <Zap
                            size={20}
                            fill={
                              branding.subscriptionStatus === "active"
                                ? "currentColor"
                                : "none"
                            }
                            className={
                              branding.subscriptionStatus === "active"
                                ? "animate-pulse"
                                : ""
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">
                            Subscription
                          </p>
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {branding.subscriptionPlan?.name || "No Plan"}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 truncate">
                            {branding.subscriptionStatus || "trial"}
                            {branding.subscriptionExpiry ? ` · Expires ${new Date(branding.subscriptionExpiry).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      className="w-full flex items-center justify-between px-4 py-3.5 mt-2 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all duration-200 group"
                      onClick={() => {
                        navigate("profile");
                        setIsProfileOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <UserCheck
                          size={20}
                          className="text-slate-400 group-hover:text-indigo-600 transition-colors"
                        />
                        <span>My Profile</span>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1"
                      />
                    </button>

                    <button
                      className="w-full flex items-center justify-between px-4 py-3.5 mt-2 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all duration-200 group"
                      onClick={() => {
                        navigate("customer");
                        setIsProfileOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Headset
                          size={20}
                          className="text-slate-400 group-hover:text-indigo-600 transition-colors"
                        />
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
            <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-xl">
              👋
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-400">
                System Ready
              </p>
              <p className="font-bold">Welcome back, Chief.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
