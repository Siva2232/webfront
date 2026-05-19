import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import API from "../api/axios";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Upload, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { compressImage } from "./products/utils/compressImage";
import StockTrackingFields from "./products/components/StockTrackingFields";
import {
  buildStockApiPayload,
  defaultStockFormFields,
  validateStockForm,
} from "./products/utils/productStockForm";

export default function EditForm() {
  const { id } = useParams(); // Gets the ID from the URL
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, categories } = useProducts();

  // ── Sub-item library (portions + addon groups from master list) ──
  const [libraryPortions, setLibraryPortions] = useState([]);
  const [libraryAddonGroups, setLibraryAddonGroups] = useState([]);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const { data } = await API.get("/sub-items");
        setLibraryPortions(data.filter((s) => s.type === "portion"));
        setLibraryAddonGroups(data.filter((s) => s.type === "addonGroup"));
      } catch {
        // silent – library is optional
      }
    };
    fetchLibrary();
  }, []);
  
  const isEditMode = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "Main Courses",
    type: "veg",
    description: "",
    image: "",
    hasPortions: false,
    portions: [],
    addonGroups: [],
    ...defaultStockFormFields(),
  });

  // 1. If we are editing, find the product and fill the form
  useEffect(() => {
    if (isEditMode) {
      const existingProduct = products.find((p) => p._id === id);
      if (existingProduct) {
        setFormData({
          ...existingProduct,
          price: existingProduct.price.toString(),
          image: existingProduct.image || "",
          category: existingProduct.category?.name || existingProduct.category || "Main Courses",
          hasPortions: existingProduct.hasPortions || false,
          portions: existingProduct.portions || [],
          addonGroups: existingProduct.addonGroups || [],
          trackStock: Boolean(existingProduct.trackStock),
          stock: existingProduct.trackStock
            ? String(existingProduct.stock ?? "")
            : "",
          isAvailable: existingProduct.isAvailable !== false,
        });
      }
    }
  }, [id, isEditMode, products]);

  // --- Portion helpers ---
  const addPortion = () => {
    setFormData(prev => ({
      ...prev,
      portions: [...prev.portions, { name: "", price: "" }],
    }));
  };

  const updatePortion = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      portions: prev.portions.map((p, i) =>
        i === index ? { ...p, [field]: field === "price" ? value : value } : p
      ),
    }));
  };

  const removePortion = (index) => {
    setFormData(prev => ({
      ...prev,
      portions: prev.portions.filter((_, i) => i !== index),
    }));
  };

  // --- Addon Group helpers ---
  const addAddonGroup = () => {
    setFormData(prev => ({
      ...prev,
      addonGroups: [...prev.addonGroups, { name: "", maxSelections: 0, addons: [] }],
    }));
  };

  const updateAddonGroup = (gIdx, field, value) => {
    setFormData(prev => ({
      ...prev,
      addonGroups: prev.addonGroups.map((g, i) =>
        i === gIdx ? { ...g, [field]: value } : g
      ),
    }));
  };

  const removeAddonGroup = (gIdx) => {
    setFormData(prev => ({
      ...prev,
      addonGroups: prev.addonGroups.filter((_, i) => i !== gIdx),
    }));
  };

  const addAddon = (gIdx) => {
    setFormData(prev => ({
      ...prev,
      addonGroups: prev.addonGroups.map((g, i) =>
        i === gIdx ? { ...g, addons: [...g.addons, { name: "", price: "" }] } : g
      ),
    }));
  };

  const updateAddon = (gIdx, aIdx, field, value) => {
    setFormData(prev => ({
      ...prev,
      addonGroups: prev.addonGroups.map((g, i) =>
        i === gIdx
          ? {
              ...g,
              addons: g.addons.map((a, j) =>
                j === aIdx ? { ...a, [field]: value } : a
              ),
            }
          : g
      ),
    }));
  };

  const removeAddon = (gIdx, aIdx) => {
    setFormData(prev => ({
      ...prev,
      addonGroups: prev.addonGroups.map((g, i) =>
        i === gIdx
          ? { ...g, addons: g.addons.filter((_, j) => j !== aIdx) }
          : g
      ),
    }));
  };

  // --- Collapsed state for addon groups ---
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroupCollapse = (idx) =>
    setCollapsedGroups(prev => ({ ...prev, [idx]: !prev[idx] }));

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, etc.)");
      e.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      e.target.value = "";
      return;
    }
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setFormData((prev) => ({ ...prev, image: compressed }));
    } catch (err) {
      console.error(err);
      toast.error("Could not process image");
    } finally {
      setIsCompressing(false);
      e.target.value = "";
    }
  };

  const handleClearImage = () => {
    setFormData((prev) => ({ ...prev, image: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.image?.trim()) {
      toast.error("Please upload a product image");
      return;
    }

    // Validation for portions
    if (formData.hasPortions) {
      if (formData.portions.length === 0) {
        toast.error("Add at least one portion when portions are enabled");
        return;
      }
      for (const p of formData.portions) {
        if (!p.name?.trim()) { toast.error("Portion name cannot be empty"); return; }
        if (!p.price || Number(p.price) <= 0) { toast.error(`Price must be > 0 for portion "${p.name}"`); return; }
      }
      const names = formData.portions.map(p => p.name.trim().toLowerCase());
      if (new Set(names).size !== names.length) { toast.error("Duplicate portion names are not allowed"); return; }
    }

    // Clean portion/addon data
    const cleanPortions = formData.hasPortions
      ? formData.portions.map(p => ({ name: p.name.trim(), price: Number(p.price) }))
      : [];

    const cleanAddonGroups = formData.addonGroups
      .filter(g => g.name?.trim() && g.addons.length > 0)
      .map(g => ({
        name: g.name.trim(),
        maxSelections: Number(g.maxSelections) || 0,
        addons: g.addons
          .filter(a => a.name?.trim())
          .map(a => ({ name: a.name.trim(), price: Number(a.price) || 0 })),
      }));

    const stockError = validateStockForm(formData);
    if (stockError) {
      toast.error(stockError);
      return;
    }

    const formattedData = {
      ...formData,
      price: parseFloat(formData.price),
      portions: cleanPortions,
      addonGroups: cleanAddonGroups,
      ...buildStockApiPayload({
        trackStock: formData.trackStock,
        stock: formData.stock,
        isAvailable: formData.isAvailable !== false,
      }),
    };

    setIsSaving(true);
    try {
      if (isEditMode) {
        await updateProduct(id, formattedData);
        toast.success("Product updated successfully");
      } else {
        await addProduct(formattedData);
        toast.success("Product created successfully");
      }
      navigate("/admin/products"); // Go back to list after saving
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || "Failed to save product";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate("/admin/products")}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 font-black uppercase text-[10px] tracking-widest"
        >
          <ArrowLeft size={16} /> Cancel & Exit
        </button>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100">
          <header className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 italic uppercase">
              {isEditMode ? "Edit" : "New"} <span className="text-blue-600">Product</span>
            </h1>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Product Name</label>
              <input 
                required
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Base Price (₹)</label>
                <input 
                  required
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black italic"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Category</label>
                <select 
                  value={formData.category?.name || formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                >
                  {categories.map(c => {
                    const catName = c?.name || c;
                    return <option key={catName} value={catName}>{catName}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Description</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Short description..."
                  rows={2}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-600 text-sm resize-none"
                />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Product Image <span className="text-red-500">*</span>
              </label>
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-colors ${
                  formData.image
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30"
                } ${isCompressing ? "pointer-events-none opacity-70" : ""}`}
              >
                {isCompressing ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                    Compressing…
                  </div>
                ) : formData.image ? (
                  <p className="text-sm font-black uppercase tracking-widest text-emerald-600">
                    tap to replace new one
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Upload size={28} className="text-slate-300" />
                    <span className="text-sm font-bold text-slate-500">Click to upload image</span>
                    <span className="text-[10px] font-medium text-slate-400">JPG or PNG, max 8MB</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isCompressing}
                  className="hidden"
                />
              </label>
              {formData.image && (
                <div className="relative overflow-hidden rounded-2xl border border-slate-100 shadow-inner">
                  <img
                    src={formData.image}
                    alt={formData.name || "Preview"}
                    className="h-48 w-full object-cover"
                    onError={(ev) => {
                      ev.target.onerror = null;
                      ev.target.src = "https://via.placeholder.com/400x200?text=Invalid+Image";
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="absolute top-3 right-3 rounded-full bg-black/55 p-2 text-white transition-colors hover:bg-black/75"
                    aria-label="Remove image"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Food Type</label>
                <div className="flex gap-3">
                  {["veg", "non-veg"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({...formData, type: t})}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase transition-all ${
                        formData.type === t
                          ? t === "veg"
                            ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500"
                            : "bg-red-50 text-red-700 border-2 border-red-500"
                          : "bg-slate-50 text-slate-400 border-2 border-slate-100"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${t === "veg" ? "bg-emerald-500" : "bg-red-500"}`} />
                      {t}
                    </button>
                  ))}
                </div>
            </div>

            <StockTrackingFields
              trackStock={Boolean(formData.trackStock)}
              stock={formData.stock ?? ""}
              onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
            />

            {/* ============ PORTIONS SECTION ============ */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enable Portions</label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, hasPortions: !prev.hasPortions }))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    formData.hasPortions ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      formData.hasPortions ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {formData.hasPortions && (
                <div className="space-y-3 pl-2">
                  <p className="text-[10px] text-slate-400 font-medium">E.g. Half, Full, Family Pack. Each portion has its own price.</p>
                  {formData.portions.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        placeholder="Portion name"
                        value={p.name}
                        onChange={(e) => updatePortion(idx, "name", e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">₹</span>
                        <input
                          type="number"
                          placeholder="Price"
                          value={p.price}
                          onChange={(e) => updatePortion(idx, "price", e.target.value)}
                          className="w-28 pl-7 pr-3 py-3 bg-slate-50 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button type="button" onClick={() => removePortion(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={addPortion}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                    >
                      <Plus size={14} /> Add Portion
                    </button>
                    {libraryPortions.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          const lib = libraryPortions.find((l) => l._id === e.target.value);
                          if (lib) {
                            const exists = formData.portions.some(
                              (p) => p.name.toLowerCase() === lib.name.toLowerCase()
                            );
                            if (exists) {
                              toast.error(`"${lib.name}" already added`);
                              return;
                            }
                            setFormData((prev) => ({
                              ...prev,
                              portions: [...prev.portions, { name: lib.name, price: lib.price || "" }],
                            }));
                          }
                        }}
                        className="px-3 py-2.5 bg-violet-50 text-violet-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-violet-200 outline-none cursor-pointer"
                      >
                        <option value="">Pick from Library</option>
                        {libraryPortions.map((lp) => (
                          <option key={lp._id} value={lp._id}>
                            {lp.name} — ₹{lp.price}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ============ ADDON GROUPS SECTION ============ */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add-on Groups</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={addAddonGroup}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                  >
                    <Plus size={12} /> New Group
                  </button>
                  {libraryAddonGroups.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        const lib = libraryAddonGroups.find((l) => l._id === e.target.value);
                        if (lib) {
                          const exists = formData.addonGroups.some(
                            (g) => g.name.toLowerCase() === lib.name.toLowerCase()
                          );
                          if (exists) {
                            toast.error(`"${lib.name}" already added`);
                            return;
                          }
                          setFormData((prev) => ({
                            ...prev,
                            addonGroups: [
                              ...prev.addonGroups,
                              {
                                name: lib.name,
                                maxSelections: lib.maxSelections || 0,
                                addons: (lib.addons || []).map((a) => ({ name: a.name, price: a.price || 0 })),
                              },
                            ],
                          }));
                        }
                      }}
                      className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-violet-200 outline-none cursor-pointer"
                    >
                      <option value="">Pick from Library</option>
                      {libraryAddonGroups.map((lg) => (
                        <option key={lg._id} value={lg._id}>
                          {lg.name} ({lg.addons?.length || 0} items)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Create groups like "Dips & Sauces", "Extra Toppings". Customers can select from each group.</p>

              {formData.addonGroups.map((group, gIdx) => (
                <div key={gIdx} className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <input
                      placeholder="Group name (e.g. Dips & Sauces)"
                      value={group.name}
                      onChange={(e) => updateAddonGroup(gIdx, "name", e.target.value)}
                      className="flex-1 px-4 py-3 bg-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Max select"
                      title="Maximum selections (0 = unlimited)"
                      value={group.maxSelections || ""}
                      onChange={(e) => updateAddonGroup(gIdx, "maxSelections", e.target.value)}
                      className="w-24 px-3 py-3 bg-white rounded-xl text-sm font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button type="button" onClick={() => toggleGroupCollapse(gIdx)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                      {collapsedGroups[gIdx] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <button type="button" onClick={() => removeAddonGroup(gIdx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {!collapsedGroups[gIdx] && (
                    <div className="space-y-2 pl-2">
                      {group.addons.map((addon, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-3">
                          <input
                            placeholder="Addon name"
                            value={addon.name}
                            onChange={(e) => updateAddon(gIdx, aIdx, "name", e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-white rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={addon.price}
                              onChange={(e) => updateAddon(gIdx, aIdx, "price", e.target.value)}
                              className="w-24 pl-7 pr-3 py-2.5 bg-white rounded-xl text-sm font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <button type="button" onClick={() => removeAddon(gIdx, aIdx)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addAddon(gIdx)}
                        className="flex items-center gap-1.5 px-3 py-2 text-emerald-600 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Plus size={12} /> Add Item
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button 
              type="submit"
              disabled={isSaving || isCompressing}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg active:scale-95 mt-4 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-slate-900 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                  <span>{isEditMode ? "Saving…" : "Creating…"}</span>
                </>
              ) : (
                isEditMode ? "Save Changes" : "Create Product"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}