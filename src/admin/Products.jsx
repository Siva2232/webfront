import React, { useState, useMemo, useEffect } from "react";
import { useProducts } from "../context/ProductContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  Plus, Package, CheckCircle2, AlertCircle,
  Search, XCircle, RefreshCw, X, CheckCircle
} from "lucide-react";
import API from "../api/axios";
import ProductCard from "./products/components/ProductCard";
import EmptyState from "./products/components/EmptyState";
import DeleteProductModal from "./products/components/DeleteProductModal";
import StockChangeModal from "./products/components/StockChangeModal";
import AddProductModal from "./products/components/AddProductModal";
import { compressImage } from "./products/utils/compressImage";

export default function AdminProducts() {
  const { products, toggleAvailability, deleteProduct, addProduct, updateProduct, orderedCategories = [], addCategory, subitems = [] } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Modal state for delete confirmation
  const [deleteModal, setDeleteModal] = useState({ show: false, product: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state for stock out/restore confirmation
  const [stockModal, setStockModal] = useState({ show: false, product: null, type: "" }); // type: "out" | "restore"
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

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
  const libraryPortions = useMemo(() => subitems.filter(s => s.type === "portion"), [subitems]);
  const libraryAddonGroups = useMemo(() => subitems.filter(s => s.type === "addonGroup"), [subitems]);

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
    if (!product) return;
    
    // Open specialized modal instead of instant toggle
    setStockModal({
      show: true,
      product,
      type: product.isAvailable ? "out" : "restore"
    });
  };

  const confirmStockChange = async () => {
    if (!stockModal.product) return;
    setIsUpdatingStock(true);
    const { product, type } = stockModal;
    
    try {
      await toggleAvailability(product._id);
      if (type === "out") {
        toast.success(`${product.name} marked as sold out`, {
          icon: <XCircle size={18} className="text-rose-500" />,
        });
      } else {
        toast.success(`${product.name} restored to menu`, {
          icon: <CheckCircle size={18} className="text-emerald-500" />,
        });
      }
      setStockModal({ show: false, product: null, type: "" });
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingStock(false);
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
                      
                      const newPortions = [...(prod.portions || []), { name: lib.name, price: lib.price || 0, isAvailable: true }];
                      const id = toast.loading("Adding portion...");
                      try {
                        const updatedProduct = { ...prod, hasPortions: true, portions: newPortions };
                        await updateProduct(productId, updatedProduct);
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
                        isAvailable: true,
                        addons: (lib.addons || []).map(a => ({ name: a.name, price: a.price || 0 }))
                      };
                      const newGroups = [...(prod.addonGroups || []), newGroup];
                      const id = toast.loading("Adding group...");
                      try {
                        const updatedProduct = { ...prod, addonGroups: newGroups };
                        await updateProduct(productId, updatedProduct);
                        toast.success("Add-on Group added!", { id });
                      } catch(e) { toast.error("Failed to add group", { id }); }
                    }
                  }}
                />
              ))}
            </div>
          )}
        </main>

        <DeleteProductModal
          open={deleteModal.show}
          product={deleteModal.product}
          isDeleting={isDeleting}
          onClose={() => setDeleteModal({ show: false, product: null })}
          onConfirm={confirmDelete}
        />

        <StockChangeModal
          open={stockModal.show}
          product={stockModal.product}
          type={stockModal.type}
          isUpdating={isUpdatingStock}
          onClose={() => setStockModal({ show: false, product: null, type: "" })}
          onConfirm={confirmStockChange}
        />

        <AddProductModal
          open={showAddModal}
          isAdding={isAdding}
          isCompressing={isCompressing}
          orderedCategories={orderedCategories}
          libraryPortions={libraryPortions}
          libraryAddonGroups={libraryAddonGroups}
          collapsedGroups={collapsedGroups}
          onToggleGroupCollapse={toggleGroupCollapse}
          productForm={productForm}
          onChangeProductForm={setProductForm}
          newCategoryInput={newCategoryInput}
          onChangeNewCategoryInput={setNewCategoryInput}
          onAddCategory={handleAddCategory}
          onImageUpload={handleImageUpload}
          onClearImage={() => setProductForm({ ...productForm, image: "" })}
          onAddPortion={addPortion}
          onUpdatePortion={updatePortion}
          onRemovePortion={removePortion}
          onAddFromLibraryPortion={(libId) => {
            const lib = libraryPortions.find((l) => l._id === libId);
            if (!lib) return;
            const exists = productForm.portions.some((p) => p.name.toLowerCase() === lib.name.toLowerCase());
            if (exists) {
              toast.error(`"${lib.name}" already added`);
              return;
            }
            setProductForm((prev) => ({
              ...prev,
              portions: [...prev.portions, { name: lib.name, price: lib.price || "", isAvailable: true }],
            }));
          }}
          onAddAddonGroup={addAddonGroup}
          onUpdateAddonGroup={updateAddonGroup}
          onRemoveAddonGroup={removeAddonGroup}
          onAddAddon={addAddon}
          onUpdateAddon={updateAddon}
          onRemoveAddon={removeAddon}
          onAddFromLibraryGroup={(libId) => {
            const lib = libraryAddonGroups.find((l) => l._id === libId);
            if (!lib) return;
            const exists = productForm.addonGroups.some((g) => g.name.toLowerCase() === lib.name.toLowerCase());
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
                  isAvailable: true,
                  addons: (lib.addons || []).map((a) => ({ name: a.name, price: a.price || 0 })),
                },
              ],
            }));
          }}
          onClose={resetAddModal}
          onSubmit={handleAddProduct}
        />
      </div>
    </div>
  );
}