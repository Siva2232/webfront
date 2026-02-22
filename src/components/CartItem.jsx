import { Trash2, Plus, Minus } from 'lucide-react';

export default function CartItem({ item, onUpdateQty, onRemove }) {
  // Determine if it's veg or non-veg for the indicator icon
  const isVeg = item.type?.toLowerCase() === "veg";

  return (
    <div className="group relative flex items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 mb-4">
      
      {/* Product Image Section */}
      <div className="relative w-24 h-24 shrink-0">
        <img 
          src={item.image || "https://via.placeholder.com/150"} 
          alt={item.name}
          className="w-full h-full object-cover rounded-2xl bg-slate-100"
        />
        {/* Quantity Badge on Image */}
        <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-lg">
          {item.qty}
        </div>
      </div>

      {/* Info Section */}
      <div className="flex-1 ml-5">
        <div className="flex items-center gap-2 mb-1">
          {/* Veg/Non-Veg Indicator Icon */}
          <div className={`w-3.5 h-3.5 border-2 flex items-center justify-center shrink-0 ${isVeg ? 'border-emerald-500' : 'border-red-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {item.category}
          </span>
        </div>

        <h4 className="font-black text-slate-900 text-base uppercase tracking-tight leading-tight">
          {item.name}
        </h4>
        
        <p className="text-xs font-bold text-slate-400 mt-1">
          ₹{item.price.toLocaleString('en-IN')} per unit
        </p>

        {/* Quantity Adjuster (Optional but recommended for Cart) */}
        <div className="flex items-center gap-3 mt-3">
            <p className="text-lg font-black text-slate-900">
                ₹{(item.price * item.qty).toLocaleString('en-IN')}
            </p>
        </div>
      </div>

      {/* Action Section */}
      <div className="flex flex-col items-end gap-3 px-2">
        <button
          onClick={() => onRemove(item.id)}
          className="p-3 rounded-2xl text-slate-300 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all duration-200"
          aria-label="Remove item"
        >
          <Trash2 size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Subtle Background Glow for Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 rounded-3xl -z-10 transition-opacity pointer-events-none" />
    </div>
  );
}