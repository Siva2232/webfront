import React from "react";
import { useState, useEffect, useRef, useMemo, startTransition } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Notification from "../components/Notification";
import { isCustomerOnlinePaymentEnabled } from "../utils/paymentFeature";
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
  BellRing,
  CreditCard,
} from "lucide-react";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrderContext";
import { useUI } from "../context/UIContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
/** Customer menu brand — `webfront/src/assets/flowdiner-mini-logo.png` */
import flowDinerBrandLogo from "../assets/flowdiner-mini-logo.png";
import KitchenAutoPrintListener from "./kitchenBill/KitchenAutoPrintListener";
import PrinterSettingsHydrator from "./printing/PrinterSettingsHydrator";

/** Match `/admin/{segment}` exactly or a nested route — avoids `includes()` bugs (e.g. `bill` vs `manual-bill`). */
function adminChildPathActive(pathname, childPath) {
  if (!childPath) return false;
  const base = `/admin/${childPath}`;
  return pathname === base || pathname.startsWith(`${base}/`);
}

const FEATURE_MAP = {
  hr: "hr",
  reports: "reports",
  analytics: "reports",
  "kitchen-bill": "kitchenPanel",
  tables: "qrMenu",
  "qr-generator": "qrMenu",
  orders: "onlineOrders",
  "manual-order": "onlineOrders",
  accounting: "accounting",
  reservations: "reservations",
};

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, path: "dashboard" },
  { name: "Orders Status", icon: ShoppingCart, path: "orders" },
  { name: "Manual Orders", icon: UtensilsCrossed, path: "manual-order" },
  { name: "Bills", icon: Receipt, path: "bill" },
  { name: "KOT", icon: Ticket, path: "kitchen-bill" },
  {
    name: "Manage Menu",
    icon: Menu,
    path: "menu-manage",
    children: [
      { name: "Menu Item", icon: Package, path: "products" },
      { name: "Sub Items", icon: Layers, path: "sub-items" },
    ],
  },
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

  { name: "Manage Tokens", icon: Ticket, path: "tokens" },

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
  { name: "Analytics", icon: BarChart2, path: "analytics" },
  {
    name: "Promotions",
    icon: Sparkles,
    path: "promotions",
    children: [
      { name: "Add Banners", icon: ImagePlus, path: "banner" },
      { name: "Add Offers", icon: Sparkles, path: "offers" },
    ],
  },
];

