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
    <div className="min-w-0 space-y-5 xl:col-span-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Select items</h2>
          <p className="mt-0.5 text-xs text-zinc-400">Tap + to add · customise when offered</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold tabular-nums text-zinc-700">
          {filteredProducts.length} products
        </span>
      </div>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search products…"
          autoComplete="off"
          className="w-full min-w-0 rounded-xl border-2 border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
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

