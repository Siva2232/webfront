import React, { useMemo } from "react";
import {
  ChevronDown,
  Edit3,
  IndianRupee,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";

export default function ProductCard({
  product,
  onToggle,
  onDelete,
  onEdit,
  libraryPortions = [],
  libraryAddonGroups = [],
  onQuickAdd,
}) {
  const cardContent = useMemo(
    () => (
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

          {((product.hasPortions && product.portions?.length > 0) || product.addonGroups?.length > 0) && (
            <div className="space-y-2">
              {product.hasPortions && product.portions?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.portions.map((p, i) => (
                    <span
                      key={i}
                      className={`px-2.5 py-1 text-[9px] font-bold rounded-lg flex items-center gap-1 ${
                        p.isAvailable === false
                          ? "bg-rose-50 text-rose-500 border border-rose-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}
                    >
                      {p.name} — ₹{p.price}
                      <span
                        className={`text-[7px] font-black uppercase ml-1 px-1 rounded ${
                          p.isAvailable === false
                            ? "bg-rose-100 text-rose-500"
                            : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        {p.isAvailable === false ? "Stock Out" : "Stock In"}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {product.addonGroups?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.addonGroups.map((g, i) => (
                    <span
                      key={i}
                      className={`px-2.5 py-1 text-[9px] font-bold rounded-lg flex items-center gap-1 ${
                        g.isAvailable === false
                          ? "bg-rose-50 text-rose-500 border border-rose-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}
                    >
                      {g.name} ({g.addons?.length || 0})
                      <span
                        className={`text-[7px] font-black uppercase ml-1 px-1 rounded ${
                          g.isAvailable === false
                            ? "bg-rose-100 text-rose-500"
                            : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        {g.isAvailable === false ? "Stock Out" : "Stock In"}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {(libraryPortions.length > 0 || libraryAddonGroups.length > 0) && (
            <div className="flex gap-2 border-t border-slate-50 pt-4">
              {libraryPortions.length > 0 && (
                <div className="flex-1 relative">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onQuickAdd(product._id, "portion", e.target.value);
                    }}
                    className="w-full appearance-none bg-blue-50/50 text-blue-700 font-bold text-[9px] uppercase tracking-wider py-2.5 pl-3 pr-6 rounded-xl border border-blue-100 outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <option value="" disabled>
                      + Portion
                    </option>
                    {(() => {
                      const groups = {};
                      const ungrouped = [];
                      libraryPortions
                        .filter((lp) => lp.isAvailable !== false)
                        .forEach((lp) => {
                          if (lp.category) {
                            if (!groups[lp.category]) groups[lp.category] = [];
                            groups[lp.category].push(lp);
                          } else {
                            ungrouped.push(lp);
                          }
                        });
                      return (
                        <>
                          {Object.entries(groups).map(([category, items]) => (
                            <optgroup key={category} label={category.toUpperCase()}>
                              {items.map((lp) => (
                                <option key={lp._id} value={lp._id}>
                                  {lp.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          {ungrouped.length > 0 && (
                            <optgroup label="INDIVIDUAL">
                              {ungrouped.map((lp) => (
                                <option key={lp._id} value={lp._id}>
                                  {lp.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none"
                  />
                </div>
              )}

              {libraryAddonGroups.length > 0 && (
                <div className="flex-1 relative">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onQuickAdd(product._id, "group", e.target.value);
                    }}
                    className="w-full appearance-none bg-emerald-50/50 text-emerald-700 font-bold text-[9px] uppercase tracking-wider py-2.5 pl-3 pr-6 rounded-xl border border-emerald-100 outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
                  >
                    <option value="" disabled>
                      + Group
                    </option>
                    {libraryAddonGroups
                      .filter((lg) => lg.isAvailable !== false)
                      .map((lg) => (
                        <option key={lg._id} value={lg._id}>
                          {lg.name}
                        </option>
                      ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none"
                  />
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => onToggle(product._id)}
            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 flex items-center justify-center gap-2
            ${
              product.isAvailable
                ? "bg-white border-slate-100 text-slate-400 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50"
                : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white"
            }`}
          >
            {product.isAvailable ? (
              <>
                <XCircle size={14} /> Stop Selling
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Restore to Menu
              </>
            )}
          </button>

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
    ),
    [product, libraryPortions, libraryAddonGroups, onToggle, onEdit, onDelete, onQuickAdd]
  );

  return (
    <div className="group relative">
      <div
        className={`relative bg-white rounded-[3rem] overflow-hidden border transition-shadow duration-150 hover:shadow-lg flex flex-col h-full
        ${product.isAvailable ? "border-slate-100 shadow-sm" : "border-rose-100 shadow-none opacity-90"}
      `}
      >
        <div className="relative aspect-[11/13] overflow-hidden bg-slate-100 shrink-0">
          <img
            src={product.image || "https://images.unsplash.com/photo-1546213271-73fca27ad291"}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover ${!product.isAvailable && "grayscale blur-[2px] contrast-75"}`}
          />

          <div className="absolute top-6 left-6">
            <div
              className={`px-4 py-2 rounded-2xl backdrop-blur-xl border text-[10px] font-black uppercase tracking-widest shadow-xl transition-all
                ${
                  product.isAvailable
                    ? "bg-white/90 text-emerald-600 border-white/20"
                    : "bg-rose-600 text-white border-rose-400"
                }
            `}
            >
              {product.isAvailable ? "● Live" : "✕ Sold Out"}
            </div>
          </div>
        </div>

        {cardContent}
      </div>
    </div>
  );
}

