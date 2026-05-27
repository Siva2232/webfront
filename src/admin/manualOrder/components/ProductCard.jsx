import React, { memo } from "react";
import { Minus, Package, Plus } from "lucide-react";
import {
  countProductQtyInCart,
  getProductId,
  getRemainingStock,
  getStockLimit,
  isProductSoldOut,
  tracksProductStock,
} from "../../../utils/productStockCart";

const ProductCard = memo(function ProductCard({
  product,
  qty,
  orderItems = [],
  isTakeawayItem,
  onAdjustQty,
  onToggleTakeaway,
  onOpenCustomise,
}) {
  const prodId = getProductId(product);
  const hasCustomisation =
    (product.hasPortions && product.portions?.length > 0) || (product.addonGroups?.length > 0);

  const soldOut = isProductSoldOut(product);
  const available = !soldOut;
  const remaining = getRemainingStock(product, orderItems);
  const stockLimit = getStockLimit(product);
  const cartQty = countProductQtyInCart(orderItems, prodId);
  const atCartLimit = tracksProductStock(product) && remaining !== null && remaining <= 0;
  const canIncrease = available && !atCartLimit;

  return (
    <div
      className={`relative flex min-h-[7.5rem] sm:min-h-[8.5rem] min-w-0 flex-col justify-between rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 transition-all ${
        qty > 0
          ? isTakeawayItem
            ? "border-amber-300 bg-amber-50/80"
            : "border-zinc-900 bg-zinc-50"
          : soldOut
            ? "border-zinc-100 bg-zinc-50/80 opacity-90"
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
        <div className="min-w-0 flex-1 pr-7 sm:pr-8">
          <p
            className={`break-words text-sm sm:text-base font-bold leading-snug tracking-tight line-clamp-2 sm:line-clamp-3 ${
              soldOut ? "text-zinc-400 line-through decoration-rose-300" : "text-zinc-900"
            }`}
          >
            {product.name}
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-600">₹{product.price}</p>
          {tracksProductStock(product) && available && stockLimit != null && (
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-600 tabular-nums">
              {remaining !== null && remaining <= stockLimit
                ? `${remaining} left`
                : `${stockLimit} in stock`}
            </p>
          )}
          {hasCustomisation && available && (
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              Customisable
            </p>
          )}
          {soldOut && (
            <p className="mt-1.5 inline-flex rounded-md bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-700">
              Sold out
            </p>
          )}
        </div>
        {product.image && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:h-16 sm:w-16">
            <img
              src={product.image}
              alt={product.name}
              className={`h-full w-full object-cover ${soldOut ? "grayscale contrast-75" : ""}`}
              loading="lazy"
            />
            {soldOut && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 text-[8px] font-black uppercase text-rose-700">
                Out
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {available || qty > 0 ? (
          <>
            <button
              type="button"
              onClick={() => onAdjustQty(product, -1)}
              disabled={qty <= 0}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border-2 border-zinc-300 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="min-w-[2rem] text-center text-lg font-black tabular-nums text-zinc-900">{qty}</span>
            {canIncrease ? (
              <button
                type="button"
                onClick={() => {
                  if (hasCustomisation) {
                    onOpenCustomise(product);
                  } else {
                    onAdjustQty(product, 1);
                  }
                }}
                className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border-2 border-zinc-900 bg-zinc-900 text-white transition-colors hover:bg-zinc-800"
                aria-label={hasCustomisation ? "Customise and add" : "Increase quantity"}
              >
                <Plus size={16} />
              </button>
            ) : (
              <div
                className="flex h-10 min-w-[2.5rem] shrink-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-zinc-100 px-2 text-[9px] font-black uppercase tracking-wide text-zinc-400"
                title={
                  soldOut
                    ? "Sold out"
                    : atCartLimit
                      ? `Only ${stockLimit} available (${cartQty} in order)`
                      : undefined
                }
              >
                {soldOut ? "—" : "Max"}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-10 w-full items-center justify-center rounded-xl border-2 border-zinc-200 bg-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Sold out
          </div>
        )}
      </div>
    </div>
  );
});

export default ProductCard;
