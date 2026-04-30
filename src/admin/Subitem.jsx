import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/axios";
import toast from "react-hot-toast";
import { ProductContext } from "../context/ProductContext";
import {
  Plus,
  Trash2,
  Search,
  Layers,
  AlertTriangle,
} from "lucide-react";
import SubItemCard from "./subitem/components/SubItemCard";
import BulkCreateModal from "./subitem/components/BulkCreateModal";
import ConfirmToggleStatusModal from "./subitem/components/ConfirmToggleStatusModal";
import DeleteSubItemModal from "./subitem/components/DeleteSubItemModal";
import EditSubItemModal from "./subitem/components/EditSubItemModal";

export default function SubItemLibrary() {
  const { subitems, fetchSubitems, updateSubItemStatus } = useContext(ProductContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track IDs of items with a pending optimistic update so the context sync
  // doesn't overwrite them before the API response settles.
  const pendingIds = useRef(new Set());

  // Sync internal state when context updates (e.g. via real-time sockets)
  // Preserve any item that currently has a pending toggle in-flight.
  useEffect(() => {
    if (subitems && subitems.length >= 0) {
      setItems(prev => {
        if (prev.length === 0) return subitems; // initial load
        return subitems.map(s =>
          pendingIds.current.has(s._id)
            ? (prev.find(p => p._id === s._id) || s)  // keep local optimistic copy
            : s
        );
      });
      setLoading(false);
    }
  }, [subitems]);

  const [tab, setTab] = useState("portion"); // "portion" | "addonGroup"
  const [search, setSearch] = useState("");

  // bulk portion
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    category: "",
    items: [{ name: "", price: "" }],
  });

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

  const [deleteModal, setDeleteModal] = useState({ show: false, item: null });
  const [confirmStatusModal, setConfirmStatusModal] = useState({ show: false, item: null });
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const [searchParams] = useSearchParams();
  // ── Fetch ──
  const fetchItems = async () => {
    if (fetchSubitems) {
      await fetchSubitems();
    } else {
      try {
        const { data } = await API.get("/sub-items");
        setItems(data);
      } catch {
        toast.error("Failed to load sub-items");
      } finally {
        setLoading(false);
      }
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

  // ── Grouped filtered list ──
  const groupedData = useMemo(() => {
    const groups = {};
    const ungrouped = [];
    filtered.forEach((item) => {
      if (item.category) {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
      } else {
        ungrouped.push(item);
      }
    });
    return { groups, ungrouped };
  }, [filtered]);

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

  const requestToggleStatus = (item) => {
    setConfirmStatusModal({ show: true, item });
  };

  const confirmToggleStatus = async () => {
    const item = confirmStatusModal.item;
    if (!item) return;

    setConfirmStatusModal({ show: false, item: null });
    await handleDirectToggle(item);
  };

  // ── Direct (no-modal) stock toggle (called by modal confirm) — optimistic, instant ──
  const handleDirectToggle = async (item) => {
    const newStatus = item.isAvailable === false ? true : false;

    // Mark as pending so the subitems sync doesn't overwrite while in-flight
    pendingIds.current.add(item._id);

    // Immediately update local list UI
    setItems(prev =>
      prev.map(it => it._id === item._id ? { ...it, isAvailable: newStatus } : it)
    );

    try {
      // updateSubItemStatus patches BOTH subitems + products in context instantly
      // so ProductCard reflects the change with zero socket round-trip lag
      await updateSubItemStatus(item._id, newStatus);
      toast.success(newStatus ? "Stock In!" : "Stock Out!");
    } catch (err) {
      console.error("Toggle error:", err);
      toast.error("Failed to update status");
      // Revert local list (context already reverted itself in updateSubItemStatus)
      setItems(prev =>
        prev.map(it => it._id === item._id ? { ...it, isAvailable: !newStatus } : it)
      );
    } finally {
      pendingIds.current.delete(item._id);
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

  // ── Bulk Portion Helpers ──
  const openBulkCreate = () => {
    setBulkForm({ category: "", items: [{ name: "", price: "" }] });
    setShowBulkModal(true);
  };

  const addBulkRow = () =>
    setBulkForm((p) => ({ ...p, items: [...p.items, { name: "", price: "" }] }));

  const updateBulkRow = (idx, field, val) =>
    setBulkForm((p) => ({
      ...p,
      items: p.items.map((item, i) => (i === idx ? { ...item, [field]: val } : item)),
    }));

  const removeBulkRow = (idx) =>
    setBulkForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const handleBulkSave = async () => {
    if (!bulkForm.category.trim()) {
      toast.error("Group name (category) is required");
      return;
    }
    const validatedItems = bulkForm.items.filter((i) => i.name.trim());
    if (validatedItems.length === 0) {
      toast.error(`At least one ${tab === 'portion' ? 'portion' : 'add-on'} name is required`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: tab,
        category: bulkForm.category.trim(),
        items: validatedItems,
      };
      const { data } = await API.post("/sub-items", payload);
      
      // Update local state and fetch fresh data to ensure we have the correct structure
      if (fetchSubitems) {
        await fetchSubitems();
      } else {
        setItems((prev) => [...prev, ...data]);
      }
      
      toast.success(`Created ${data.length} ${tab === 'portion' ? 'portion(s)' : 'add-on(s)'} under ${bulkForm.category}!`);
      setShowBulkModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk creation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-8 lg:p-12 font-sans text-slate-950">
      <div className="max-w-[1100px] mx-auto space-y-10">
        {/* ── Header ── */}
        <header className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
          <div className="space-y-4 flex-1">
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
            </div>
            <p className="text-sm text-slate-400 font-medium max-w-lg leading-relaxed">
              Save reusable portions and add-on groups here. Pick them instantly
              when editing any product — no need to type every time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto self-end">
            <div className="relative group w-full sm:w-64">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-600 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] w-full shadow-sm focus:ring-4 focus:ring-violet-50/50 outline-none transition-all font-medium text-sm"
              />
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={openBulkCreate}
                className={`flex-1 sm:flex-none px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 border-2 ${
                  tab === "portion" 
                    ? "border-violet-600 text-violet-600 hover:bg-violet-50" 
                    : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                <Plus size={16} /> Bulk {tab === "portion" ? "Portion" : "Add-on"}
              </button>
              
              <button
                onClick={openCreate}
                className="flex-1 sm:flex-none bg-slate-950 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-violet-600 transition-all shadow-xl hover:shadow-violet-200 active:scale-95 flex items-center justify-center gap-3"
              >
                <Plus size={18} />
                New {tab === "portion" ? "Portion" : "Add-on"}
              </button>
            </div>
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
          <div className="space-y-12">
            {/* 1. Grouped Items (Portions or Add-on Groups with Category) */}
            {Object.entries(groupedData.groups).map(([groupName, groupItems]) => (
              <div key={groupName} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                    <Layers className="text-violet-600" size={24} />
                    {groupName} <span className="text-slate-300 font-light italic">Group</span>
                  </h2>
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    {groupItems.length} Variants
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupItems.map((item) => (
                    <SubItemCard 
                      key={item._id} 
                      item={item} 
                      onEdit={openEdit} 
                      onDelete={(it) => setDeleteModal({ show: true, item: it })}
                      onToggleStatus={requestToggleStatus}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* 2. Ungrouped Items */}
            {groupedData.ungrouped.length > 0 && (
              <div className="space-y-6">
                {Object.keys(groupedData.groups).length > 0 && (
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                      <Plus className="text-slate-400" size={24} />
                      Individual <span className="text-slate-300 font-light italic">Items</span>
                    </h2>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedData.ungrouped.map((item) => (
                    <SubItemCard 
                      key={item._id} 
                      item={item} 
                      onEdit={openEdit} 
                      onDelete={(it) => setDeleteModal({ show: true, item: it })}
                      onToggleStatus={requestToggleStatus}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BulkCreateModal
        open={showBulkModal}
        saving={saving}
        tab={tab}
        bulkForm={bulkForm}
        onChangeCategory={(v) => setBulkForm((p) => ({ ...p, category: v }))}
        onChangeRow={(idx, field, val) => updateBulkRow(idx, field, val)}
        onAddRow={addBulkRow}
        onRemoveRow={removeBulkRow}
        onClose={() => setShowBulkModal(false)}
        onSave={handleBulkSave}
      />

      <ConfirmToggleStatusModal
        open={confirmStatusModal.show}
        item={confirmStatusModal.item}
        onClose={() => setConfirmStatusModal({ show: false, item: null })}
        onConfirm={confirmToggleStatus}
      />

      <DeleteSubItemModal
        open={deleteModal.show}
        item={deleteModal.item}
        onClose={() => setDeleteModal({ show: false, item: null })}
        onConfirm={confirmDelete}
      />

      <EditSubItemModal
        open={showModal}
        saving={saving}
        editing={editing}
        form={form}
        onClose={() => setShowModal(false)}
        onChangeForm={setForm}
        onAddAddonRow={addAddonRow}
        onUpdateAddonRow={updateAddonRow}
        onRemoveAddonRow={removeAddonRow}
        onSave={handleSave}
      />
    </div>
  );
}
