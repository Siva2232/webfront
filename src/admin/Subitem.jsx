import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/axios";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  Search,
  Layers,
  AlertTriangle,
  IndianRupee,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function SubItemLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("portion"); // "portion" | "addonGroup"
  const [search, setSearch] = useState("");

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [form, setForm] = useState({
    type: "portion",
    name: "",
    price: "",
    maxSelections: "",
    addons: [],
  });
  const [saving, setSaving] = useState(false);

  const [stockModal, setStockModal] = useState({ show: false, item: null, target: "" });
  const [deleteModal, setDeleteModal] = useState({ show: false, item: null });
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const [searchParams] = useSearchParams();
  // ── Fetch ──
  const fetchItems = async () => {
    try {
      const { data } = await API.get("/sub-items");
      setItems(data);
    } catch {
      toast.error("Failed to load sub-items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const filter = searchParams.get("filter");
    const outLow = filter === "out-of-stock";
    setOutOfStockOnly(outLow);
    if (outLow) {
      setSearch("");
      toast("Showing only sold-out sub-items");
    }
  }, [searchParams]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    let list = items;
    if (outOfStockOnly) {
      list = list.filter((i) => i.isAvailable === false);
    }
    return list
      .filter((i) => i.type === tab)
      .filter((i) => (term ? i.name.toLowerCase().includes(term) : true));
  }, [items, tab, search, outOfStockOnly]);

  // ── Open modal ──
  const openCreate = () => {
    setEditing(null);
    setForm({ type: tab, name: "", price: "", maxSelections: "", addons: [] });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      type: item.type,
      name: item.name,
      price: item.price?.toString() || "",
      maxSelections: item.maxSelections?.toString() || "",
      addons: item.addons || [],
    });
    setShowModal(true);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        name: form.name.trim(),
        price: Number(form.price) || 0,
        maxSelections: Number(form.maxSelections) || 0,
        addons: form.addons
          .filter((a) => a.name?.trim())
          .map((a) => ({ name: a.name.trim(), price: Number(a.price) || 0 })),
      };
      if (editing) {
        const { data } = await API.put(`/sub-items/${editing._id}`, payload);
        setItems((prev) =>
          prev.map((it) => (it._id === editing._id ? data : it))
        );
        toast.success("Updated!");
      } else {
        const { data } = await API.post("/sub-items", payload);
        setItems((prev) => [...prev, data]);
        toast.success("Created!");
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle Availability ──
  const confirmToggleAvailability = async () => {
    const item = stockModal.item;
    if (!item) return;
    try {
      const newStatus = item.isAvailable === false ? true : false;
      const { data } = await API.put(`/sub-items/${item._id}`, { isAvailable: newStatus });
      setItems((prev) => prev.map((it) => (it._id === item._id ? data : it)));
      toast.success(newStatus ? "Stock In!" : "Stock Out!");
      setStockModal({ show: false, item: null, target: "" });
    } catch (err) {
      console.error("Toggle error:", err);
      toast.error("Failed to update status");
    }
  };

  // ── Delete ──
  const confirmDelete = async () => {
    const item = deleteModal.item;
    if (!item) return;
    try {
      await API.delete(`/sub-items/${item._id}`);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      toast.success("Deleted!");
      setDeleteModal({ show: false, item: null });
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete");
    }
  };

  // ── Addon helpers inside modal ──
  const addAddonRow = () =>
    setForm((p) => ({ ...p, addons: [...p.addons, { name: "", price: "" }] }));

  const updateAddonRow = (idx, field, val) =>
    setForm((p) => ({
      ...p,
      addons: p.addons.map((a, i) =>
        i === idx ? { ...a, [field]: val } : a
      ),
    }));

  const removeAddonRow = (idx) =>
    setForm((p) => ({ ...p, addons: p.addons.filter((_, i) => i !== idx) }));

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-8 lg:p-12 font-sans text-slate-950">
      <div className="max-w-[1100px] mx-auto space-y-10">
        {/* ── Header ── */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-10 bg-violet-600 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                Master Library
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-950">
              Sub <span className="text-slate-300 font-light italic">Items</span>
            </h1>
            <p className="text-sm text-slate-400 font-medium max-w-lg">
              Save reusable portions and add-on groups here. Pick them instantly
              when editing any product — no need to type every time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="relative group w-full sm:w-72">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-600 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] w-full shadow-sm focus:ring-4 focus:ring-violet-50/50 outline-none transition-all font-medium"
              />
            </div>
            <button
              onClick={openCreate}
              className="w-full sm:w-auto bg-slate-950 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-violet-600 transition-all shadow-xl hover:shadow-violet-200 active:scale-95 flex items-center justify-center gap-3"
            >
              <Plus size={18} />
              New {tab === "portion" ? "Portion" : "Add-on Group"}
            </button>
          </div>
        </header>

        {/* ── Tab Switcher ── */}
        <div className="flex gap-3">
          {[
            { key: "portion", label: "Portions" },
            { key: "addonGroup", label: "Add-on Groups" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${
                tab === t.key
                  ? "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-100"
                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
              }`}
            >
              {t.label} ({items.filter((i) => i.type === t.key).length})
            </button>
          ))}
        </div>

        {outOfStockOnly && (
          <div className="mt-4 mb-2 inline-flex items-center gap-2 px-4 py-2 rounded-full text-white bg-rose-500 text-xs font-bold">
            <AlertTriangle size={14} /> Showing only sold-out sub-items
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <span className="w-8 h-8 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-100 rounded-[3rem] text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100">
              <Layers className="text-violet-400" size={36} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">
              No {tab === "portion" ? "Portions" : "Add-on Groups"} yet
            </h3>
            <p className="text-slate-400 font-medium max-w-sm mt-2">
              Create your first {tab === "portion" ? "portion" : "add-on group"} to
              reuse across products.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item._id}
                className={`bg-white rounded-[2rem] border transition-all p-6 space-y-4 shadow-sm hover:shadow-md ${
                  item.isAvailable === false ? "opacity-75 border-rose-200 bg-rose-50/10" : "border-slate-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          item.type === "portion"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {item.type === "portion" ? "Portion" : "Add-on Group"}
                      </span>
                      {item.isAvailable === false && (
                        <span className="px-2 py-1 bg-rose-600 text-white text-[8px] font-black uppercase rounded-lg">
                          Stock Out
                        </span>
                      )}
                    </div>
                    <h3 className={`text-lg font-black uppercase tracking-tight ${
                      item.isAvailable === false ? "text-slate-400 line-through decoration-rose-500 decoration-2" : "text-slate-900"
                    }`}>
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setStockModal({ show: true, item, target: item.isAvailable !== false ? "out" : "in" })}
                      title={item.isAvailable !== false ? "Mark Stock Out" : "Mark Stock In"}
                      className={`p-2.5 rounded-xl transition-all shadow-sm ${
                        item.isAvailable !== false 
                          ? "bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-200" 
                          : "bg-emerald-600 text-white border border-emerald-600 shadow-lg shadow-emerald-100"
                      }`}
                    >
                      {item.isAvailable !== false ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100"
                    >
                      <Edit3 size={14} className="text-slate-500" />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ show: true, item })}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100"
                    >
                      <Trash2 size={14} className="text-rose-500" />
                    </button>
                  </div>
                </div>

                {item.type === "portion" && (
                  <div className="flex items-center gap-1.5 text-violet-600 font-black">
                    <IndianRupee size={14} strokeWidth={3} />
                    <span className="text-xl tracking-tighter italic">
                      {item.price}
                    </span>
                  </div>
                )}

                {item.type === "addonGroup" && (
                  <div className="space-y-2">
                    {item.maxSelections > 0 && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Max select: {item.maxSelections}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {item.addons?.map((a, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg"
                        >
                          {a.name}{a.price > 0 ? ` +₹${a.price}` : ""}
                        </span>
                      ))}
                      {(!item.addons || item.addons.length === 0) && (
                        <span className="text-[10px] text-slate-300 italic">No addons</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ Create / Edit Modal ══════════ */}
      <AnimatePresence>
        {stockModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setStockModal({ show: false, item: null, target: "" })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-black mb-2">{stockModal.target === "out" ? "Stock Out" : "Stock In"}</h3>
                <p className="text-sm text-slate-600 mb-5">
                  {stockModal.target === "out"
                    ? "Mark this item as unavailable in the menu?"
                    : "Mark this item as available in the menu?"}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStockModal({ show: false, item: null, target: "" })}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmToggleAvailability}
                    className={`flex-1 px-4 py-2 rounded-xl font-bold text-white ${stockModal.target === "out" ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {deleteModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteModal({ show: false, item: null })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-black mb-2">Delete Item</h3>
                <p className="text-sm text-slate-600 mb-5">
                  Are you sure you want to delete "{deleteModal.item?.name}"? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ show: false, item: null })}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !saving && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 bg-violet-600 text-white shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    {editing ? "Edit" : "New"}{" "}
                    {form.type === "portion" ? "Portion" : "Add-on Group"}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Type selector (only for create) */}
                {!editing && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                      Type
                    </label>
                    <div className="flex gap-3">
                      {[
                        { key: "portion", label: "Portion" },
                        { key: "addonGroup", label: "Add-on Group" },
                      ].map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() =>
                            setForm((p) => ({ ...p, type: t.key, addons: t.key === "portion" ? [] : p.addons }))
                          }
                          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                            form.type === t.key
                              ? "bg-violet-50 text-violet-700 border-violet-500"
                              : "bg-slate-50 text-slate-400 border-slate-100"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder={
                      form.type === "portion"
                        ? 'e.g. "Half", "Full", "Family Pack"'
                        : 'e.g. "Dips & Sauces", "Extra Toppings"'
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Price (portions only) */}
                {form.type === "portion" && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                      Default Price (₹)
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, price: e.target.value }))
                      }
                      placeholder="0"
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-black outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                )}

                {/* Addon Group specifics */}
                {form.type === "addonGroup" && (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                        Max Selections (0 = unlimited)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.maxSelections}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            maxSelections: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    {/* Addon items */}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Addon Items
                      </label>
                      <div className="space-y-2">
                        {form.addons.map((a, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              placeholder="Item name"
                              value={a.name}
                              onChange={(e) =>
                                updateAddonRow(idx, "name", e.target.value)
                              }
                              className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                ₹
                              </span>
                              <input
                                type="number"
                                placeholder="0"
                                value={a.price}
                                onChange={(e) =>
                                  updateAddonRow(idx, "price", e.target.value)
                                }
                                className="w-24 pl-7 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAddonRow(idx)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addAddonRow}
                        className="mt-2 flex items-center gap-1.5 px-4 py-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Plus size={14} /> Add Item
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 flex gap-3 shrink-0 border-t border-slate-100">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1 px-6 py-4 border-2 border-slate-200 font-bold uppercase text-xs tracking-widest rounded-xl hover:border-slate-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-4 bg-violet-600 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editing ? "Update" : "Create"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
