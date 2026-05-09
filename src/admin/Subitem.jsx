import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/axios";
import toast from "react-hot-toast";
import { ProductContext } from "../context/ProductContext";
import { Plus, Search, Layers, AlertTriangle } from "lucide-react";
import SubItemCard from "./subitem/components/SubItemCard";
import BulkCreateModal from "./subitem/components/BulkCreateModal";
import ConfirmToggleStatusModal from "./subitem/components/ConfirmToggleStatusModal";
import DeleteSubItemModal from "./subitem/components/DeleteSubItemModal";
import EditSubItemModal from "./subitem/components/EditSubItemModal";
import StickyPageHeader from "./components/StickyPageHeader";

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
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

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

  useEffect(() => { setPage(1); }, [tab, search, outOfStockOnly]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedFiltered = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // ── Grouped filtered list ──
  const groupedData = useMemo(() => {
    const groups = {};
    const ungrouped = [];
    pagedFiltered.forEach((item) => {
      if (item.category) {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
      } else {
        ungrouped.push(item);
      }
    });
    return { groups, ungrouped };
  }, [pagedFiltered]);

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
    <div className="relative min-h-full bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-12 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(24,24,27,0.05),transparent)]"
        aria-hidden
      />
      <StickyPageHeader
        icon={Layers}
        eyebrow="Library"
        title="Sub-items"
        subtitle="Reusable portions and add-on groups"
        rightAddon={
          <>
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search library…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-zinc-800 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <button
              type="button"
              onClick={openBulkCreate}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <Plus size={14} />
              Bulk
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800"
            >
              <Plus size={14} />
              New
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-[1100px] space-y-8 px-4 pt-8 sm:px-6 lg:space-y-10 lg:px-8 lg:pt-10">

        <div className="flex flex-wrap gap-2">
          {[
            { key: "portion", label: "Portions" },
            { key: "addonGroup", label: "Add-on groups" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide transition ${
                tab === t.key
                  ? "bg-zinc-900 text-white shadow-md"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {t.label}{" "}
              <span className={tab === t.key ? "text-zinc-300" : "text-zinc-400"}>
                ({items.filter((i) => i.type === t.key).length})
              </span>
            </button>
          ))}
        </div>

        {outOfStockOnly && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800">
            <AlertTriangle size={14} className="shrink-0" />
            Showing unavailable items only
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/80 py-20 text-center ring-1 ring-zinc-100/80">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50">
              <Layers className="text-zinc-400" size={30} strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-black text-zinc-900">
              No {tab === "portion" ? "portions" : "add-on groups"} yet
            </h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              Create one with <span className="font-semibold text-zinc-700">New</span> or use{" "}
              <span className="font-semibold text-zinc-700">Bulk</span> for a whole set.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedData.groups).map(([groupName, groupItems]) => (
              <div key={groupName} className="space-y-5">
                <div className="flex items-center gap-4">
                  <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-zinc-900">
                    <Layers className="text-zinc-500" size={18} strokeWidth={2} />
                    {groupName}
                  </h2>
                  <div className="h-px flex-1 bg-zinc-200/80" />
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {groupItems.length} items
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="space-y-5">
                {Object.keys(groupedData.groups).length > 0 && (
                  <div className="flex items-center gap-4">
                    <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-zinc-900">
                      <Plus className="text-zinc-400" size={18} strokeWidth={2} />
                      Ungrouped
                    </h2>
                    <div className="h-px flex-1 bg-zinc-200/80" />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

        {filtered.length > PER_PAGE && (
          <div className="flex items-center justify-between pt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Page {safePage} / {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
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
