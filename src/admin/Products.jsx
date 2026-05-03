import React, { useState, useMemo, useEffect } from "react";
import { useProducts } from "../context/ProductContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus,
  Package,
  CheckCircle2,
  AlertCircle,
  Search,
  XCircle,
  RefreshCw,
  CheckCircle,
  Trash2,
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
    { label: "Total items", value: products.length, icon: Package, color: "zinc" },
    { label: "On menu", value: products.filter((p) => p.isAvailable).length, icon: CheckCircle2, color: "emerald" },
    { label: "Sold out", value: products.filter((p) => !p.isAvailable).length, icon: AlertCircle, color: "rose" },
  ];

  return (
    <div className="relative min-h-full bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-12 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(24,24,27,0.05),transparent)]"
        aria-hidden
      />
      <div className="mx-auto max-w-[1400px] space-y-10 px-4 pt-8 sm:px-6 lg:space-y-12 lg:px-8 lg:pt-10">
        <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/20">
              <Package size={26} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Catalog</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">Products</h1>
              <p className="mt-1 max-w-lg text-sm text-zinc-500">
                Manage menu items, availability, and portions — aligned with your live POS catalog.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:max-w-xl md:flex-row md:items-center xl:w-auto xl:max-w-none">
            {filter === "out-of-stock" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-rose-700">
                Sold-out filter active
              </div>
            )}
            <div className="relative flex-1 md:min-w-[240px]">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Search products…"
                className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-zinc-800 active:scale-[0.99]"
            >
              <Plus size={18} strokeWidth={2.5} />
              Add product
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100/80 transition hover:border-zinc-300"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">{stat.label}</p>
                <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-zinc-900">{stat.value}</p>
              </div>
              <div
                className={`rounded-xl p-4 ${
                  stat.color === "zinc"
                    ? "bg-zinc-100 text-zinc-700"
                    : stat.color === "emerald"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                }`}
              >
                <stat.icon size={24} strokeWidth={2.25} />
              </div>
            </div>
          ))}
        </section>

        <main>
          {filteredProducts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-8">
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