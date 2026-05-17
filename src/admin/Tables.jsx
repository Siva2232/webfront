import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "../context/OrderContext";
import { useUI } from "../context/UIContext";
import { useTheme } from "../context/ThemeContext";
import { getPlanLimitsFromBranding } from "../utils/planLimits";
import API from "../api/axios";
import { fetchTablesCoalesced, parseTablesPayload } from "../api/fetchTablesCoalesced";
import { getCurrentRestaurantId, tenantKey } from "../utils/tenantCache";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  LayoutGrid, 
  LogOut, 
  Users, 
  Circle, 
  ChevronRight,
  Trash2,
  UtensilsCrossed,
  Loader2,
  CalendarCheck,
  BellRing,
  Receipt,
  MapPin,
  FolderPlus,
  Tag,
} from "lucide-react";
import toast from "react-hot-toast";
import { getTableSessionTiming } from "./utils/tableOrderTime";
import { useOrderTimeTick } from "./hooks/useOrderTimeTick";
import TableOrderTimeBadge from "./components/TableOrderTimeBadge";

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeAreaFilter, setActiveAreaFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [newTableId, setNewTableId] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableCategoryId, setNewTableCategoryId] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [isSavingTable, setIsSavingTable] = useState(false);
  const [isSavingArea, setIsSavingArea] = useState(false);

  const { orders } = useOrders();
  const { reservations, notifications, markNotificationAsRead } = useUI();
  const { features, branding } = useTheme();
  const reservationsEnabled = features.reservations !== false;
  const billRequestEnabled = features.billRequest !== false;
  const waiterCallEnabled = features.waiterCall !== false;
  const [activeOrders, setActiveOrders] = useState({});
  const [reservedTables, setReservedTables] = useState({});
  const [tableAlerts, setTableAlerts] = useState({});
  const [deleteModal, setDeleteModal] = useState({ show: false, tableId: null });

  const navigate = useNavigate();
  const orderTimeNow = useOrderTimeTick(orders);

  // Sync with live notifications (Waiter Call / Bill Request)
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

  const applyTablesPayload = (payload) => {
    const { tables: nextTables, categories: nextCategories } =
      parseTablesPayload(payload);
    setTables(nextTables);
    setCategories(nextCategories);
    const rid = getCurrentRestaurantId();
    localStorage.setItem(
      tenantKey("restaurant_tables_config", rid),
      JSON.stringify(nextTables)
    );
    localStorage.setItem(
      tenantKey("restaurant_table_areas", rid),
      JSON.stringify(nextCategories)
    );
  };

  // Fetch from Backend
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setIsLoading(true);
        const payload = await fetchTablesCoalesced();
        applyTablesPayload(payload);
      } catch (err) {
        console.error("Failed to fetch tables", err);
        toast.error("Cloud sync failed. Using local fallback.");
        const rid = getCurrentRestaurantId();
        try {
          const saved = localStorage.getItem(tenantKey("restaurant_tables_config", rid));
          const savedAreas = localStorage.getItem(tenantKey("restaurant_table_areas", rid));
          const parsed = saved ? JSON.parse(saved) : null;
          const parsedAreas = savedAreas ? JSON.parse(savedAreas) : [];
          applyTablesPayload({
            tables: Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed?.tables)
                ? parsed.tables
                : [],
            categories: Array.isArray(parsedAreas)
              ? parsedAreas
              : Array.isArray(parsed?.categories)
                ? parsed.categories
                : [],
          });
        } catch {
          setTables([]);
          setCategories([]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchTables();
  }, []);

  // Sync with live orders
  useEffect(() => {
    const liveMap = {};
    orders.forEach(o => {
      if (o.status && o.status !== "Closed") {
        liveMap[`table-${o.table}`] = true;
      }
    });
    setActiveOrders(liveMap);
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
        
        // Block table if reservation is within the next hour or already started
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

  const releaseTable = (e, tableId) => {
    e.stopPropagation();
    const updated = { ...activeOrders };
    delete updated[`table-${tableId}`];
    setActiveOrders(updated);
    toast.success(`Table ${tableId} checked out`);
  };

  const tableList = Array.isArray(tables) ? tables : [];
  const { maxTables: tableCap } = getPlanLimitsFromBranding(branding);
  const atTableLimit = tableList.length >= tableCap;

  const addNewTable = () => {
    if (atTableLimit) {
      toast.error(
        `Table limit reached (${tableCap} max). Upgrade your plan or remove a table.`,
      );
      return;
    }
    setShowAddModal(true);
    setNewTableId("");
    setNewTableCapacity(4);
    setNewTableCategoryId(
      activeAreaFilter !== "all" && activeAreaFilter !== "uncategorized"
        ? activeAreaFilter
        : categories[0]?.id || ""
    );
  };

  const createArea = async () => {
    const name = newAreaName.trim();
    if (!name) {
      toast.error("Enter an area name (e.g. Floor, Outdoor)");
      return;
    }
    setIsSavingArea(true);
    try {
      const { data } = await API.post("/tables/categories", { name });
      toast.success(`Area "${data.name}" created`);
      setNewAreaName("");
      const payload = await fetchTablesCoalesced();
      applyTablesPayload(payload);
      setActiveAreaFilter(data.id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create area");
    } finally {
      setIsSavingArea(false);
    }
  };

  const removeArea = async (areaId, areaName) => {
    try {
      await API.delete(`/tables/categories/${areaId}`);
      toast.success(`Area "${areaName}" removed`);
      if (activeAreaFilter === areaId) setActiveAreaFilter("all");
      const payload = await fetchTablesCoalesced();
      applyTablesPayload(payload);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove area");
    }
  };

  const submitNewTable = async () => {
    const tableId = Number(newTableId);
    if (!Number.isInteger(tableId) || tableId <= 0) {
      toast.error("Enter a valid numeric table Number");
      return;
    }

    if (tableList.some((t) => t.id === tableId)) {
      toast.error("Table Number already exists");
      return;
    }

    if (tableList.length >= tableCap) {
      toast.error(
        `Table limit reached (${tableCap} max). Upgrade your plan or remove a table.`,
      );
      return;
    }

    setIsSavingTable(true);

    const newTable = {
      id: tableId,
      capacity: Number(newTableCapacity) || 4,
      categoryId: newTableCategoryId || null,
    };
    const prevTables = [...tableList];
    setTables((prev) => [...prev, newTable]);

    try {
      await API.post("/tables", newTable);
      toast.success(`Table ${tableId} created and synced`);
      const payload = await fetchTablesCoalesced();
      applyTablesPayload(payload);
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to save table", err);
      toast.error(err.response?.data?.message || "Failed to save to cloud");
      setTables(prevTables);
    } finally {
      setIsSavingTable(false);
    }
  };

  const removeTable = (e, tableId) => {
    e.stopPropagation();
    setDeleteModal({ show: true, tableId });
  };

  const confirmRemoveTable = async () => {
    const tableId = deleteModal.tableId;

    const prevTables = [...tableList];
    setTables((prev) => (Array.isArray(prev) ? prev : []).filter((t) => t.id !== tableId));
    setDeleteModal({ show: false, tableId: null });

    try {
      await API.delete(`/tables/${tableId}`);
      toast.success(`Table ${tableId} removed permanently`);
      const payload = await fetchTablesCoalesced();
      applyTablesPayload(payload);
    } catch (err) {
      console.error('Failed to delete table', err);
      toast.error('Failed to sync deletion');
      setTables(prevTables);
    }
  };

  const cancelRemoveTable = () => {
    setDeleteModal({ show: false, tableId: null });
  };

  const isOccupied = (tableId) => !!activeOrders[`table-${tableId}`];
  const isReserved = (tableId) => !!reservedTables[`table-${tableId}`];

  const clearTableAlerts = async (e, tableId) => {
    e.stopPropagation();
    const alert = tableAlerts[`table-${tableId}`];
    if (alert && alert.ids.length > 0) {
      try {
        await Promise.all(alert.ids.map(id => markNotificationAsRead(id)));
        toast.success(`Cleared alerts for Table ${tableId}`);
      } catch (err) {
        console.error("Failed to clear alerts:", err);
      }
    }
  };

  const isAdmin = localStorage.getItem("isAdminLoggedIn") === "true";
  const isWaiter = localStorage.getItem("isWaiterLoggedIn") === "true";
  const canManageTables = isAdmin || isWaiter;

  const goToMenu = (tableId) => {
    if (isWaiter) {
      navigate(`/waiter/products?table=${tableId}`);
    } else if (isAdmin) {
      navigate(`/admin/order-summary?table=${tableId}`);
    } else {
      navigate(`/choose-mode?table=${tableId}`);
    }
  };

  const tablesForFilter = tableList.filter((t) => {
    if (activeAreaFilter === "all") return true;
    if (activeAreaFilter === "uncategorized") return !t.categoryId;
    return t.categoryId === activeAreaFilter;
  });

  const areaSections = [];
  if (activeAreaFilter === "all") {
    categories.forEach((cat) => {
      const inArea = tableList.filter((t) => t.categoryId === cat.id);
      if (inArea.length) {
        areaSections.push({ id: cat.id, name: cat.name, tables: inArea });
      }
    });
    const uncategorized = tableList.filter((t) => !t.categoryId);
    if (uncategorized.length) {
      areaSections.push({
        id: "uncategorized",
        name: "Uncategorized",
        tables: uncategorized,
      });
    }
  } else {
    const label =
      activeAreaFilter === "uncategorized"
        ? "Uncategorized"
        : categories.find((c) => c.id === activeAreaFilter)?.name || "Area";
    areaSections.push({ id: activeAreaFilter, name: label, tables: tablesForFilter });
  }

  const renderTableCard = (table) => {
    const occupied = isOccupied(table.id);
    const reserved = reservationsEnabled && isReserved(table.id);
    const resInfo = reserved ? reservedTables[`table-${table.id}`] : null;
    const alert = tableAlerts[`table-${table.id}`];
    const isBillRequested = billRequestEnabled && alert && alert.bill;
    const isWaiterCalled = waiterCallEnabled && alert && alert.waiter;
    const hasAlert = isBillRequested || isWaiterCalled;
    const orderTiming = getTableSessionTiming(table.id, orders, orderTimeNow);

    const footerLabel = hasAlert
      ? isBillRequested && isWaiterCalled
        ? "Bill + Call"
        : isBillRequested
          ? "Bill"
          : "Call"
      : occupied
        ? "Order"
        : reserved
          ? resInfo?.customerName || "Reserved"
          : "Open";

    return (
      <motion.div
        key={table.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        onClick={() => goToMenu(table.id)}
        className={`group relative flex flex-col rounded-2xl border p-3 sm:p-4 cursor-pointer overflow-hidden transition-all min-h-[8.5rem]
          ${isBillRequested
            ? "bg-linear-to-br from-emerald-50 to-white border-emerald-200 ring-1 ring-emerald-300/50"
            : hasAlert
              ? "bg-linear-to-br from-indigo-50 to-white border-indigo-200 ring-1 ring-indigo-300/50"
              : occupied
                ? "bg-linear-to-br from-rose-50 to-white border-rose-200"
                : reserved
                  ? "bg-linear-to-br from-amber-50 to-white border-amber-200"
                  : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-md"}`}
      >
        <div className="flex justify-between items-start gap-1.5 mb-2.5">
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase border max-w-[75%] min-w-0
            ${isBillRequested && isWaiterCalled
              ? "bg-purple-600 text-white border-purple-600"
              : isBillRequested
                ? "bg-emerald-600 text-white border-emerald-600"
                : isWaiterCalled
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : occupied
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : reserved
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
          >
            <Circle size={6} fill="currentColor" className="shrink-0" />
            <span className="truncate">
              {isBillRequested && isWaiterCalled
                ? "BILL+CALL"
                : isBillRequested
                  ? "BILL"
                  : isWaiterCalled
                    ? "CALL"
                    : occupied
                      ? "BUSY"
                      : reserved
                        ? "RES"
                        : "FREE"}
            </span>
          </div>
          <div className="flex gap-0.5 shrink-0">
            {hasAlert && (
              <button
                onClick={(e) => clearTableAlerts(e, table.id)}
                className={`p-1 rounded-md ${isBillRequested ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"}`}
                title="Dismiss Alert"
              >
                <Circle size={10} fill="currentColor" />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={(e) => removeTable(e, table.id)}
                className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md opacity-0 group-hover:opacity-100"
                title="Delete Table"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-1">
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center
            ${isBillRequested && isWaiterCalled
              ? "bg-purple-600 text-white"
              : isBillRequested
                ? "bg-emerald-600 text-white"
                : isWaiterCalled
                  ? "bg-indigo-600 text-white"
                  : occupied
                    ? "bg-rose-500 text-white"
                    : reserved
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white"}`}
          >
            {isBillRequested && isWaiterCalled ? (
              <Receipt size={18} strokeWidth={2.2} />
            ) : isBillRequested ? (
              <Receipt size={20} strokeWidth={2.5} />
            ) : isWaiterCalled ? (
              <BellRing size={18} strokeWidth={2.5} />
            ) : reserved && !occupied ? (
              <CalendarCheck size={18} strokeWidth={1.8} />
            ) : (
              <LayoutGrid size={18} strokeWidth={1.8} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Table</p>
            <h3 className={`text-2xl sm:text-3xl font-black leading-tight tracking-tight ${hasAlert ? "text-indigo-900" : "text-slate-900"}`}>
              {table.id < 10 ? `0${table.id}` : table.id}
            </h3>
            {table.categoryName && (
              <p className="text-[8px] font-bold uppercase text-slate-400 truncate flex items-center gap-0.5 mt-0.5">
                <MapPin size={10} /> {table.categoryName}
              </p>
            )}
          </div>
        </div>

        <div className="mt-1.5 h-[34px] w-full shrink-0">
          {orderTiming ? (
            <TableOrderTimeBadge timing={orderTiming} variant="table" />
          ) : null}
        </div>

        <div
          className={`mt-2 pt-2.5 flex items-center justify-between border-t border-slate-100 gap-1.5
          ${hasAlert ? "text-indigo-600" : occupied ? "text-rose-500" : reserved ? "text-amber-500" : "text-slate-400"}`}
        >
          <div className="flex items-center gap-1 min-w-0">
            <Users size={14} className="shrink-0" />
            <span className="text-xs font-bold">{table.capacity}</span>
            <span className="text-[10px] font-black uppercase truncate italic">{footerLabel}</span>
          </div>
          {occupied ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                releaseTable(e, table.id);
              }}
              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl shrink-0 relative z-20"
              title="Release Table"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <ChevronRight size={16} className="shrink-0 opacity-50" />
          )}
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-slate-400" size={48} />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading Floor Plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8 font-sans">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Live Floor Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">
            Floor <span className="text-slate-300">Plan</span>
          </h1>
        </div>

        {canManageTables && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAreaModal(true)}
              className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-white border border-slate-200 text-slate-700 hover:border-slate-400 transition-all active:scale-95 shadow-sm"
            >
              <FolderPlus size={18} />
              Manage Areas
            </button>
            <button
              type="button"
              disabled={atTableLimit}
              title={
                atTableLimit
                  ? `Plan limit: ${tableCap} tables. Upgrade or remove a table to add more.`
                  : undefined
              }
              onClick={addNewTable}
              className={`group flex items-center gap-2 px-5 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-xl ${
                atTableLimit
                  ? "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none"
                  : "bg-slate-900 text-white hover:bg-orange-600 hover:shadow-orange-200/40"
              }`}
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              Add Table
            </button>
          </div>
        )}
      </div>

      {/* Status legend */}
      <div className="max-w-7xl mx-auto mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-black">
        <span className="flex items-center gap-2 text-slate-700"><span className="w-3 h-3 rounded-full bg-rose-300 border border-rose-500"></span>Busy</span>
        {reservationsEnabled && (
          <span className="flex items-center gap-2 text-slate-700"><span className="w-3 h-3 rounded-full bg-amber-200 border border-amber-400"></span>Reserved</span>
        )}
        {billRequestEnabled && (
          <span className="flex items-center gap-2 text-slate-700"><span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-700"></span>Bill Requested</span>
        )}
        {waiterCallEnabled && (
          <span className="flex items-center gap-2 text-slate-700"><span className="w-3 h-3 rounded-full bg-indigo-600 border border-indigo-700"></span>Waiter Called</span>
        )}
        {billRequestEnabled && waiterCallEnabled && (
          <span className="flex items-center gap-2 text-slate-700"><span className="w-3 h-3 rounded-full bg-purple-600 border border-purple-700"></span>Bill + Call</span>
        )}
        <span className="flex items-center gap-2 text-slate-700"><span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></span>Free</span>
      </div>

      {/* Area filter tabs */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveAreaFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeAreaFilter === "all"
              ? "bg-slate-900 text-white shadow-lg"
              : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          All ({tableList.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveAreaFilter(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeAreaFilter === cat.id
                ? "bg-slate-900 text-white shadow-lg"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <MapPin size={12} />
            {cat.name} ({tableList.filter((t) => t.categoryId === cat.id).length})
          </button>
        ))}
        {tableList.some((t) => !t.categoryId) && (
          <button
            type="button"
            onClick={() => setActiveAreaFilter("uncategorized")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeAreaFilter === "uncategorized"
                ? "bg-slate-900 text-white shadow-lg"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Uncategorized ({tableList.filter((t) => !t.categoryId).length})
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto space-y-10">
        {areaSections.map((section) => (
          <section key={section.id}>
            <div className="flex items-center gap-2 mb-4">
              <Tag size={16} className="text-slate-400" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-600">
                {section.name}
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {section.tables.length} table{section.tables.length !== 1 ? "s" : ""}
              </span>
            </div>
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 items-start gap-3 sm:gap-4">
              <AnimatePresence mode="popLayout">
                {section.tables.map((table) => renderTableCard(table))}
              </AnimatePresence>
            </motion.div>
          </section>
        ))}

        {tableList.length > 0 && areaSections.length === 0 && (
          <p className="text-center text-slate-500 text-sm font-medium py-12">
            No tables in this area. Try another filter or add a table.
          </p>
        )}

        {/* Empty State */}
        {tableList.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 md:py-28 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white/40"
          >
            <UtensilsCrossed size={50} className="text-slate-200 mb-6" />
            <h2 className="text-xl font-black text-slate-700 mb-2">No Tables Configured Yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm text-center text-sm">
              Start building your floor plan by adding your first dining station.
            </p>
            {canManageTables && (
              <button
                type="button"
                disabled={atTableLimit}
                title={
                  atTableLimit
                    ? `Plan limit: ${tableCap} tables.`
                    : undefined
                }
                onClick={addNewTable}
                className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl ${
                  atTableLimit
                    ? "cursor-not-allowed bg-slate-300 text-slate-500"
                    : "bg-slate-900 text-white hover:bg-orange-600"
                }`}
              >
                <Plus size={18} /> Add First Table
              </button>
            )}
          </motion.div>
        )}

        {/* Add Table Modal */}
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black">Add Table</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Table ID</label>
                  <input
                    type="number"
                    value={newTableId}
                    onChange={(e) => setNewTableId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg outline-none border-slate-200"
                    placeholder="Enter numeric table number"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Capacity</label>
                  <input
                    type="number"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg outline-none border-slate-200"
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Area (optional)</label>
                  <select
                    value={newTableCategoryId}
                    onChange={(e) => setNewTableCategoryId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg outline-none border-slate-200 bg-white"
                  >
                    <option value="">No area</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Create areas like Floor or Outdoor via Manage Areas.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600"
                >Cancel</button>
                <button
                  onClick={submitNewTable}
                  disabled={isSavingTable}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-700 disabled:opacity-50"
                >
                  {isSavingTable ? "Saving..." : "Add Table"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Manage Areas Modal */}
        {showAreaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <MapPin size={20} /> Table Areas
                </h2>
                <button
                  onClick={() => setShowAreaModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Name your dining zones (e.g. Floor, Outdoor, VIP). Assign tables when adding or editing them.
              </p>

              <div className="flex gap-2 mb-5">
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createArea()}
                  placeholder="e.g. Floor, Outdoor, Terrace"
                  className="flex-1 px-3 py-2 border rounded-lg border-slate-200 outline-none"
                />
                <button
                  type="button"
                  onClick={createArea}
                  disabled={isSavingArea}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black text-xs uppercase disabled:opacity-50"
                >
                  {isSavingArea ? "..." : "Add"}
                </button>
              </div>

              {categories.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-6">No areas yet. Add your first one above.</p>
              ) : (
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="font-bold text-slate-800">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {tableList.filter((t) => t.categoryId === cat.id).length} tables
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => removeArea(cat.id, cat.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Remove area"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteModal.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-4 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Delete Table</h3>
                    <p className="text-sm text-slate-500">Confirm removing table {deleteModal.tableId} permanently.</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={confirmRemoveTable}
                    className="flex-1 bg-rose-600 text-white py-2 rounded-xl font-bold hover:bg-rose-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={cancelRemoveTable}
                    className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-bold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}