import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrderContext";
import { useUI } from "../context/UIContext";
import { useTheme } from "../context/ThemeContext";
import API from "../api/axios";
import { fetchTablesCoalesced } from "../api/fetchTablesCoalesced";
import { getCurrentRestaurantId, tenantKey } from "../utils/tenantCache";
import { motion, AnimatePresence } from "framer-motion";
import { taxOnTaxableAmount, GST_TOTAL_PCT_LABEL } from "../utils/gstRates";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Package,
  ShoppingBag,
  Activity,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  CheckCircle,
  IndianRupee,
  Zap,
  Crown,
  Award,
  ShieldCheck,
  History,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Box,
  Circle,
  LayoutGrid,
  CalendarCheck,
  BellRing,
  Receipt,
  ChevronRight,
  Table as TableIcon,
  HandHelping 
} from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Dashboard() {
  const { products = [], subitems = [] } = useProducts();
  const { orders = [] } = useOrders();
  const { reservations = [], notifications = [], markNotificationAsRead } = useUI();
  const { features } = useTheme();
  const reservationsEnabled = features.reservations !== false;
  const billRequestEnabled = features.billRequest !== false;
  const waiterCallEnabled = features.waiterCall !== false;
  const tablesFeatureEnabled = features.qrMenu !== false;

  const _rid = getCurrentRestaurantId();

  const [tables, setTables] = useState(() => {
    try {
      const cached = localStorage.getItem(tenantKey("restaurant_tables_config", _rid));
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  
  // High-performance state initialization from localStorage
  const [activeOrdersMap, setActiveOrdersMap] = useState(() => {
    const map = {};
    try {
      const rid = getCurrentRestaurantId();
      const cached = localStorage.getItem(tenantKey("cachedOrders", rid));
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.forEach(o => {
          if (o.status && o.status !== "Closed") {
            map[`table-${o.table}`] = true;
          }
        });
      }
    } catch {}
    return map;
  });

  const [totalRevenue, setTotalRevenue] = useState(() => {
    return Number(localStorage.getItem(tenantKey("dashboard_total_revenue", _rid)) || 0);
  });

  const [todayOrdersCount, setTodayOrdersCount] = useState(() => {
    return Number(localStorage.getItem(tenantKey("dashboard_today_count", _rid)) || 0);
  });

  const [bestSellers, setBestSellers] = useState(() => {
    try {
      const cached = localStorage.getItem(tenantKey("dashboard_best_sellers", _rid));
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  // Performance enhancement: Persistent sync tracker to skip heavy refetching if data is fresh
  const lastSyncRef = useRef(Number(localStorage.getItem(tenantKey("dashboard_last_sync", _rid)) || 0));

  const [reservedTables, setReservedTables] = useState({});
  const [tableAlerts, setTableAlerts] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  
  const navigate = useNavigate();

  // Background sync for core data
  useEffect(() => {
    const syncSystem = async (force = false) => {
      // Skip if synced within the last 15s (unless forced by interval)
      const now = Date.now();
      if (!force && now - lastSyncRef.current < 15000) return;
      
      setIsSyncing(true);
      try {
        // Run stats + tables in parallel (2 calls instead of 3)
        const [statsRes, tableData] = await Promise.all([
          API.get('/orders/stats').catch(() => null),
          fetchTablesCoalesced().catch(() => null),
        ]);

        if (statsRes?.data) {
          const { todayCount, totalRevenue, bestSellers } = statsRes.data;
          
          if (typeof totalRevenue === 'number') {
            setTotalRevenue(totalRevenue);
            localStorage.setItem(tenantKey("dashboard_total_revenue", _rid), totalRevenue.toString());
          }
          if (typeof todayCount === 'number') {
            setTodayOrdersCount(todayCount);
            localStorage.setItem(tenantKey("dashboard_today_count", _rid), todayCount.toString());
          }
          if (Array.isArray(bestSellers)) {
            setBestSellers(bestSellers);
            localStorage.setItem(tenantKey("dashboard_best_sellers", _rid), JSON.stringify(bestSellers));
          }
          
          lastSyncRef.current = now;
          localStorage.setItem(tenantKey("dashboard_last_sync", _rid), now.toString());
        }

        if (tableData && Array.isArray(tableData)) {
          setTables(tableData);
          localStorage.setItem(tenantKey("restaurant_tables_config", _rid), JSON.stringify(tableData));
        }

        // Orders list: OrderContext + route prefetch + sockets — avoid duplicate GET /orders here.
      } catch (err) {
        console.error("Dashboard sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    syncSystem();
    const interval = setInterval(() => syncSystem(true), 45000);
    return () => clearInterval(interval);
  }, [_rid]);
  useEffect(() => {
    const liveMap = {};
    orders.forEach(o => {
      if (o.status && o.status !== "Closed") {
        liveMap[`table-${o.table}`] = true;
      }
    });
    setActiveOrdersMap(liveMap);
  }, [orders]);

  // Logic for Auto-Occupying Tables based on Reservations (feature-flagged)
  useEffect(() => {
    if (!reservationsEnabled) {
      setReservedTables({});
      return;
    }
    const reserveMap = {};
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    reservations.forEach(res => {
      if (["Pending", "Confirmed"].includes(res.status) && res.table) {
        const resTime = new Date(res.reservationTime);
        if (resTime <= oneHourFromNow && resTime >= new Date(now.getTime() - 2 * 60 * 60 * 1000)) {
          reserveMap[`table-${res.table}`] = {
            customerName: res.customerName,
            time: resTime
          };
        }
      }
    });
    setReservedTables(reserveMap);
  }, [reservations, reservationsEnabled]);

  // Sync with live notifications
  useEffect(() => {
    const alertsMap = {};
    notifications.forEach(n => {
      if (n.type === "SubscriptionBilling") return;
      if (n.status === "Pending") {
        const key = `table-${n.table}`;
        if (!alertsMap[key]) alertsMap[key] = { waiter: false, bill: false, ids: [] };
        if (n.type === "WaiterCall") alertsMap[key].waiter = true;
        if (n.type === "BillRequested" || n.type === "BillRequest") alertsMap[key].bill = true;
        alertsMap[key].ids.push(n._id);
      }
    });
    setTableAlerts(alertsMap);
  }, [notifications]);

  const isOccupied = (tableId) => !!activeOrdersMap[`table-${tableId}`];
  const isReserved = (tableId) => !!reservedTables[`table-${tableId}`];

  // --- ANALYTICS LOGIC ---
  const activeOrders = orders.filter((o) => !["Served", "Closed", "Cancelled"].includes(o.status)).length;
  const unavailableProducts = products.filter((p) => !p.isAvailable);
  const unavailableSubitems = subitems.filter((s) => s.isAvailable === false);
  const totalUnavailableCount = unavailableProducts.length + unavailableSubitems.length;

  // Pie chart data for inventory status
  const pieData = useMemo(() => {
    const liveProdCount = products.filter(p => p.isAvailable).length;
    const liveSubCount = subitems.filter(s => s.isAvailable !== false).length;
    const outProdCount = unavailableProducts.length;
    const outSubCount = unavailableSubitems.length;
    const liveCount = liveProdCount + liveSubCount;
    const outCount = outProdCount + outSubCount;
    return [
      { name: "Active Stock", value: liveCount, color: "#27272a" },
      { name: "Out of Stock", value: outCount, color: "#e11d48" },
    ];
  }, [products, subitems, unavailableProducts.length, unavailableSubitems.length]);

  // Critical products + subitems alert
  const criticalProducts = useMemo(() => {
    const prodAlerts = products
      .filter(p => !p.isAvailable)
      .map(p => ({
        id: p._id,
        name: p.name,
        issue: "Out of Stock",
        image: p.image,
        type: 'product'
      }));

    const subAlerts = subitems
      .filter(s => s.isAvailable === false)
      .map(s => ({
        id: s._id,
        name: s.name,
        issue: "Out of Stock",
        image: null,
        type: 'subitem'
      }));

    return [...prodAlerts, ...subAlerts].slice(0, 10);
  }, [products, subitems]);

  // Export functionality
  const handleExport = (format) => {
    const data = products.map((p) => {
      const price = Number(p.price) || 0;
      const tax = taxOnTaxableAmount(price);
      const total = price + tax;
      return {
        Name: p.name,
        Price: price,
        GST: tax.toFixed(2),
        Total: total.toFixed(2),
        Status: p.isAvailable ? "Live" : "Stocked",
      };
    });
    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory_Report");
      XLSX.writeFile(wb, `Inventory_Report.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.text("Inventory Report", 14, 20);
      doc.autoTable({
        head: [["Product", "Price", "Tax", "Total"]],
        body: data.map((o) => [o.Name, o.Price, o.GST, o.Total]),
      });
      doc.save("Inventory_Report.pdf");
    }
  };

  return (
    <div className="relative min-h-full bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 p-4 font-sans sm:p-6 lg:p-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl space-y-10">
        
        {/* --- 1. HEADER --- */}
        <header className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-[0_12px_40px_-18px_rgba(24,24,27,0.35)] ring-1 ring-zinc-900/10">
                <Zap className="text-white" size={20} fill="currentColor" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Overview
              </span>
            </motion.div>
            <h1 className="text-4xl font-black leading-tight tracking-tighter text-zinc-900 md:text-5xl">
              Dashboard
            </h1>
          </div>

          <div className="flex flex-col items-center gap-4 md:flex-row">
            {isSyncing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2"
              >
                <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-700" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700">Syncing…</span>
              </motion.div>
            )}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 rounded-[2.2rem] border border-zinc-200 bg-white p-2.5 pr-8 shadow-sm shadow-zinc-900/5"
            >
               <div className="rounded-[1.6rem] bg-green-900 p-3.5 text-white shadow-lg shadow-zinc-900/20">
                  <IndianRupee size={22} strokeWidth={2.5} />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total sales</p>
                  <p className="text-2xl font-black text-green-900">₹{totalRevenue.toLocaleString("en-IN")}</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                    Paid &amp; closed orders (all time)
                  </p>
               </div>
            </motion.div>
          </div>
        </header>

        {/* --- 2. STATS GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Live Inventory" 
            value={products.length} 
            icon={Package} 
            color="zinc" 
            trend="+12%" 
          />
          <StatCard 
            label="Today's Orders" 
            value={todayOrdersCount} 
            icon={ShoppingBag} 
            color="emerald" 
            trend="+28%" 
          />
          <StatCard 
            label="Active Queue" 
            value={activeOrders} 
            icon={Activity} 
            color="amber" 
            trend="Live" 
          />
          <StatCard 
            label="Stock Alerts" 
            value={totalUnavailableCount} 
            icon={AlertTriangle} 
            color="rose" 
            trend={totalUnavailableCount > 0 ? "Critical" : "All Good"} 
            isAlert={totalUnavailableCount > 0}
          />
        </div>

        {/* --- 2.5 MINI TABLES GRID --- */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-3 text-xl font-black text-zinc-900">
              <TableIcon className="text-zinc-700" size={24} />
              Live Table Status
            </h2>
            {tablesFeatureEnabled && (
              <Link
                to="/admin/tables"
                className="border-b-2 border-zinc-900 pb-1 text-[10px] font-black uppercase tracking-widest text-zinc-800"
              >
                View all tables
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="h-3 w-3 rounded-full border border-rose-500 bg-rose-300" />
              <span>Busy</span>
            </div>
            {reservationsEnabled && (
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-3 w-3 rounded-full border border-amber-400 bg-amber-200" />
                <span>Reserved</span>
              </div>
            )}
            {billRequestEnabled && (
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-3 w-3 rounded-full border border-emerald-700 bg-emerald-600" />
                <span>Bill requested</span>
              </div>
            )}
            {waiterCallEnabled && (
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-3 w-3 rounded-full border border-indigo-700 bg-indigo-600" />
                <span>Waiter call</span>
              </div>
            )}
            {billRequestEnabled && waiterCallEnabled && (
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-3 w-3 rounded-full border border-purple-700 bg-purple-600" />
                <span>Bill + call</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-700">
              <span className="h-3 w-3 rounded-full border border-emerald-600 bg-emerald-500" />
              <span>Free</span>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {tables.map((table) => {
              const occupied = isOccupied(table.id);
              const reserved = reservationsEnabled && isReserved(table.id);
              const alert = tableAlerts[`table-${table.id}`];
              const isBillRequested = billRequestEnabled && alert && alert.bill;
              const isWaiterCalled = waiterCallEnabled && alert && alert.waiter;
              const hasAlert = isBillRequested || isWaiterCalled;

              const tileShell =
                isBillRequested
                  ? "bg-linear-to-br from-emerald-50 to-white border-emerald-200 shadow-sm shadow-emerald-100/50 ring-2 ring-emerald-400/90 ring-offset-1"
                  : hasAlert
                    ? "bg-linear-to-br from-indigo-50 to-white border-indigo-200 shadow-sm shadow-indigo-100/50 ring-2 ring-indigo-400/90 ring-offset-1"
                    : occupied
                      ? "bg-linear-to-br from-rose-50 to-white border-rose-200 shadow-rose-100/50"
                      : reserved
                        ? "bg-linear-to-br from-amber-50 to-white border-amber-200 shadow-amber-100/50"
                        : "border-slate-100 bg-white shadow-sm hover:border-slate-300";
              const idMuted =
                isBillRequested
                  ? "text-emerald-600/80"
                  : hasAlert
                    ? "text-indigo-600/80"
                    : occupied
                      ? "text-rose-600/80"
                      : reserved
                        ? "text-amber-600/80"
                        : "text-slate-400";
              const iconWrap =
                isBillRequested && isWaiterCalled
                  ? "text-purple-600"
                  : isBillRequested
                    ? "text-emerald-600"
                    : isWaiterCalled
                      ? "text-indigo-600"
                      : occupied
                        ? "text-rose-500"
                        : reserved
                          ? "text-amber-600"
                          : "text-emerald-500";
              const statusLabel =
                isBillRequested && isWaiterCalled
                  ? "text-purple-800"
                  : isBillRequested
                    ? "text-emerald-800"
                    : isWaiterCalled
                      ? "text-indigo-800"
                      : occupied
                        ? "text-rose-800"
                        : reserved
                          ? "text-amber-800"
                          : "text-emerald-700";

              return (
                <motion.div
                  key={table.id}
                  onClick={() => {
                    if (!tablesFeatureEnabled) return;
                    navigate(`/admin/order-summary?table=${table.id}`);
                  }}
                  className={`relative flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border transition-all text-slate-900 ${tileShell} ${
                    tablesFeatureEnabled ? "cursor-pointer" : "cursor-default"
                  }`}
                  title={!tablesFeatureEnabled ? "Open full tables from Super Admin to enable Tables & QR" : undefined}
                >
                  <div className={`text-[10px] font-black uppercase tracking-tighter ${idMuted}`}>
                    T{table.id}
                  </div>

                  <div className={`flex items-center justify-center gap-1 ${iconWrap}`}>
                    {isBillRequested && isWaiterCalled ? (
                      <>
                        <Receipt size={14} strokeWidth={2.5} />
                        <HandHelping size={14} />
                      </>
                    ) : isBillRequested ? (
                      <Receipt size={18} strokeWidth={2.5} />
                    ) : isWaiterCalled ? (
                      <BellRing size={16} />
                    ) : occupied ? (
                      <LayoutGrid size={16} />
                    ) : reserved ? (
                      <CalendarCheck size={16} />
                    ) : (
                      <Circle size={6} fill="currentColor" className="text-emerald-500" />
                    )}
                  </div>

                  <div className={`text-[8px] font-black uppercase tracking-[0.1em] ${statusLabel}`}>
                    {isBillRequested && isWaiterCalled ? "BILL + CALL" : isBillRequested ? "BILL" : isWaiterCalled ? "CALL" : occupied ? "BUSY" : reserved ? "RES" : "FREE"}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* --- 3. ANALYTICS VIEW: BEST SELLERS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[3rem] border border-zinc-200 bg-white p-10 shadow-xl shadow-zinc-900/5 lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-zinc-900 p-3 text-white ring-1 ring-zinc-900/10">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-zinc-900">Best Sellers</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Performance volume</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {bestSellers.length > 0 ? (
                bestSellers.map((item, idx) => (
                  <div key={item.name} className="space-y-3">
                    <div className="flex items-end justify-between">
                      <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-zinc-800">
                        {idx === 0 && <Crown size={14} className="text-amber-500" />}
                        {item.name}
                      </span>
                      <span className="text-xs font-black text-zinc-500">{item.qty} sales</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full border border-zinc-100 bg-zinc-50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.qty / bestSellers[0].qty) * 100}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className={`h-full rounded-full ${idx === 0 ? 'bg-indigo-600' : 'bg-slate-900'}`}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Waiting for sales data…
                </div>
              )}
            </div>
          </motion.div>

          {/* Performance Highlight Card */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="relative flex flex-col justify-between overflow-hidden rounded-[3rem] bg-zinc-900 p-10 text-white shadow-2xl shadow-zinc-900/30"
          >
            <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
               <Award size={240} />
            </div>
            
            <div className="relative z-10">
               <div className="h-14 w-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 mb-8">
                 <Sparkles size={28} />
               </div>
               <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Most popular item</h3>
               {bestSellers[0] ? (
                 <>
                   <p className="text-5xl font-black tracking-tighter leading-none mb-4">{bestSellers[0].name}</p>
                   <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-zinc-200">
                     <TrendingUp size={14} />
                     <span className="text-xs font-bold uppercase tracking-widest">{bestSellers[0].qty} units sold</span>
                   </div>
                 </>
               ) : (
                 <p className="text-xl font-bold">Collecting Data...</p>
               )}
            </div>

            <Link to="/admin/products" className="relative z-10 flex items-center justify-center gap-3 rounded-2xl bg-white py-5 font-black uppercase tracking-[0.2em] text-zinc-900 text-[10px] transition-all hover:bg-zinc-100">
               Update catalog <ArrowUpRight size={16} />
            </Link>
          </motion.div>
        </div>

        {/* --- 4. INVENTORY & FISCAL HEALTH SECTION --- */}
        <div className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-black text-zinc-900 md:text-3xl">
            <ShieldCheck className="text-zinc-700" size={28} />
            Inventory &amp; Fiscal Health
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Stock Distribution */}
            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="group flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-900 p-8 text-white shadow-2xl shadow-zinc-900/20 transition-all duration-300 hover:bg-white hover:text-zinc-900 lg:col-span-5"
            >
              <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-700">
                Current stock status
              </h3>
              
              <div className="h-[260px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      innerRadius={70} 
                      outerRadius={95} 
                      paddingAngle={6} 
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-3 mt-6">
                {pieData.map((d, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors group-hover:border-zinc-200 group-hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-sm font-bold">{d.name}</span>
                    </div>
                    <span className="text-base font-black group-hover:text-zinc-900">{d.value}</span>
                  </div>
                ))}
              </div>

              {/* Critical Products Alert */}
              {criticalProducts.length > 0 && (
                <div className="mt-8 bg-gradient-to-r from-rose-50 to-rose-100/40 border border-rose-200 rounded-3xl p-6 w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-rose-600" size={20} />
                    <h4 className="font-bold text-rose-800">Critical Products Alert</h4>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    {criticalProducts.map(p => (
                      <div key={p._id || p.id} className="flex justify-between items-center font-medium">
                        <span className="text-zinc-800">{p.name}</span>
                        <span className={`${
                          p.issue === "Out of Stock" ? 'text-rose-700' : 'text-amber-700'
                        }`}>
                          {p.issue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Financial Ledger */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-900/5 md:p-10 lg:col-span-7">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8">
                <div>
                  <h3 className="text-base md:text-lg font-black flex items-center gap-3">
                    <History className="text-zinc-600" size={20} />
                    Financial ledger
                  </h3>
                  <p className="mt-1 text-xs text-zinc-600 md:text-sm">
                    Showing {products.length} products
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleExport('xlsx')} 
                    className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-black uppercase text-zinc-800 transition-all hover:border-zinc-400 hover:bg-white md:text-sm"
                  >
                    <FileSpreadsheet size={16}/> Excel
                  </button>
                  <button 
                    onClick={() => handleExport('pdf')} 
                    className="flex items-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-900 px-5 py-3 text-xs font-black uppercase text-white transition-all hover:bg-zinc-800 md:text-sm"
                  >
                    <FileText size={16}/> PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="pb-4 text-xs font-black uppercase tracking-wider text-zinc-500">Product</th>
                      <th className="pb-4 text-xs font-black uppercase tracking-wider text-zinc-500">Price</th>
                      <th className="pb-4 text-xs font-black uppercase tracking-wider text-zinc-500">Tax ({GST_TOTAL_PCT_LABEL})</th>
                      <th className="pb-4 text-xs font-black uppercase tracking-wider text-zinc-500">Total</th>
                      <th className="pb-4 text-xs font-black uppercase tracking-wider text-zinc-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.slice(0, 10).map((p, i) => {
                      const unitPrice = Number(p.price) || 0;
                      const unitTax = taxOnTaxableAmount(unitPrice);
                      const lineTotal = unitPrice + unitTax;
                      return (
                      <tr key={i} className="group transition-colors hover:bg-zinc-50">
                        <td className="py-4 font-medium text-sm">{p.name}</td>
                        <td className="py-4 font-black text-zinc-900">₹{p.price?.toLocaleString() || "—"}</td>
                        <td className="py-4 text-sm text-zinc-600">₹{unitTax.toFixed(0)}</td>
                        <td className="py-4 text-sm font-black text-zinc-900">₹{lineTotal.toLocaleString()}</td>
                        <td className="py-4">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider ${
                            p.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {p.isAvailable ? 'Active' : 'Out of Stock'}
                          </span>
                        </td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* --- 5. INVENTORY STATUS SECTION --- */}
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group"
        >
          <div className="absolute -inset-1 rounded-[3rem] bg-gradient-to-r from-zinc-400/20 to-zinc-600/20 blur opacity-40 transition duration-1000 group-hover:opacity-60"></div>
          
          <div className="relative overflow-hidden rounded-[3rem] border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5">
            {criticalProducts.length > 0 ? (
              <StockAlertSection items={criticalProducts} />
            ) : (
              <EmptyStateSection totalProducts={products.length} totalSubitems={subitems.length} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- INTERNAL COMPONENTS (REMAINING UNCHANGED) ---------- */

const StatCard = ({ label, value, icon: Icon, color, trend, isAlert }) => {
  const themes = {
    zinc: { bg: "bg-zinc-50", text: "text-zinc-700", accent: "bg-zinc-900", glow: "group-hover:shadow-zinc-900/10" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", accent: "bg-emerald-600", glow: "group-hover:shadow-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", accent: "bg-amber-500", glow: "group-hover:shadow-amber-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", accent: "bg-rose-500", glow: "group-hover:shadow-rose-100" },
  };
  const theme = themes[color];

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className={`group relative rounded-[2.5rem] border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-900/5 transition-all duration-500 hover:shadow-2xl ${theme.glow}`}
    >
      <div className={`absolute top-6 right-6 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}>
        <Icon size={100} strokeWidth={1} />
      </div>
      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <div className={`p-4 rounded-2xl ${theme.bg} ${theme.text} transition-transform duration-500 group-hover:scale-110 shadow-sm`}>
            <Icon size={28} strokeWidth={2} />
          </div>
          <div className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
            isAlert ? "animate-pulse bg-rose-500 text-white" : "border border-zinc-200 bg-zinc-50 font-bold text-zinc-600"
          }`}>
            {trend}
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <h3 className="text-4xl font-black tracking-tighter text-zinc-900">{value}</h3>
            <ArrowUpRight size={18} className="text-zinc-300 transition-colors group-hover:text-zinc-500" />
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
        </div>
      </div>
      <div className={`absolute bottom-6 left-8 right-8 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 ${theme.accent}`} />
    </motion.div>
  );
};

const StockAlertSection = ({ items }) => (
  <div className="flex flex-col lg:flex-row">
    <div className="lg:w-1/3 p-12 bg-rose-500 text-white flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10">
         <AlertTriangle size={180} strokeWidth={1} />
      </div>
      <div className="space-y-6 relative z-10">
        <div className="h-16 w-16 rounded-[1.5rem] bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-4xl font-black tracking-tighter leading-[0.9]">Critical <br/> Inventory</h3>
        <p className="text-rose-100 font-medium text-lg">{items.length} items require immediate restock.</p>
      </div>
      <Link to="/admin/products" className="mt-10 flex items-center gap-3 font-black uppercase text-[10px] tracking-[0.2em] bg-white text-rose-600 w-fit px-8 py-5 rounded-2xl shadow-lg">
        Open Catalog <ArrowUpRight size={16} />
      </Link>
    </div>
    <div className="flex-1 p-8 lg:p-12 space-y-4 max-h-[600px] overflow-y-auto bg-slate-50/30">
      {items.map((item, idx) => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} key={item.id} className="flex items-center justify-between p-5 bg-white rounded-[2rem] border border-slate-100 group/item transition-all">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-[1.2rem] overflow-hidden grayscale group-hover/item:grayscale-0 transition-all shadow-inner bg-slate-100 flex items-center justify-center">
              {item.image ? (
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package className="text-slate-300" size={32} />
              )}
            </div>
            <div>
              <p className="font-black text-slate-800 text-lg tracking-tight group-hover/item:text-rose-600">{item.name}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                Type: {item.type === 'subitem' ? 'Sub-item' : 'Product'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <div className="h-2 w-2 rounded-full bg-rose-500 mb-2 animate-pulse" />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Out of Stock</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const EmptyStateSection = ({ totalProducts, totalSubitems }) => (
  <div className="flex flex-col lg:flex-row min-h-[500px]">
    <div className="relative flex w-full flex-col justify-between overflow-hidden bg-green-900 p-12 text-white lg:w-1/2">
      <div className="absolute right-0 top-0 p-8 opacity-10">
         <ShieldCheck size={280} strokeWidth={1} />
      </div>
      <div className="relative z-10 space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-xl">
          <CheckCircle2 size={42} />
        </div>
        <h3 className="text-6xl font-black leading-[0.8] tracking-tighter">Systems <br/> nominal</h3>
        <p className="max-w-sm text-xl font-bold leading-relaxed tracking-tight text-zinc-300 drop-shadow-sm">All {totalProducts + totalSubitems} items are synchronized across inventory.</p>
      </div>
      <div className="relative z-10 flex gap-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Products</p>
              <p className="text-2xl font-black">{totalProducts}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sub-items</p>
              <p className="text-2xl font-black">{totalSubitems}</p>
          </div>
      </div>
    </div>
    <div className="group flex flex-1 flex-col items-center justify-center space-y-8 bg-white p-12 text-center">
      <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-zinc-200/60 blur-[100px] opacity-40" />
          <div className="relative flex h-40 w-40 rotate-12 items-center justify-center rounded-[3rem] border border-zinc-200 bg-zinc-50 transition-all duration-700 group-hover:rotate-0">
             <Box size={80} className="text-zinc-300 transition-colors group-hover:text-zinc-500" strokeWidth={1} />
          </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-3xl font-black tracking-tighter text-zinc-900">Inventory synchronized</h4>
        <p className="mx-auto max-w-xs font-medium text-zinc-500">No critical alerts. All stocks and variations are active.</p>
      </div>
      <div className="h-[2px] w-20 bg-zinc-200" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Last check: just now</p>
    </div>
  </div>
);