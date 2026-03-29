import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "../context/OrderContext";
import API from "../api/axios";
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
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableId, setNewTableId] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [isSavingTable, setIsSavingTable] = useState(false);

  const { orders } = useOrders();
  const [activeOrders, setActiveOrders] = useState({});
  const [deleteModal, setDeleteModal] = useState({ show: false, tableId: null });

  const navigate = useNavigate();

  // Fetch from Backend
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setIsLoading(true);
        const { data } = await API.get("/tables");
        setTables(data);
      } catch (err) {
        console.error("Failed to fetch tables", err);
        toast.error("Cloud sync failed. Using local fallback.");
        const saved = localStorage.getItem("restaurant_tables_config");
        if (saved) setTables(JSON.parse(saved));
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

  const releaseTable = (e, tableId) => {
    e.stopPropagation();
    const updated = { ...activeOrders };
    delete updated[`table-${tableId}`];
    setActiveOrders(updated);
    toast.success(`Table ${tableId} checked out`);
  };

  const addNewTable = async () => {
    setShowAddModal(true);
    setNewTableId("");
    setNewTableCapacity(4);
  };

  const submitNewTable = async () => {
    const tableId = Number(newTableId);
    if (!Number.isInteger(tableId) || tableId <= 0) {
      toast.error("Enter a valid numeric table Number");
      return;
    }

    if (tables.some((t) => t.id === tableId)) {
      toast.error("Table Number already exists");
      return;
    }

    setIsSavingTable(true);

    const newTable = { id: tableId, capacity: Number(newTableCapacity) || 4 };
    const prevTables = [...tables];
    setTables((prev) => [...prev, newTable]);

    try {
      await API.post("/tables", newTable);
      toast.success(`Table ${tableId} created and synced`);
      const { data } = await API.get("/tables");
      setTables(data);
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to save table", err);
      toast.error("Failed to save to cloud");
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

    const prevTables = [...tables];
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    setDeleteModal({ show: false, tableId: null });

    try {
      await API.delete(`/tables/${tableId}`);
      toast.success(`Table ${tableId} removed permanently`);
      const { data } = await API.get('/tables');
      setTables(data);
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
          <button
            onClick={addNewTable}
            className="group flex items-center gap-2 bg-slate-900 text-white px-5 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-orange-600 transition-all active:scale-95 shadow-xl hover:shadow-orange-200/40"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            Add Table
          </button>
        )}
      </div>

      {/* Grid: 2 on Mobile, 3 on Small Tablets, 6 on Desktops */}
      <div className="max-w-7xl mx-auto">
        <motion.div 
          layout 
          className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4"
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
                  className={`group relative flex flex-col rounded-2xl p-3 sm:p-4 transition-all duration-300 cursor-pointer border overflow-hidden h-full
                    ${occupied 
                      ? "bg-linear-to-br from-rose-50 to-white border-rose-200 shadow-rose-100/50" 
                      : "bg-white border-slate-100 hover:border-slate-300 shadow-sm hover:shadow-lg"}`}
                >
                  {/* Status Badge */}
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border
                      ${occupied ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                      <Circle size={6} fill="currentColor" className={occupied ? "text-rose-500" : "text-emerald-500"} />
                      {occupied ? "BUSY" : "FREE"}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={(e) => removeTable(e, table.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Table"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Icon Area */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-all duration-300
                    ${occupied 
                      ? "bg-rose-500 text-white scale-105" 
                      : "bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white"}`}>
                    <LayoutGrid size={20} strokeWidth={1.8} className="sm:block" />
                  </div>

                  {/* Table Number */}
                  <div className="text-center mb-4 sm:mb-6">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TABLE</p>
                    <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter">
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
            className="flex flex-col items-center justify-center py-20 md:py-28 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white/40"
          >
            <UtensilsCrossed size={50} className="text-slate-200 mb-6" />
            <h2 className="text-xl font-black text-slate-700 mb-2">No Tables Configured Yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm text-center text-sm">
              Start building your floor plan by adding your first dining station.
            </p>
            {canManageTables && (
              <button 
                onClick={addNewTable}
                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-orange-600 transition-all shadow-xl"
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