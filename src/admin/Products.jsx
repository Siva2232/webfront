import React, { useState, useMemo, useEffect } from "react";
import { useProducts } from "../context/ProductContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Plus, Package, CheckCircle2, AlertCircle, Edit3, Trash2, 
  IndianRupee, Search, Sparkles, XCircle, RefreshCw, X, CheckCircle, AlertTriangle, Upload, Image,
  ChevronDown, ChevronUp
} from "lucide-react";
import API from "../api/axios";

export default function AdminProducts() {
  const { products, toggleAvailability, deleteProduct, addProduct, updateProduct, orderedCategories = [], addCategory } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Modal state for delete confirmation
  const [deleteModal, setDeleteModal] = useState({ show: false, product: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state for adding product
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
    category: "",
    type: "veg",
    hasPortions: false,
    portions: [],
    addonGroups: [],
  });
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

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
        // silent
      }
    };
    fetchLibrary();
  }, []);

  // --- Portion helpers ---
  const addPortion = () => setProductForm(prev => ({ ...prev, portions: [...prev.portions, { name: "", price: "" }] }));
  const updatePortion = (idx, field, value) => {
    setProductForm(prev => {
      const newPortions = [...prev.portions];
      newPortions[idx] = { ...newPortions[idx], [field]: value };
      return { ...prev, portions: newPortions };
    });
  };
  const removePortion = (idx) => setProductForm(prev => ({ ...prev, portions: prev.portions.filter((_, i) => i !== idx) }));

  // --- Addon Group helpers ---
  const addAddonGroup = () => setProductForm(prev => ({ ...prev, addonGroups: [...prev.addonGroups, { name: "", maxSelections: 0, addons: [] }] }));
  const updateAddonGroup = (gIdx, field, value) => {
    setProductForm(prev => {
      const newGroups = [...prev.addonGroups];
      newGroups[gIdx] = { ...newGroups[gIdx], [field]: value };
      return { ...prev, addonGroups: newGroups };
    });
  };
  const removeAddonGroup = (gIdx) => setProductForm(prev => ({ ...prev, addonGroups: prev.addonGroups.filter((_, i) => i !== gIdx) }));

  const addAddon = (gIdx) => {
    setProductForm(prev => {
      const newGroups = [...prev.addonGroups];
      newGroups[gIdx].addons = [...newGroups[gIdx].addons, { name: "", price: "" }];
      return { ...prev, addonGroups: newGroups };
    });
  };
  const updateAddon = (gIdx, aIdx, field, value) => {
    setProductForm(prev => {
      const newGroups = [...prev.addonGroups];
      const newAddons = [...newGroups[gIdx].addons];
      newAddons[aIdx] = { ...newAddons[aIdx], [field]: value };
      newGroups[gIdx].addons = newAddons;
      return { ...prev, addonGroups: newGroups };
    });
  };
  const removeAddon = (gIdx, aIdx) => {
    setProductForm(prev => {
      const newGroups = [...prev.addonGroups];
      newGroups[gIdx].addons = newGroups[gIdx].addons.filter((_, j) => j !== aIdx);
      return { ...prev, addonGroups: newGroups };
    });
  };

  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroupCollapse = (idx) => setCollapsedGroups(prev => ({ ...prev, [idx]: !prev[idx] }));

  // Image compression helper
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = (MAX_WIDTH / width) * height;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    setIsCompressing(true);
    const compressed = await compressImage(file);
    setProductForm((prev) => ({ ...prev, image: compressed }));
    setIsCompressing(false);
  };

  const normalizeCategory = (str) =>
    str.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const handleAddCategory = async () => {
    const input = newCategoryInput.trim();
    if (!input) {
      toast.error("Please enter a category name");
      return;
    }
    const normalized = normalizeCategory(input);
    try {
      if (!orderedCategories.includes(normalized)) {
        await addCategory(normalized);
      }
      setProductForm((prev) => ({ ...prev, category: normalized }));
      setNewCategoryInput("");
      toast.success("Category added!");
    } catch (err) {
      toast.error("Failed to add category");
    }
  };

  const handleAddProduct = async () => {
    if (!productForm.name.trim() || !productForm.price || !productForm.description.trim() || !productForm.image || !productForm.category) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validation for portions
    if (productForm.hasPortions) {
      if (productForm.portions.length === 0) {
        toast.error("Add at least one portion when portions are enabled");
        return;
      }
      for (const p of productForm.portions) {
        if (!p.name?.trim()) { toast.error("Portion name cannot be empty"); return; }
        if (!p.price || Number(p.price) <= 0) { toast.error(`Price must be > 0 for portion "${p.name}"`); return; }
      }
      const names = productForm.portions.map(p => p.name.trim().toLowerCase());
      if (new Set(names).size !== names.length) { toast.error("Duplicate portion names are not allowed"); return; }
    }

    const cleanPortions = productForm.hasPortions
      ? productForm.portions.map(p => ({ name: p.name.trim(), price: Number(p.price) }))
      : [];

    const cleanAddonGroups = productForm.addonGroups
      .filter(g => g.name?.trim() && g.addons.length > 0)
      .map(g => ({
        name: g.name.trim(),
        maxSelections: Number(g.maxSelections) || 0,
        addons: g.addons
          .filter(a => a.name?.trim())
          .map(a => ({ name: a.name.trim(), price: Number(a.price) || 0 })),
      }));

    setIsAdding(true);
    try {
      await addProduct({
        name: productForm.name.trim(),
        price: Number(productForm.price),
        description: productForm.description.trim(),
        image: productForm.image,
        category: productForm.category,
        type: productForm.type,
        available: true,
        hasPortions: productForm.hasPortions,
        portions: cleanPortions,
        addonGroups: cleanAddonGroups,
      });
      toast.success("Product created successfully!", {
        icon: <CheckCircle size={18} className="text-emerald-500" />,
      });
      setShowAddModal(false);
      setProductForm({ name: "", price: "", description: "", image: "", category: "", type: "veg", hasPortions: false, portions: [], addonGroups: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add product");
    } finally {
      setIsAdding(false);
    }
  };

  const resetAddModal = () => {
    setShowAddModal(false);
    setProductForm({ name: "", price: "", description: "", image: "", category: "", type: "veg", hasPortions: false, portions: [], addonGroups: [] });
    setNewCategoryInput("");
  };

  // Handle toggle availability with toast
  const handleToggleAvailability = async (productId) => {
    const product = products.find(p => p._id === productId);
    try {
      await toggleAvailability(productId);
      if (product?.isAvailable) {
        toast.success(`${product.name} marked as sold out`, {
          icon: <XCircle size={18} className="text-rose-500" />,
        });
      } else {
        toast.success(`${product.name} is now available`, {
          icon: <CheckCircle size={18} className="text-emerald-500" />,
        });
      }
    } catch (error) {
      toast.error("Failed to update availability");
    }
  };

  // Handle delete with modal
  const handleDeleteClick = (product) => {
    setDeleteModal({ show: true, product });
  };

  const confirmDelete = async () => {
    if (!deleteModal.product) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deleteModal.product._id);
      toast.success(`${deleteModal.product.name} deleted successfully`, {
        icon: <Trash2 size={18} className="text-rose-500" />,
      });
      setDeleteModal({ show: false, product: null });
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  // read query param once on mount
  useEffect(() => {
    const f = searchParams.get("filter");
    if (f) {
      setFilter(f);
      if (f === "out-of-stock") {
        setSearchTerm("");
        // react-hot-toast doesn't include an "info" helper; use default toast or custom icon
        toast("Showing only sold-out items");
      }
    }
  }, [searchParams]);

  // Filter logic for search and optional out‑of‑stock filter
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let list = products;
    if (filter === "out-of-stock") {
      list = list.filter(p => !p.isAvailable);
    }
    if (term) {
      list = list.filter(p => p.name.toLowerCase().includes(term));
    }
    return list;
  }, [products, searchTerm, filter]);

  const stats = [
    { label: "Assets", value: products.length, icon: Package, color: "indigo" },
    { label: "Live", value: products.filter(p => p.isAvailable).length, icon: CheckCircle2, color: "emerald" },
    { label: "Sold Out", value: products.filter(p => !p.isAvailable).length, icon: AlertCircle, color: "rose" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-8 lg:p-12 font-sans text-slate-950">
      <div className="max-w-[1400px] mx-auto space-y-12">
        
        {/* --- PREMIUM HEADER --- */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-10 bg-indigo-600 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Inventory Management</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-950">
              Product <span className="text-slate-300 font-light italic">Vault</span>
            </h1>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
            {filter === "out-of-stock" && (
              <div className="w-full md:w-auto bg-rose-50 text-rose-600 px-4 py-2 rounded-[1.5rem] font-bold uppercase text-[10px] tracking-widest text-center">
                Showing only sold‑out items
              </div>
            )}
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search collection..."
                className="pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] w-full shadow-sm focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all font-medium"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full md:w-auto bg-slate-950 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-indigo-600 transition-all shadow-xl hover:shadow-indigo-200 active:scale-95 flex items-center justify-center gap-3"
            >
              <Plus size={18} />
              Add New Product
            </button>
          </div>
        </header>

        {/* --- ANALYTICS HUD --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div 
              key={i}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-150 flex items-center justify-between group"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                <p className="text-4xl font-black text-slate-950 tracking-tighter italic">{stat.value}</p>
              </div>
              <div className={`p-5 rounded-2xl 
                ${stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 
                  stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 
                  'bg-rose-50 text-rose-600'}`}>
                <stat.icon size={28} strokeWidth={2.5} />
              </div>
            </div>
          ))}
        </section>

        {/* --- PRODUCT GRID --- */}
        <main>
          {filteredProducts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {filteredProducts.map((p) => (
                <ProductCard 
                  key={p._id} 
                  product={p} 
                  onToggle={handleToggleAvailability} 
                  onDelete={() => handleDeleteClick(p)}
                  onEdit={(id) => navigate(`/admin/products/edit/${id}`)}
                  libraryPortions={libraryPortions}
                  libraryAddonGroups={libraryAddonGroups}
                  onQuickAdd={async (productId, type, libId) => {
                    const prod = products.find(px => px._id === productId);
                    if (!prod) return;

                    if (type === 'portion') {
                      const lib = libraryPortions.find(l => l._id === libId);
                      if (!lib) return;
                      const exists = prod.portions?.some(po => po.name.toLowerCase() === lib.name.toLowerCase());
                      if (exists) { toast.error(`"${lib.name}" is already on this product`); return; }
                      
                      const newPortions = [...(prod.portions || []), { name: lib.name, price: lib.price || 0 }];
                      const id = toast.loading("Adding portion...");
                      try {
                        await updateProduct(productId, { ...prod, hasPortions: true, portions: newPortions });
                        toast.success("Portion added!", { id });
                      } catch(e) { toast.error("Failed to add portion", { id }); }
                    } else {
                      const lib = libraryAddonGroups.find(l => l._id === libId);
                      if (!lib) return;
                      const exists = prod.addonGroups?.some(g => g.name.toLowerCase() === lib.name.toLowerCase());
                      if (exists) { toast.error(`"${lib.name}" is already on this product`); return; }
                      
                      const newGroup = {
                        name: lib.name,
                        maxSelections: lib.maxSelections || 0,
                        addons: (lib.addons || []).map(a => ({ name: a.name, price: a.price || 0 }))
                      };
                      const newGroups = [...(prod.addonGroups || []), newGroup];
                      const id = toast.loading("Adding group...");
                      try {
                        await updateProduct(productId, { ...prod, addonGroups: newGroups });
                        toast.success("Add-on Group added!", { id });
                      } catch(e) { toast.error("Failed to add group", { id }); }
                    }
                  }}
                />
              ))}
            </div>
          )}
        </main>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteModal.show && deleteModal.product && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => !isDeleting && setDeleteModal({ show: false, product: null })}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 bg-rose-500 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={24} />
                      <h3 className="text-lg font-black uppercase tracking-tight">Delete Product</h3>
                    </div>
                    <button 
                      onClick={() => setDeleteModal({ show: false, product: null })}
                      disabled={isDeleting}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  {/* Product Preview */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    {deleteModal.product.image && (
                      <img 
                        src={deleteModal.product.image} 
                        alt={deleteModal.product.name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    )}
                    <div>
                      <p className="font-black text-lg uppercase tracking-tight">{deleteModal.product.name}</p>
                      <p className="text-indigo-600 font-bold">₹{deleteModal.product.price}</p>
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm">
                    Are you sure you want to delete <strong>{deleteModal.product.name}</strong>? This action cannot be undone.
                  </p>
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-slate-50 flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ show: false, product: null })}
                    disabled={isDeleting}
                    className="flex-1 px-6 py-4 border-2 border-slate-200 font-bold uppercase text-xs tracking-widest rounded-xl hover:border-slate-300 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex-1 px-6 py-4 bg-rose-500 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete Product
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Product Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => !isAdding && !isCompressing && resetAddModal()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 bg-slate-950 text-white shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Plus size={24} />
                      <h3 className="text-lg font-black uppercase tracking-tight">Add New Product</h3>
                    </div>
                    <button 
                      onClick={resetAddModal}
                      disabled={isAdding || isCompressing}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Body - Scrollable */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Margherita Pizza"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 outline-none transition-colors"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Price <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        className="w-full border-2 border-slate-100 rounded-xl pl-10 pr-4 py-3 font-bold text-lg focus:border-indigo-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Description <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Short description"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 outline-none transition-colors"
                    />
                  </div>

                  {/* Food Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Food Type <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, type: "veg" })}
                        className={`py-3 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                          productForm.type === "veg"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                            : "border-slate-100 text-slate-400 hover:border-slate-200"
                        }`}
                      >
                        🟢 Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, type: "non-veg" })}
                        className={`py-3 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                          productForm.type === "non-veg"
                            ? "bg-rose-50 border-rose-500 text-rose-600"
                            : "border-slate-100 text-slate-400 hover:border-slate-200"
                        }`}
                      >
                        🔴 Non-Veg
                      </button>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 outline-none transition-colors"
                    >
                      <option value="" disabled>Select a category</option>
                      {orderedCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Add New Category */}
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Or add new category</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="e.g. Desserts"
                        className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-indigo-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Product Image <span className="text-rose-500">*</span>
                    </label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
                      productForm.image ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}>
                      {isCompressing ? (
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></span>
                          Compressing...
                        </div>
                      ) : productForm.image ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-medium">
                          <CheckCircle size={20} />
                          Image selected
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Upload size={24} />
                          <span className="text-sm font-medium">Click to upload image</span>
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
                  </div>

                  {/* Image Preview */}
                  {productForm.image && (
                    <div className="relative rounded-xl overflow-hidden border shadow-inner">
                      <img
                        src={productForm.image}
                        alt="Preview"
                        className="w-full h-40 object-cover"
                      />
                      <button
                        onClick={() => setProductForm({ ...productForm, image: "" })}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* ============ PORTIONS SECTION ============ */}
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enable Portions</label>
                      <button
                        type="button"
                        onClick={() => setProductForm(prev => ({ ...prev, hasPortions: !prev.hasPortions }))}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          productForm.hasPortions ? "bg-indigo-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                            productForm.hasPortions ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {productForm.hasPortions && (
                      <div className="space-y-3 pl-2">
                        <p className="text-[10px] text-slate-400 font-medium">E.g. Half, Full, Family Pack. Each portion has its own price.</p>
                        {productForm.portions.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <input
                              placeholder="Portion name"
                              value={p.name}
                              onChange={(e) => updatePortion(idx, "name", e.target.value)}
                              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                            />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">₹</span>
                              <input
                                type="number"
                                placeholder="Price"
                                value={p.price}
                                onChange={(e) => updatePortion(idx, "price", e.target.value)}
                                className="w-28 pl-7 pr-3 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black outline-none focus:border-indigo-500"
                              />
                            </div>
                            <button type="button" onClick={() => removePortion(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={addPortion}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                          >
                            <Plus size={14} /> Add Portion
                          </button>
                          {libraryPortions.length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                const lib = libraryPortions.find((l) => l._id === e.target.value);
                                if (lib) {
                                  const exists = productForm.portions.some(
                                    (p) => p.name.toLowerCase() === lib.name.toLowerCase()
                                  );
                                  if (exists) {
                                    toast.error(`"${lib.name}" already added`);
                                    return;
                                  }
                                  setProductForm((prev) => ({
                                    ...prev,
                                    portions: [...prev.portions, { name: lib.name, price: lib.price || "" }],
                                  }));
                                }
                              }}
                              className="px-3 py-2.5 bg-violet-50 text-violet-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-violet-200 outline-none cursor-pointer"
                            >
                              <option value="">Pick from Library</option>
                              {libraryPortions
                                .filter((lp) => lp.isAvailable !== false)
                                .map((lp) => (
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
                                const exists = productForm.addonGroups.some(
                                  (g) => g.name.toLowerCase() === lib.name.toLowerCase()
                                );
                                if (exists) {
                                  toast.error(`"${lib.name}" already added`);
                                  return;
                                }
                                setProductForm((prev) => ({
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
                            {libraryAddonGroups
                              .filter((lg) => lg.isAvailable !== false)
                              .map((lg) => (
                                <option key={lg._id} value={lg._id}>
                                  {lg.name} ({lg.addons?.length || 0} items)
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Create groups like "Dips & Sauces", "Extra Toppings".</p>

                    {productForm.addonGroups.map((group, gIdx) => (
                      <div key={gIdx} className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <input
                            placeholder="Group name"
                            value={group.name}
                            onChange={(e) => updateAddonGroup(gIdx, "name", e.target.value)}
                            className="flex-1 px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="Max"
                            title="Maximum selections (0 = unlimited)"
                            value={group.maxSelections || ""}
                            onChange={(e) => updateAddonGroup(gIdx, "maxSelections", e.target.value)}
                            className="w-20 px-3 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-500"
                          />
                          <button type="button" onClick={() => toggleGroupCollapse(gIdx)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                            {collapsedGroups[gIdx] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                          </button>
                          <button type="button" onClick={() => removeAddonGroup(gIdx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
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
                                  className="flex-1 px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-500"
                                />
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={addon.price}
                                    onChange={(e) => updateAddon(gIdx, aIdx, "price", e.target.value)}
                                    className="w-24 pl-7 pr-3 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <button type="button" onClick={() => removeAddon(gIdx, aIdx)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
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

                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-slate-50 flex gap-3 shrink-0 border-t border-slate-100">
                  <button
                    onClick={resetAddModal}
                    disabled={isAdding || isCompressing}
                    className="flex-1 px-6 py-4 border-2 border-slate-200 font-bold uppercase text-xs tracking-widest rounded-xl hover:border-slate-300 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProduct}
                    disabled={isAdding || isCompressing}
                    className="flex-1 px-6 py-4 bg-slate-950 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAdding ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Add Product
                      </>
                    )}
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

function ProductCard({ product, onToggle, onDelete, onEdit, libraryPortions = [], libraryAddonGroups = [], onQuickAdd }) {
  return (
    <div className="group relative">
      <div className={`relative bg-white rounded-[3rem] overflow-hidden border transition-shadow duration-150 hover:shadow-lg flex flex-col h-full
        ${product.isAvailable ? 'border-slate-100 shadow-sm' : 'border-rose-100 shadow-none opacity-90'}
      `}>
        
        {/* IMAGE SECTION */}
        <div className="relative aspect-[11/13] overflow-hidden bg-slate-100 shrink-0">
          <img
            src={product.image || "https://images.unsplash.com/photo-1546213271-73fca27ad291"}
            alt={product.name}
            className={`w-full h-full object-cover 
              ${!product.isAvailable && "grayscale blur-[2px] contrast-75"}`}
          />
          
          {/* Status Overlay Badge */}
          <div className="absolute top-6 left-6">
            <div className={`px-4 py-2 rounded-2xl backdrop-blur-xl border text-[10px] font-black uppercase tracking-widest shadow-xl transition-all
                ${product.isAvailable 
                  ? "bg-white/90 text-emerald-600 border-white/20" 
                  : "bg-rose-600 text-white border-rose-400"}
            `}>
              {product.isAvailable ? "● Live" : "✕ Sold Out"}
            </div>
          </div>
        </div>

        {/* CONTENT SECTION */}
        <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-950 truncate tracking-tight uppercase italic transition-colors group-hover:text-indigo-600">
                {product.name}
              </h3>
              <div className="flex items-center gap-1.5 text-indigo-600 font-black">
                <IndianRupee size={16} strokeWidth={3} />
                <span className="text-2xl tracking-tighter italic">{product.price.toLocaleString()}</span>
              </div>
            </div>

            {/* Portions & Add-on badges */}
            {((product.hasPortions && product.portions?.length > 0) || product.addonGroups?.length > 0) && (
              <div className="space-y-2">
                {product.hasPortions && product.portions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.portions.map((p, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-lg">
                        {p.name} — ₹{p.price}
                      </span>
                    ))}
                  </div>
                )}
                {product.addonGroups?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.addonGroups.map((g, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-lg">
                        {g.name} ({g.addons?.length || 0})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* QUICK ADD BUTTONS */}
            {(libraryPortions.length > 0 || libraryAddonGroups.length > 0) && (
              <div className="flex gap-2 border-t border-slate-50 pt-4">
                {libraryPortions.length > 0 && (
                  <div className="flex-1 relative">
                    <select 
                      value=""
                      onChange={(e) => {
                        if(e.target.value) onQuickAdd(product._id, 'portion', e.target.value);
                      }}
                      className="w-full appearance-none bg-blue-50/50 text-blue-700 font-bold text-[9px] uppercase tracking-wider py-2.5 pl-3 pr-6 rounded-xl border border-blue-100 outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                    >
                      <option value="" disabled>+ Portion</option>
                      {libraryPortions
                        .filter(lp => lp.isAvailable !== false)
                        .map(lp => (
                          <option key={lp._id} value={lp._id}>{lp.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                  </div>
                )}

                {libraryAddonGroups.length > 0 && (
                  <div className="flex-1 relative">
                    <select 
                      value=""
                      onChange={(e) => {
                        if(e.target.value) onQuickAdd(product._id, 'group', e.target.value);
                      }}
                      className="w-full appearance-none bg-emerald-50/50 text-emerald-700 font-bold text-[9px] uppercase tracking-wider py-2.5 pl-3 pr-6 rounded-xl border border-emerald-100 outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
                    >
                      <option value="" disabled>+ Group</option>
                      {libraryAddonGroups
                        .filter(lg => lg.isAvailable !== false)
                        .map(lg => (
                          <option key={lg._id} value={lg._id}>{lg.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                  </div>
                )}
              </div>
            )}

            {/* CLEAR AVAILABILITY TOGGLE (The Primary Action) */}
            <button 
              onClick={() => onToggle(product._id)}
              className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 flex items-center justify-center gap-2
                ${product.isAvailable 
                  ? "bg-white border-slate-100 text-slate-400 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50" 
                  : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                }`}
            >
              {product.isAvailable ? (
                <><XCircle size={14} /> Stop Selling</>
              ) : (
                <><RefreshCw size={14} /> Restore to Menu</>
              )}
            </button>

            {/* SECONDARY ACTIONS (Edit & Delete) */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
              <button 
                onClick={() => onEdit(product._id)}
                className="flex items-center justify-center gap-2 py-4 bg-slate-950 text-white rounded-2xl transition-all duration-300 hover:bg-indigo-600 shadow-lg shadow-slate-100"
              >
                <Edit3 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
              </button>
              <button 
                onClick={() => onDelete()}
                className="flex items-center justify-center gap-2 py-4 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white rounded-2xl transition-all duration-300"
              >
                <Trash2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Trash</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-40 bg-white border border-slate-100 rounded-[4rem] shadow-sm text-center">
    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100">
      <Sparkles className="text-indigo-400" size={40} />
    </div>
    <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">The Vault is Clear</h3>
    <p className="text-slate-400 font-medium max-w-sm mx-auto mt-3">Ready to curate your next masterpiece? Add your first product to the gallery above.</p>
  </div>
);