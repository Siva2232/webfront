import React from "react";
import { Search } from "lucide-react";
import ProductCard from "./ProductCard";

export default function ProductSelection({
  filteredProducts,
  itemsMap,
  searchQuery,
  onSearchQueryChange,
  onAdjustQty,
  onToggleTakeaway,
  onOpenCustomise,
}) {
  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Select Items</h2>
        <span className="text-xs font-medium">{filteredProducts.length} Products</span>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 font-medium focus:border-black outline-none text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredProducts.map((p) => {
          const prodId = p._id || p.id;
          const existing = itemsMap.get(prodId);
          const currentQty = existing?.qty || 0;
          const isTakeawayItem = existing?.isTakeaway || false;
          return (
            <ProductCard
              key={prodId}
              product={p}
              qty={currentQty}
              isTakeawayItem={isTakeawayItem}
              onAdjustQty={onAdjustQty}
              onToggleTakeaway={onToggleTakeaway}
              onOpenCustomise={onOpenCustomise}
            />
          );
        })}
      </div>
    </div>
  );
}

