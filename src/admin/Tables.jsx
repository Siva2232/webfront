import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "../context/OrderContext";
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
  QrCode
} from "lucide-react";

export default function Tables() {
  const navigate = useNavigate();

  // ── 1. Physical Tables Configuration (persistent) ─────────────────────────
  const [tables, setTables] = useState(() => {
    const saved = localStorage.getItem("restaurant_tables_config");
    return saved ? JSON.parse(saved) : [
      { id: 1, capacity: 2 },
      { id: 2, capacity: 4 },
      { id: 3, capacity: 4 },
      { id: 4, capacity: 6 },
      { id: 5, capacity: 2 },
      { id: 6, capacity: 4 },
      { id: 7, capacity: 8 },
    ];
  });

  // ── 2. Active Orders / Occupancy Status (persistent) ─────────────────────
  // at first we store occupancy locally so the floor plan still works even when
  // there is no server (offline demo mode). however we also listen to the
  // order context and mark tables occupied when there are live orders for them.
  const { orders } = useOrders();
  const [activeOrders, setActiveOrders] = useState(() => {
    const saved = localStorage.getItem("active_orders");
    return saved ? JSON.parse(saved) : {};
  });

  // Save tables config whenever it changes
  useEffect(() => {
    localStorage.setItem("restaurant_tables_config", JSON.stringify(tables));
  }, [tables]);

  // Save active orders whenever occupancy changes (local cache)
  useEffect(() => {
    localStorage.setItem("active_orders", JSON.stringify(activeOrders));
  }, [activeOrders]);

  // keep occupancy in sync with live orders coming from the server
  useEffect(() => {
    // build map of table -> true for any non-served orders
    const liveMap = {};
    orders.forEach(o => {
      if (o.status && o.status !== "Served") {
        liveMap[`table-${o.table}`] = true;
      }
    });
    // if the service has any live state, prefer it over the cached map
    if (Object.keys(liveMap).length > 0) {
      setActiveOrders(prev => ({ ...prev, ...liveMap }));
    }
  }, [orders]);

  const goToMenu = (tableId) => {
    navigate(`/menu?table=${tableId}`);
  };

  const releaseTable = (e, tableId) => {
    e.stopPropagation();
    const updated = { ...activeOrders };
    delete updated[`table-${tableId}`];
    setActiveOrders(updated);
  };

  const addNewTable = () => {
    const nextId = tables.length > 0 
      ? Math.max(...tables.map(t => t.id)) + 1 
      : 1;

    setTables([...tables, { id: nextId, capacity: 4 }]);
  };

  const removeTable = (e, tableId) => {
    e.stopPropagation();
    if (window.confirm(`Remove Table ${tableId} permanently?\n\nThis action cannot be undone.`)) {
      setTables(prev => prev.filter(t => t.id !== tableId));
      
      // Also clean up any active order for this table
      const updatedOrders = { ...activeOrders };
      delete updatedOrders[`table-${tableId}`];
      setActiveOrders(updatedOrders);
    }
  };

  const isOccupied = (tableId) => !!activeOrders[`table-${tableId}`];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 md:p-12 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Live Floor Management</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
            Floor <span className="text-slate-300">Plan</span>
          </h1>
        </div>

        <button
          onClick={addNewTable}
          className="group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-orange-600 transition-all active:scale-95 shadow-xl hover:shadow-orange-200/40"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Add New Table
        </button>
      </div>

      {/* Tables Grid */}
      <div className="max-w-7xl mx-auto">
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          <AnimatePresence mode="popLayout">
            {tables.map((table) => {
              const occupied = isOccupied(table.id);

              return (
                <motion.div
                  key={table.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.4 }}
                  onClick={() => goToMenu(table.id)}
                  className={`group relative flex flex-col rounded-3xl p-8 transition-all duration-400 cursor-pointer border-2 overflow-hidden
                    ${occupied 
                      ? "bg-gradient-to-br from-rose-50 to-white border-rose-200 shadow-rose-100/50" 
                      : "bg-white border-slate-100 hover:border-slate-300 shadow-sm hover:shadow-2xl"}`}
                >
                  {/* Status Badge */}
                  <div className={`absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-tight border
                    ${occupied ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                    <Circle size={8} fill="currentColor" className={occupied ? "text-rose-500" : "text-emerald-500"} />
                    {occupied ? "OCCUPIED" : "AVAILABLE"}
                  </div>

                  {/* Table Icon */}
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-10 transition-all duration-500
                    ${occupied 
                      ? "bg-rose-500 text-white rotate-6 scale-105" 
                      : "bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:-rotate-6 group-hover:scale-105"}`}>
                    <LayoutGrid size={36} strokeWidth={1.4} />
                  </div>

                  {/* Table Number */}
                  <div className="mb-10">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">TABLE</p>
                    <h3 className="text-6xl font-black text-slate-900 tracking-tighter">
                      {table.id < 10 ? `0${table.id}` : table.id}
                    </h3>
                  </div>

                  {/* Capacity & Actions */}
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users size={16} />
                      <span className="text-sm font-bold">{table.capacity || 4} Seater</span>
                    </div>

                    {occupied ? (
                      <button
                        onClick={(e) => releaseTable(e, table.id)}
                        className="p-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl transition-colors shadow-sm"
                        title="Release / Clear Table"
                      >
                        <LogOut size={20} />
                      </button>
                    ) : (
                      <div className="p-3.5 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
                        <ChevronRight size={20} />
                      </div>
                    )}
                  </div>

                  {/* Delete Button (only on hover) */}
                  <button
                    onClick={(e) => removeTable(e, table.id)}
                    className="absolute -top-3 -right-3 w-9 h-9 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md hover:shadow-lg"
                    title="Delete this table permanently"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* QR Code hint (only visible when available) */}
                  {!occupied && (
                    <div className="absolute bottom-6 left-8 opacity-40 group-hover:opacity-70 transition-opacity">
                      <QrCode size={20} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {tables.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-40 border-4 border-dashed border-slate-200 rounded-[4rem] bg-white/40 backdrop-blur-sm"
          >
            <UtensilsCrossed size={64} className="text-slate-200 mb-8" />
            <h2 className="text-2xl font-black text-slate-700 mb-3">No Tables Configured Yet</h2>
            <p className="text-slate-500 mb-8 max-w-md text-center">
              Start building your floor plan by adding your first dining station.
            </p>
            <button 
              onClick={addNewTable}
              className="flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-orange-600 transition-all shadow-xl"
            >
              <Plus size={20} /> Add First Table
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}