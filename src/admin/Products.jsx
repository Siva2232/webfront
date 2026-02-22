import React, { useState, useMemo } from "react";
import { useProducts } from "../context/ProductContext";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Package, CheckCircle2, AlertCircle, Edit3, Trash2, 
  IndianRupee, Search, Sparkles, XCircle, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminProducts() {
  const { products, toggleAvailability, deleteProduct } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Filter logic for search
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const stats = [
    { label: "Assets", value: products.length, icon: Package, color: "indigo" },
    { label: "Live", value: products.filter(p => p.isAvailable).length, icon: CheckCircle2, color: "emerald" },
    { label: "Hidden", value: products.filter(p => !p.isAvailable).length, icon: AlertCircle, color: "rose" },
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
              onClick={() => navigate("/admin/products/add")}
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
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_20px_40px_rgba(0,0,0,0.02)] flex items-center justify-between group"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                <p className="text-4xl font-black text-slate-950 tracking-tighter italic">{stat.value}</p>
              </div>
              <div className={`p-5 rounded-2xl transition-transform duration-500 group-hover:scale-110 
                ${stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 
                  stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 
                  'bg-rose-50 text-rose-600'}`}>
                <stat.icon size={28} strokeWidth={2.5} />
              </div>
            </motion.div>
          ))}
        </section>

        {/* --- PRODUCT GRID --- */}
        <main>
          <AnimatePresence mode="popLayout">
            {filteredProducts.length === 0 ? (
              <EmptyState />
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10"
              >
                {filteredProducts.map((p) => (
                  <ProductCard 
                    key={p._id} 
                    product={p} 
                    onToggle={toggleAvailability} 
                    onDelete={() => {
                      if(window.confirm(`Delete ${p.name}?`)) deleteProduct(p._id)
                    }}
                    onEdit={(id) => navigate(`/admin/products/edit/${id}`)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function ProductCard({ product, onToggle, onDelete, onEdit }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative"
    >
      <div className={`relative bg-white rounded-[3rem] overflow-hidden border transition-all duration-700 hover:-translate-y-3 hover:shadow-2xl 
        ${product.isAvailable ? 'border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]' : 'border-rose-100 shadow-none opacity-90'}
      `}>
        
        {/* IMAGE SECTION */}
        <div className="relative aspect-[11/13] overflow-hidden bg-slate-100">
          <img
            src={product.image || "https://images.unsplash.com/photo-1546213271-73fca27ad291"}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110 
              ${!product.isAvailable && "grayscale blur-[2px] contrast-75"}`}
          />
          
          {/* Status Overlay Badge */}
          <div className="absolute top-6 left-6">
            <div className={`px-4 py-2 rounded-2xl backdrop-blur-xl border text-[10px] font-black uppercase tracking-widest shadow-xl transition-all
                ${product.isAvailable 
                  ? "bg-white/90 text-emerald-600 border-white/20" 
                  : "bg-rose-600 text-white border-rose-400"}
            `}>
              {product.isAvailable ? "● Live" : "✕ Hidden"}
            </div>
          </div>
        </div>

        {/* CONTENT SECTION */}
        <div className="p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-950 truncate tracking-tight uppercase italic transition-colors group-hover:text-indigo-600">
              {product.name}
            </h3>
            <div className="flex items-center gap-1.5 text-indigo-600 font-black">
              <IndianRupee size={16} strokeWidth={3} />
              <span className="text-2xl tracking-tighter italic">{product.price.toLocaleString()}</span>
            </div>
          </div>

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
    </motion.div>
  );
}

const EmptyState = () => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center py-40 bg-white border border-slate-100 rounded-[4rem] shadow-sm text-center"
  >
    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100">
      <Sparkles className="text-indigo-400" size={40} />
    </div>
    <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">The Vault is Clear</h3>
    <p className="text-slate-400 font-medium max-w-sm mx-auto mt-3">Ready to curate your next masterpiece? Add your first product to the gallery above.</p>
  </motion.div>
);