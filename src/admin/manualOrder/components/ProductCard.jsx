import React, { memo } from "react";
import { Minus, Package, Plus } from "lucide-react";

const ProductCard = memo(function ProductCard({
  product,
  qty,
  isTakeawayItem,
  onAdjustQty,
  onToggleTakeaway,
  onOpenCustomise,
}) {
  const prodId = product._id || product.id;
  const hasCustomisation =
    (product.hasPortions && product.portions?.length > 0) || (product.addonGroups?.length > 0);

  return (
    <div
      className={`relative flex min-h-[8.5rem] min-w-0 flex-col justify-between rounded-2xl border-2 p-4 transition-all ${
        qty > 0
          ? isTakeawayItem
            ? "border-amber-300 bg-amber-50/80"
            : "border-zinc-900 bg-zinc-50"
          : "border-zinc-100 bg-white"
      }`}
    >
      {qty > 0 && (
        <button
          type="button"
          onClick={() => onToggleTakeaway(prodId)}
          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            isTakeawayItem
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-100"
          }`}
          title="Toggle takeaway for this line"
        >
          <Package size={16} />
        </button>
      )}
      <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-8">
          <p className="break-words font-bold leading-snug tracking-tight text-zinc-900 line-clamp-3">
            {product.name}
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-600">₹{product.price}</p>
          {hasCustomisation && (
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              Customisable
            </p>
          )}
        </div>
        {product.image && (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:h-16 sm:w-16">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onAdjustQty(product, -1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-300 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
          aria-label="Decrease quantity"
        >
          <Minus size={16} />
        </button>
        <span className="min-w-[2rem] text-center text-lg font-black tabular-nums text-zinc-900">{qty}</span>
        <button
          type="button"
          onClick={() => {
            if (hasCustomisation) {
              onOpenCustomise(product);
            } else {
              onAdjustQty(product, 1);
            }
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-900 bg-zinc-900 text-white transition-colors hover:bg-zinc-800"
          aria-label={hasCustomisation ? "Customise and add" : "Increase quantity"}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
});

export default ProductCard;

