import { useCart, TAKEAWAY_TABLE } from "../context/CartContext";
import { useProducts } from "../context/ProductContext";
import ProductCard from "../components/ProductCard";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingCart,
  Utensils,
  ArrowRight,
  Filter,
  ChevronDown,
  X,
  Package,
  ChevronLeft,
  ReceiptText
} from "lucide-react";

export default function AdminProductsOrdering() {
  const { addToCart, removeFromCart, cart = [], table, setTable } = useCart();
  const { products, orderedCategories } = useProducts();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const sectionRefs = useRef({});

  const urlTable = searchParams.get("table");
  const isTakeaway = table === TAKEAWAY_TABLE;

  useEffect(() => {
    if (urlTable && urlTable.trim() !== "") {
      const cleanTable = urlTable.trim().replace(/^0+/, "") || "1";
      setTable(cleanTable);
    }
  }, [urlTable, setTable]);

  const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  const trimmedQuery = searchQuery.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!trimmedQuery || !products) return [];
    return products
      .filter((product) => {
        const name = String(product.name || "").toLowerCase();
        return name.split(/\s+/).some((word) => word.startsWith(trimmedQuery));
      })
      .slice(0, 6);
  }, [products, trimmedQuery]);

  const filteredProductsBySearch = useMemo(() => {
    const list = products || [];
    if (!trimmedQuery) return list;
    return list.filter((product) =>
      product.name?.toLowerCase().includes(trimmedQuery) ||
      product.category?.name?.toLowerCase().includes(trimmedQuery) ||
      product.category?.toLowerCase?.().includes(trimmedQuery)
    );
  }, [products, trimmedQuery]);

  const categories = useMemo(() => {
    if (orderedCategories?.length > 0) return orderedCategories;
    const catSet = new Set();
    products?.forEach(p => {
      const name = p.category?.name || p.category;
      if (name) catSet.add(name);
    });
    return Array.from(catSet).sort();
  }, [orderedCategories, products]);

  const totalMatches = useMemo(() => {
    if (!categories || categories.length === 0) return 0;
    return categories.reduce((sum, cat) => {
      const catName = cat.name || cat;
      const catProducts = filteredProductsBySearch.filter((p) => (p.category?.name || p.category) === catName);
      return sum + catProducts.length;
    }, 0);
  }, [categories, filteredProductsBySearch]);

  const scrollToCategory = (catName) => {
    sectionRefs.current[catName]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsCategoryOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate("/admin/tables")}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                title="Go back to floor plan"
              >
                <ChevronLeft size={24} className="text-slate-900" />
              </button>
              <div>
                <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Admin Ordering</h1>
                <p className="text-lg font-black text-slate-900 uppercase leading-none">
                  {isTakeaway ? "Takeaway Order" : `Table ${table || urlTable}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(`/admin/order-summary?table=${table || urlTable}`)}
                className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"
                title="View Active Bill"
              >
                <ReceiptText size={20} className="text-slate-600" />
              </button>
              <button 
                onClick={() => navigate("/admin/cart")}
                className="relative p-3 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={18} strokeWidth={2.5} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-100 border-none text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
              />

              {trimmedQuery && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion._id || suggestion.id}
                      type="button"
                      onClick={() => setSearchQuery(suggestion.name)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50"
                    >
                      {suggestion.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="px-4 py-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-tight shadow-sm"
            >
              <Filter size={16} />
              Menu
              <ChevronDown size={14} className={`transition-transform duration-300 ${isCategoryOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dropdown for category quick scroll */}
        <AnimatePresence>
          {isCategoryOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full bg-white border-b border-slate-100 shadow-xl z-40 p-6 overflow-x-auto"
            >
              <div className="flex flex-wrap gap-2 max-w-7xl mx-auto">
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToCategory(cat.name || cat)}
                    className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100/50 text-xs font-black uppercase hover:bg-indigo-500 hover:text-white transition-all whitespace-nowrap"
                  >
                    {cat.name || cat}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Product List Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 pb-32">
        {totalMatches === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Search size={26} className="text-slate-300" />
            </div>
            <h2 className="text-lg font-black text-slate-900">No items match your search</h2>
            <p className="text-sm text-slate-500 mt-2">Try a different menu name, ingredient, or go back to full list.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 font-black rounded-lg hover:bg-slate-200"
            >
              Clear Search
            </button>
          </div>
        ) : (
          categories.map((cat) => {
            const catName = cat.name || cat;
            const catProducts = filteredProductsBySearch?.filter(p => (p.category?.name || p.category) === catName) || [];
            
            if (catProducts.length === 0) return null;

            return (
              <section key={catName} ref={el => sectionRefs.current[catName] = el} className="mb-12">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{catName}</h2>
                <div className="h-0.5 flex-1 bg-slate-100 rounded-full" />
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">{catProducts.length} Items</span>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {catProducts.map((product) => (
                   <ProductCard 
                     key={product._id} 
                     product={product} 
                     initialQty={cart.filter(i => (i._id || i.id) === (product._id || product.id)).reduce((s, i) => s + i.qty, 0)}
                     onAdd={() => addToCart(product)}
                     onRemove={() => removeFromCart(product._id || product.id)}
                     onAddConfigured={(configuredItem) => addToCart(configuredItem)}
                   />
                ))}
              </div>
            </section>
          );
        }))}
      </main>

      {/* Fixed bottom checkout indicator */}
      {totalItems > 0 && (
         <div className="fixed bottom-6 inset-x-0 px-6 z-50">
            <button 
                onClick={() => navigate("/admin/cart")}
                className="max-w-md mx-auto w-full bg-slate-900 text-white h-16 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] flex items-center justify-between px-8 hover:scale-[0.98] transition-transform active:scale-95"
            >
                <div className="flex items-center gap-4">
                    <span className="bg-indigo-500 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] shadow-lg border-2 border-slate-900/30">
                        {totalItems}
                    </span>
                    Review Order
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px] font-black tracking-widest mr-2 uppercase">Proceed</span>
                    <ArrowRight size={20} strokeWidth={3} />
                </div>
            </button>
         </div>
      )}
    </div>
  );
}