export default function AdminLayout() {
  const { products = [], subitems = [], ensureProductsLoaded } = useProducts();
  const {
    notifications = [],
    notificationsLoading,
    markNotificationAsRead,
    supportTicketCount,
    markAllSupportTicketsRead,
    fetchSupportTicketCount,
    subscribeAdminChrome,
    fetchAdminChromeBundle,
    fetchCustomerPromos,
  } = useUI();
  const { fetchOrders, fetchBills, fetchActiveKitchenBills } = useOrders();
  const { branding, features, featuresReady } = useTheme();

  const onlinePaymentEnabled = useMemo(
    () =>
      isCustomerOnlinePaymentEnabled(features, branding.subscriptionPlan, {
        featuresReady,
      }),
    [features, branding.subscriptionPlan, featuresReady],
  );

  const serviceNotifications = useMemo(
    () =>
      notifications.filter((notif) => {
        if (notif.type === "WaiterCall") return features.waiterCall !== false;
        if (notif.type === "BillRequested" || notif.type === "BillRequest")
          return features.billRequest !== false;
        return false;
      }),
    [notifications, features.waiterCall, features.billRequest],
  );

  const billingNotifications = useMemo(
    () =>
      notifications.filter(
        (notif) =>
          notif.type === "SubscriptionBilling" || notif.type === "SubscriptionPayment"
      ),
    [notifications],
  );

  /** Sidebar + alerts: last 5 days of trial/plan, or expired */
  const subscriptionSidebarAlert = useMemo(() => {
    const status = branding?.subscriptionStatus;
    const expRaw = branding?.subscriptionExpiry;
    if (!expRaw) return null;
    const exp = new Date(expRaw);
    if (Number.isNaN(+exp)) return null;
    const daysLeft = Math.ceil((exp - new Date()) / 86400000);
    const eligible = status === "active" || status === "trial";
    if (eligible && daysLeft >= 0 && daysLeft <= 5) {
      return { kind: "soon", daysLeft, expiry: exp };
    }
    if (status === "expired" || daysLeft < 0) {
      return { kind: "expired", daysLeft };
    }
    return null;
  }, [branding?.subscriptionExpiry, branding?.subscriptionStatus]);

  /** Header reminder bell: show in final 5 days / expired, or when cron billing alerts exist */
  const billingReminderWindowActive = !!subscriptionSidebarAlert;
  const showBillingReminderIcon =
    billingReminderWindowActive || billingNotifications.length > 0;
  const showServiceNotificationControl =
    features.waiterCall !== false || features.billRequest !== false;
  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const featureKey = FEATURE_MAP[item.path];
      if (!featureKey) return true;
      return features[featureKey] !== false;
    });
  }, [features]);

  /**
   * HR: All HR routes live under the “HR Management” submenu. Staff / Attendance / Leaves are
   * optional per `hrStaff` / `hrAttendance` / `hrLeaves`. If parent `hr` is off but a submodule
   * flag is on, show one HR group after “Add Offers” with only those links.
   */
  const navMenuItems = useMemo(() => {
    const hrTemplate = menuItems.find((i) => i.path === "hr");

    const filterFeatureChildren = (children) =>
      (children || []).filter((c) => {
        const featureKey = FEATURE_MAP[c.path];
        if (!featureKey) return true;
        return features[featureKey] !== false;
      });

    const filterHrChildren = (children, { includeCore }) =>
      (children || []).filter((c) => {
        if (c.flag) {
          return features[c.flag] !== false;
        }
        return includeCore;
      });

    const out = visibleMenuItems.map((item) => {
      if (item.path === "hr") {
        return {
          ...item,
          children: filterHrChildren(item.children, { includeCore: true }),
        };
      }
      if (item.children && item.children.length) {
        return { ...item, children: filterFeatureChildren(item.children) };
      }
      return item;
    });

    if (featuresReady && features.hr === false && hrTemplate) {
      const orphanChildren = filterHrChildren(hrTemplate.children, { includeCore: false });
      if (orphanChildren.length > 0) {
        const orphanGroup = { ...hrTemplate, children: orphanChildren };
        // `offers` is a child route, not a top-level nav path — inserting after it never matched,
        // so the orphan HR block was pushed to the very end (after Promotions). Keep Promotions last.
        const promotionsIdx = out.findIndex((i) => i.path === "promotions");
        if (promotionsIdx !== -1) out.splice(promotionsIdx, 0, orphanGroup);
        else out.push(orphanGroup);
      }
    }

    return out.filter((item) => !item.children || item.children.length > 0);
  }, [visibleMenuItems, features]);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [showWaiterPanel, setShowWaiterPanel] = useState(false);
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportModalLoading, setSupportModalLoading] = useState(false);
  const [supportModalTickets, setSupportModalTickets] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const waiterRef = useRef(null);
  const billingRef = useRef(null);
  const supportRef = useRef(null);

  const { user } = useAuth();
  // ids that have been cleared from the alert list (until refresh)
  const [clearedIds, setClearedIds] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    ensureProductsLoaded();
    const unsub = subscribeAdminChrome();
    fetchAdminChromeBundle();
    return unsub;
  }, [ensureProductsLoaded, subscribeAdminChrome, fetchAdminChromeBundle]);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    const p = location.pathname;
    const lightOnly =
      /^\/admin\/(banner|offers)/.test(p) ||
      p.startsWith("/admin/profile") ||
      p.startsWith("/admin/payment-settings") ||
      p.startsWith("/admin/subscription") ||
      p.startsWith("/admin/customer");
    const skipOrdersPrefetch =
      lightOnly ||
      /^\/admin\/(analytics|accounting)/.test(p) ||
      p.startsWith("/admin/hr");

    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      startTransition(() => {
        if (cancelled) return;
        if (p.startsWith("/admin/banner") || p.startsWith("/admin/offers")) {
          fetchCustomerPromos();
        }
        if (!skipOrdersPrefetch) fetchOrders();
        if (/^\/admin\/bill(\/|$)/.test(p) || /^\/admin\/manual-bill(\/|$)/.test(p))
          fetchBills();
        if (/^\/admin\/kitchen-bill(\/|$)/.test(p)) fetchActiveKitchenBills();
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [location.pathname, fetchCustomerPromos, fetchOrders, fetchBills, fetchActiveKitchenBills]);

  const dropdownRef = useRef(null);
  const stockRef = useRef(null);

  // track which top‑level menu has its submenu open (if any)
  const [openSubmenu, setOpenSubmenu] = useState(null);
  /** When user manually collapses a section, don't re-open it until route or nav changes */
  const submenuSyncSuppressRef = useRef(null);

  const {
    outOfStockProducts,
    outOfStockSubitems,
    lowStockCount,
    outOfStockAlertItems,
  } = useMemo(() => {
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
    return {
      outOfStockProducts,
      outOfStockSubitems,
      lowStockCount,
      outOfStockAlertItems,
    };
  }, [products, subitems, clearedIds]);

  const loadSupportModalTickets = async () => {
    setSupportModalLoading(true);
    try {
      const tickets = await fetchSupportTicketCount();
      setSupportModalTickets(Array.isArray(tickets) ? tickets : []);
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

  // Lock page scroll while mobile drawer is open
  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileOpen]);

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
      if (billingRef.current && !billingRef.current.contains(e.target)) {
        setShowBillingPanel(false);
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

  const resolveSubmenuForPath = (pathname) => {
    const parent = menuItems.find(
      (item) =>
        item.children &&
        item.children.some((child) =>
          adminChildPathActive(pathname, child.path),
        ),
    );
    if (parent) return parent.name;

    if (
      pathname.startsWith("/admin/products") ||
      pathname.startsWith("/admin/sub-items")
    ) {
      return "Manage Menu";
    }
    if (
      pathname.startsWith("/admin/tables") ||
      pathname.startsWith("/admin/qr-generator") ||
      pathname.startsWith("/admin/reservations")
    ) {
      return "Tables & QR";
    }
    return null;
  };

  // Sync submenu open state from route only (prevents click + effect fighting / sidebar jump)
  useEffect(() => {
    const next = resolveSubmenuForPath(location.pathname);
    if (
      submenuSyncSuppressRef.current &&
      submenuSyncSuppressRef.current === next
    ) {
      setOpenSubmenu((prev) => (prev === null ? prev : null));
      return;
    }
    submenuSyncSuppressRef.current = null;
    setOpenSubmenu((prev) => (prev === next ? prev : next));
  }, [location.pathname, location.search]);

  // Helper to close mobile sidebar only on mobile
  const closeMobileMenu = () => {
    if (window.innerWidth < 1024) {
      // lg breakpoint in tailwind
      setIsMobileOpen(false);
    }
  };

  const handleLeafNavClick = () => {
    submenuSyncSuppressRef.current = null;
    closeMobileMenu();
  };

  const handleSubmenuNavClick = () => {
    submenuSyncSuppressRef.current = null;
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
      submenuSyncSuppressRef.current = item.name;
      setOpenSubmenu(null);
      closeMobileMenu();
      return;
    }

    submenuSyncSuppressRef.current = null;
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
      <KitchenAutoPrintListener />
      <PrinterSettingsHydrator />
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
          fixed top-0 left-0 bottom-0 z-[70] flex flex-col overflow-hidden
          max-lg:h-[100dvh] max-lg:max-h-[100dvh] lg:top-0 lg:bottom-auto lg:h-screen
          border-r border-slate-200 transition-all duration-150 ease-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          w-[min(18rem,88vw)] lg:w-72 ${isCollapsed ? "lg:w-[90px]" : ""}
        `}
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderRightColor: "color-mix(in srgb, var(--sidebar-bg), black 10%)",
        }}
      >
        <div className="h-28 shrink-0 flex items-center px-4 lg:px-6 justify-between max-lg:h-20">
          <div
            className={`flex min-w-0 flex-1 items-center gap-2.5 lg:gap-3 overflow-hidden max-lg:flex-1 lg:overflow-visible lg:pr-1 ${isCollapsed && "lg:hidden"}`}
          >
            {branding.logo ? (
              <img
                src={branding.logo}
                alt={branding.name || "Logo"}
                className="h-11 w-11 lg:h-14 lg:w-14 shrink-0 object-contain"
              />
            ) : (
              <div
                className="flex h-11 w-11 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: branding.primaryColor || "#0f172a" }}
              >
                <Sparkles className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
              </div>
            )}
            <span
              className="text-base font-black tracking-tight truncate max-lg:block lg:text-xl lg:truncate-none lg:whitespace-normal lg:leading-snug"
              style={{ color: "var(--sidebar-text)" }}
            >
              {branding.name}
              <span style={{ color: branding.primaryColor || "#6366f1" }}>
                {branding.name ? " Admin" : "Admin Panel"}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors lg:hidden shrink-0"
            style={{
              color: "color-mix(in srgb, var(--sidebar-text), transparent 50%)",
            }}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block p-2 rounded-xl hover:bg-black/5 transition-colors shrink-0"
            style={{
              color: "color-mix(in srgb, var(--sidebar-text), transparent 50%)",
            }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 lg:px-4 space-y-1 mt-2 lg:mt-4 pb-3 no-scrollbar">
          {navMenuItems.map((item) => {
            // Shared classes for both Disabled and Active states to maintain visual harmony
            const baseClasses =
              "group relative flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-colors duration-100 select-none border border-transparent";

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
                  className="relative"
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

                  {/* submenu — always mounted when sidebar expanded; CSS height avoids layout jump */}
                  {!isCollapsed && (
                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "" : "pointer-events-none"}`}
                      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                      aria-hidden={!isOpen}
                    >
                      <div className="min-h-0 overflow-hidden">
                    <div className="ml-10 mt-1 flex flex-col space-y-1 pb-0.5">
                      {(() => {
                        const currentTab = new URLSearchParams(
                          location.search,
                        ).get("tab");
                        return item.children.map((child) => {
                          let icon = null;
                          const IconComp = child.icon;
                          if (IconComp) {
                            icon = (
                              <IconComp size={14} className="inline mr-1" />
                            );
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
                            onClick={handleSubmenuNavClick}
                            className="w-full text-left text-sm pl-3 py-2 rounded-lg flex items-center transition-colors font-semibold border border-transparent"
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
                              submenuSyncSuppressRef.current = null;
                              navigate(`/admin/${item.path}?tab=${child.tab}`);
                              closeMobileMenu();
                            }}
                            className="w-full text-left text-sm pl-3 py-2 rounded-lg flex items-center transition-colors font-semibold border border-transparent"
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
                      </div>
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
                  borderColor: isActive ? "rgba(0,0,0,0.1)" : "transparent",
                })}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={22} className="flex-shrink-0" />

                    <span
                      className={`flex-1 min-w-0 transition-opacity duration-100 whitespace-nowrap overflow-hidden ${
                        isCollapsed
                          ? "lg:w-0 lg:opacity-0"
                          : "w-auto opacity-100"
                      }`}
                    >
                      {item.name}
                    </span>

                    {/* Active dot — reserved space so row height doesn't shift */}
                    {!isCollapsed && (
                      <div
                        className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white/50 transition-opacity ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                        aria-hidden={!isActive}
                      />
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
        </div>

        {/* Mobile-safe footer: subscription alert + brand — never scrolled off-screen */}
        <div
          className="shrink-0 flex flex-col border-t border-slate-200/80 max-lg:shadow-[0_-12px_28px_rgba(15,23,42,0.08)] max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-0"
          style={{
            borderColor:
              "color-mix(in srgb, var(--sidebar-text) 14%, var(--sidebar-bg))",
            backgroundColor: "var(--sidebar-bg)",
          }}
        >
        {/* Billing countdown — last 5 days (trial / plan) or expired */}
        {subscriptionSidebarAlert && (
          <div className="shrink-0 px-3 pt-2 pb-1 max-lg:pt-2.5">
            <button
              type="button"
              onClick={() => navigate("/admin/subscription")}
              className={`w-full rounded-2xl border text-left transition-all hover:opacity-95 active:scale-[0.98] ${
                subscriptionSidebarAlert.kind === "expired"
                  ? "border-rose-300 bg-rose-50"
                  : "border-amber-300 bg-amber-50"
              } ${isCollapsed ? "p-2 flex justify-center" : "p-3"}`}
              title="Open Subscription"
            >
              <div
                className={`flex items-start gap-2.5 ${isCollapsed ? "justify-center" : ""}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    subscriptionSidebarAlert.kind === "expired"
                      ? "bg-rose-500 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  <BellRing size={18} strokeWidth={2.25} />
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 leading-none">
                      {subscriptionSidebarAlert.kind === "expired"
                        ? "Subscription"
                        : branding?.subscriptionStatus === "trial"
                          ? "Free trial"
                          : "Billing"}
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900 leading-tight">
                      {subscriptionSidebarAlert.kind === "expired"
                        ? "Expired — renew now"
                        : subscriptionSidebarAlert.daysLeft === 0
                          ? "Last day today"
                          : `${subscriptionSidebarAlert.daysLeft} day${
                              subscriptionSidebarAlert.daysLeft === 1 ? "" : "s"
                            } left`}
                    </p>
                    {subscriptionSidebarAlert.kind === "soon" && (
                      <p className="text-[10px] font-semibold text-amber-800/90 mt-1 truncate">
                        Until{" "}
                        {subscriptionSidebarAlert.expiry.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Bottom brand — Powered by (flat, no logo plate / gradient) */}
        <div className="shrink-0 px-3 py-3 max-lg:py-2.5">
          <div
            className={`flex items-center max-lg:gap-3 ${isCollapsed ? "lg:justify-center lg:gap-0" : "gap-3"}`}
            title="Powered by Flow Diner"
          >
            <img
              src={flowDinerBrandLogo}
              alt="Flow Diner"
              width={240}
              height={56}
              className={
                isCollapsed
                  ? "h-10 w-auto max-w-[140px] shrink-0 object-contain object-left opacity-90 max-lg:max-w-[140px] lg:h-10 lg:w-10 lg:max-w-none"
                  : "h-10 w-auto max-w-[140px] shrink-0 object-contain object-left opacity-90 sm:max-w-[160px]"
              }
              loading="lazy"
              decoding="async"
            />
            <div
              className={`min-w-0 flex-1 ${isCollapsed ? "max-lg:block lg:hidden" : "block"}`}
            >
              <p
                className="text-[8px] font-bold uppercase tracking-[0.2em] leading-none"
                style={{
                  color:
                    "color-mix(in srgb, var(--sidebar-text) 48%, var(--sidebar-bg))",
                }}
              >
                Powered by
              </p>
              <p
                className="mt-0.5 text-xs font-black tracking-tight"
                style={{ color: "var(--sidebar-text)" }}
              >
                Flow Diner
              </p>
              <p
                className="mt-0.5 text-[9px] font-medium leading-snug"
                style={{
                  color:
                    "color-mix(in srgb, var(--sidebar-text) 42%, var(--sidebar-bg))",
                }}
              >
                Restaurant platform
              </p>
            </div>
            {isCollapsed && (
              <span className="sr-only max-lg:hidden">Powered by Flow Diner</span>
            )}
          </div>
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
        <header className="h-16 sm:h-20 lg:h-24 flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-10 bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200 shrink-0"
              aria-label="Open menu"
            >
              <Menu size={22} className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <h2 className="text-[10px] sm:text-sm font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 truncate leading-none">
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Internal Management System</span>
            </h2>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-6 ml-auto shrink-0">
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

            {/* Expiry reminders — BellRing icon only in last 5 days / expired, or when alerts exist */}
            {showBillingReminderIcon && (
            <div className="relative" ref={billingRef}>
              <button
                type="button"
                onClick={() => setShowBillingPanel((p) => !p)}
                className={`relative p-2 sm:p-3 rounded-full transition-all duration-200 ${
                  billingNotifications.length > 0
                    ? "bg-amber-50 text-amber-800 hover:bg-amber-100 ring-2 ring-amber-400/90 shadow-md"
                    : billingReminderWindowActive
                      ? "bg-amber-50/90 text-amber-700 hover:bg-amber-100 ring-2 ring-amber-300/70"
                      : "bg-slate-50 text-amber-700 hover:bg-amber-50 ring-1 ring-amber-200/60"
                }`}
                aria-label={
                  billingReminderWindowActive
                    ? "Subscription expiry reminders"
                    : "Billing reminder notifications"
                }
              >
                {notificationsLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <BellRing
                    size={24}
                    strokeWidth={2}
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${
                      billingNotifications.length > 0
                        ? "animate-bounce"
                        : billingReminderWindowActive
                          ? "animate-pulse"
                          : ""
                    }`}
                  />
                )}
                {billingNotifications.length > 0 && !notificationsLoading && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full border-2 border-white shadow-md px-1.5">
                    {billingNotifications.length > 99
                      ? "99+"
                      : billingNotifications.length}
                  </span>
                )}
                {billingNotifications.length === 0 &&
                  billingReminderWindowActive &&
                  !notificationsLoading && (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white shadow-sm"
                      title="Plan expiring soon"
                      aria-hidden
                    />
                  )}
              </button>

              <AnimatePresence>
                {showBillingPanel && (
                  <>
                  <div
                    className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-[90] lg:hidden"
                    onClick={() => setShowBillingPanel(false)}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed left-3 right-3 top-[4.5rem] max-h-[min(70vh,520px)] flex flex-col lg:absolute lg:left-auto lg:right-0 lg:top-auto lg:mt-4 lg:max-h-none w-auto lg:w-80 max-w-none lg:max-w-[380px] bg-white rounded-3xl shadow-2xl border border-amber-100 overflow-hidden z-[100]"
                  >
                    <div className="p-5 border-b border-amber-50 bg-amber-50/50 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                        <BellRing size={16} className="text-amber-600 shrink-0" />
                        Expiry reminders
                      </h3>
                      <button
                        type="button"
                        onClick={() => navigate("/admin/subscription")}
                        className="text-[10px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-900"
                      >
                        Renew
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto max-h-[320px] lg:max-h-[320px] no-scrollbar">
                      {billingNotifications.length === 0 && subscriptionSidebarAlert && (
                        <div className="p-4 border-b border-amber-100/80 bg-gradient-to-b from-amber-50/90 to-white">
                          <p className="text-xs font-black uppercase tracking-widest text-amber-800">
                            {subscriptionSidebarAlert.kind === "expired"
                              ? "Subscription expired"
                              : "Plan ending soon"}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-800 leading-snug">
                            {subscriptionSidebarAlert.kind === "expired"
                              ? "Your access may be limited until you renew. Pay now to extend your plan."
                              : `Your plan ends in ${subscriptionSidebarAlert.daysLeft} day${subscriptionSidebarAlert.daysLeft === 1 ? "" : "s"}${subscriptionSidebarAlert.expiry ? ` (${subscriptionSidebarAlert.expiry.toLocaleDateString(undefined, { dateStyle: "medium" })})` : ""}.`}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowBillingPanel(false);
                              navigate("/admin/subscription");
                            }}
                            className="mt-4 w-full rounded-2xl bg-amber-600 py-3 text-center text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/25 transition hover:bg-amber-700"
                          >
                            Renew now
                          </button>
                          {/* <p className="mt-3 text-[10px] text-slate-500 text-center leading-relaxed">
                            You may also receive email-style alerts here when the system sends reminder pings (last 5 days, up to twice daily).
                          </p> */}
                        </div>
                      )}

                      {billingNotifications.length === 0 && !subscriptionSidebarAlert ? (
                        <p className="p-6 text-sm text-slate-500 text-center">
                          No billing alerts right now. When your plan is within 5 days of expiry, a reminder and renew action appear here. Server reminders may also show as separate items (twice daily when enabled).
                        </p>
                      ) : null}

                      {billingNotifications.length > 0 &&
                        billingNotifications.map((notif) => {
                          const isPayment = notif.type === "SubscriptionPayment";
                          return (
                          <div
                            key={notif._id}
                            className={`p-4 border-b border-slate-50 transition-colors group ${
                              isPayment ? "hover:bg-emerald-50/40" : "hover:bg-amber-50/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold uppercase tracking-tight ${
                                  isPayment ? "text-emerald-800" : "text-amber-900"
                                }`}>
                                  {isPayment ? "Payment received" : "Plan expiry"}
                                </p>
                                <p className="text-sm text-slate-700 mt-1 leading-snug">
                                  {notif.message || (isPayment ? "Subscription payment recorded." : "Renew your subscription.")}
                                </p>
                                <span className="text-[10px] font-bold text-slate-400 mt-2 block uppercase tracking-tighter">
                                  {notif.createdAt
                                    ? new Date(notif.createdAt).toLocaleString([], {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })
                                    : ""}
                                </span>
                                {!isPayment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowBillingPanel(false);
                                    navigate("/admin/subscription");
                                  }}
                                  className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-900 hover:bg-amber-100"
                                >
                                  Renew
                                </button>
                                )}
                                {isPayment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowBillingPanel(false);
                                    navigate("/admin/subscription");
                                  }}
                                  className="mt-3 w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-800 hover:bg-emerald-100"
                                >
                                  View history
                                </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  markNotificationAsRead(notif._id);
                                }}
                                className="p-2 rounded-xl opacity-80 group-hover:opacity-100 bg-amber-100 text-amber-700 hover:bg-amber-200 shrink-0"
                                title="Dismiss"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            </div>
                          </div>
                          );
                        })}
                    </div>
                  </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            )}

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
                      className={`h-5 w-5 sm:h-6 sm:w-6 ${
                        serviceNotifications.length > 0 ? "animate-bounce" : ""
                      }`}
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
                    <>
                    <div
                      className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-[90] lg:hidden"
                      onClick={() => setShowWaiterPanel(false)}
                      aria-hidden
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="fixed left-3 right-3 top-[4.5rem] max-h-[min(70vh,520px)] flex flex-col lg:absolute lg:left-auto lg:right-0 lg:top-auto lg:mt-4 lg:max-h-none w-auto lg:w-80 max-w-none lg:max-w-[350px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
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
                      <div className="min-h-0 flex-1 overflow-y-auto max-h-[350px] no-scrollbar">
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
                    </>
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
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    supportTicketCount > 0 ? "animate-pulse" : ""
                  }`}
                />
                {supportTicketCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sky-600 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full border-2 border-white shadow-md px-1.5">
                    {supportTicketCount > 99 ? "99+" : supportTicketCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showSupportModal && (
                  <>
                  <div
                    className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-[90] lg:hidden"
                    onClick={() => setShowSupportModal(false)}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    className="fixed left-3 right-3 top-[4.5rem] max-h-[min(70vh,520px)] flex flex-col lg:absolute lg:left-auto lg:right-0 lg:top-auto lg:mt-4 lg:max-h-none w-auto lg:w-[380px] bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/80 overflow-hidden z-[100]"
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
                    <div className="min-h-0 flex-1 overflow-y-auto max-h-[320px] no-scrollbar">
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
                  </>
                )}
              </AnimatePresence>
            </div>

            <Notification />

            {/* STOCK ALERT WITH DROPDOWN */}
            <div className="relative" ref={stockRef}>
              <button
                onClick={() => setShowStockAlert(!showStockAlert)}
                className={`relative p-2 sm:p-3 rounded-full transition-all duration-200 ${
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
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    lowStockCount > 0 ? "animate-pulse" : ""
                  }`}
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
                className="flex items-center gap-2 sm:gap-3 p-1 pr-2 sm:pr-3 rounded-full hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 shrink-0"
              >
                <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-full border border-slate-200/90">
                  {branding.logo ? (
                    <img
                      src={branding.logo}
                      alt={branding.name ? `${branding.name} logo` : "logo"}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "Admin"}`}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-slate-800 leading-none">
                    {user?.name || "Alex Rivera"}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">
                    {user?.role === "superadmin" ? "Admin" : (user?.role || "Admin")}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`hidden sm:block text-slate-400 transition-transform shrink-0 ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-3 sm:mt-4 w-[min(16rem,calc(100vw-1.5rem))] sm:w-64 max-lg:origin-top-right bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden p-2 z-[110]"
                  >
                    <div className="p-4 border-b border-slate-50">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                        Account
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {user?.email || "admin@luxehub.com"}
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
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3.5 mt-2 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all duration-200 group"
                      onClick={() => {
                        navigate("subscription");
                        setIsProfileOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard
                          size={20}
                          className="text-slate-400 group-hover:text-indigo-600 transition-colors"
                        />
                        <span>Manage subscription</span>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1"
                      />
                    </button>

                    <button
                      type="button"
                      disabled={!onlinePaymentEnabled}
                      title={
                        onlinePaymentEnabled
                          ? "Configure Razorpay for customer checkout"
                          : "Enable Customer — Pay online in your plan or module access"
                      }
                      className={`w-full flex items-center justify-between px-4 py-3.5 mt-2 text-sm font-bold rounded-xl transition-all duration-200 group ${
                        onlinePaymentEnabled
                          ? "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                          : "cursor-not-allowed text-slate-400 opacity-70"
                      }`}
                      onClick={() => {
                        if (!onlinePaymentEnabled) return;
                        navigate("payment-settings");
                        setIsProfileOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Settings
                          size={20}
                          className={
                            onlinePaymentEnabled
                              ? "text-slate-400 group-hover:text-indigo-600 transition-colors"
                              : "text-slate-300"
                          }
                        />
                        <div className="min-w-0 text-left">
                          <span>Payment settings</span>
                          {!onlinePaymentEnabled && (
                            <p className="text-[10px] font-semibold normal-case tracking-normal text-slate-400 mt-0.5">
                              Requires Customer — Pay online
                            </p>
                          )}
                        </div>
                      </div>
                      {onlinePaymentEnabled ? (
                        <ChevronRight
                          size={16}
                          className="text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1"
                        />
                      ) : null}
                    </button>

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

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="py-3 px-3 sm:py-8 sm:px-0 max-lg:min-w-0">
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
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-10 sm:bottom-10 z-[100] bg-slate-900 text-white p-1 pr-4 sm:pr-6 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-2xl border border-slate-700 max-w-md sm:max-w-none ml-auto"
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
