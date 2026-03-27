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
import toast from "react-hot-toast";

export default function Tables() {
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

  const { orders } = useOrders();
  const [activeOrders, setActiveOrders] = useState(() => {
    const saved = localStorage.getItem("active_orders");
    return saved ? JSON.parse(saved) : {};
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, tableId: null });

  const navigate = useNavigate();

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("restaurant_tables_config", JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem("active_orders", JSON.stringify(activeOrders));
  }, [activeOrders]);

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

  const goToMenu = (tableId) => {
    navigate(`/choose-mode?table=${tableId}`);
  };

  const releaseTable = (e, tableId) => {
    e.stopPropagation();
    const updated = { ...activeOrders };
    delete updated[`table-${tableId}`];
    setActiveOrders(updated);
    toast.success(`Table ${tableId} checked out`);
  };

  const addNewTable = () => {
    const nextId = tables.length > 0 
      ? Math.max(...tables.map(t => t.id)) + 1 
      : 1;
    setTables([...tables, { id: nextId, capacity: 4 }]);
  };

  const removeTable = (e, tableId) => {
    e.stopPropagation();
    setDeleteModal({ show: true, tableId });
  };

  const confirmRemoveTable = () => {
    const tableId = deleteModal.tableId;
    setTables(prev => prev.filter(t => t.id !== tableId));
    const updatedOrders = { ...activeOrders };
    delete updatedOrders[`table-${tableId}`];
    setActiveOrders(updatedOrders);
    toast.success(`Table ${tableId} removed permanently`);
    setDeleteModal({ show: false, tableId: null });
  };

  const cancelRemoveTable = () => {
    setDeleteModal({ show: false, tableId: null });
  };

  const isOccupied = (tableId) => !!activeOrders[`table-${tableId}`];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Live Floor Management</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">
            Floor <span className="text-slate-300">Plan</span>
          </h1>
        </div>

        <button
          onClick={addNewTable}
          className="group flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-orange-600 transition-all active:scale-95 shadow-xl hover:shadow-orange-200/40"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          Add Table
        </button>
      </div>

      {/* Grid: 2 on Mobile, 3 on Small Tablets, 6 on Desktops (md and up) */}
      <div className="max-w-7xl mx-auto">
        <motion.div 
          layout 
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {tables.map((table) => {
              const occupied = isOccupied(table.id);

              return (
                <motion.div
                  key={table.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => goToMenu(table.id)}
                  className={`group relative flex flex-col rounded-2xl p-4 transition-all duration-300 cursor-pointer border overflow-hidden h-full
                    ${occupied 
                      ? "bg-gradient-to-br from-rose-50 to-white border-rose-200 shadow-rose-100/50" 
                      : "bg-white border-slate-100 hover:border-slate-300 shadow-sm hover:shadow-lg"}`}
                >
                  {/* Status Badge */}
                  <div className="flex justify-between items-center mb-4">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border
                      ${occupied ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                      <Circle size={6} fill="currentColor" className={occupied ? "text-rose-500" : "text-emerald-500"} />
                      {occupied ? "BUSY" : "FREE"}
                    </div>

                    {/* Delete Button (visible on hover) */}
                    <button
                      onClick={(e) => removeTable(e, table.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete Table"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Icon Area */}
                  <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 transition-all duration-300
                    ${occupied 
                      ? "bg-rose-500 text-white scale-105" 
                      : "bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white"}`}>
                    <LayoutGrid size={22} strokeWidth={1.8} />
                  </div>

                  {/* Table Number */}
                  <div className="text-center mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TABLE</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                      {table.id < 10 ? `0${table.id}` : table.id}
                    </h3>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-bold">
                      <Users size={14} />
                      <span>{table.capacity}</span>
                    </div>

                    <div className="flex gap-1.5">
                     

                      {occupied ? (
                        <button
                          onClick={(e) => releaseTable(e, table.id)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                          title="Release Table"
                        >
                          <LogOut size={16} />
                        </button>
                      ) : (
                        <div className="p-2 bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white rounded-xl transition-colors">
                          <ChevronRight size={16} />
                        </div>
                      )}
                    </div>
                  </div>
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
            className="flex flex-col items-center justify-center py-28 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white/40"
          >
            <UtensilsCrossed size={50} className="text-slate-200 mb-6" />
            <h2 className="text-xl font-black text-slate-700 mb-2">No Tables Configured Yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm text-center text-sm">
              Start building your floor plan by adding your first dining station.
            </p>
            <button 
              onClick={addNewTable}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-orange-600 transition-all shadow-xl"
            >
              <Plus size={18} /> Add First Table
            </button>
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