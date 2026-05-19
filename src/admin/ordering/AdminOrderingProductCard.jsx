import React, { memo } from "react";
import { Minus, Plus } from "lucide-react";
import {
  countProductQtyInCart,
  getProductId,
  getRemainingStock,
  getStockLimit,
  isProductSoldOut,
  tracksProductStock,
} from "../../utils/productStockCart";

/** Compact product card — same layout as Manual Order (UI only). */
const AdminOrderingProductCard = memo(function AdminOrderingProductCard({
  product,
  qty = 0,
  orderItems = [],
  onAdjustQty,
  onOpenCustomise,
}) {
  const prodId = getProductId(product);
  const hasCustomisation =
    (product.hasPortions && product.portions?.length > 0) ||
    (product.addonGroups?.length > 0);

  const soldOut = isProductSoldOut(product);
  const available = !soldOut;
  const remaining = getRemainingStock(product, orderItems);
  const stockLimit = getStockLimit(product);
  const cartQty = countProductQtyInCart(orderItems, prodId);
  const atCartLimit = tracksProductStock(product) && remaining !== null && remaining <= 0;
  const canIncrease = available && !atCartLimit;

  return (
    <div
      className={`relative flex min-h-[7rem] min-w-0 flex-col justify-between rounded-xl border-2 p-3 transition-all sm:min-h-[7.5rem] sm:rounded-2xl sm:p-3.5 ${
        qty > 0
          ? "border-zinc-900 bg-zinc-50"
          : soldOut
            ? "border-zinc-100 bg-zinc-50/80 opacity-90"
            : "border-zinc-100 bg-white"
      }`}
    >
      <div className="mb-2 flex min-w-0 items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`break-words text-sm font-bold leading-snug tracking-tight line-clamp-2 sm:line-clamp-3 ${
              soldOut ? "text-zinc-400 line-through decoration-rose-300" : "text-zinc-900"
            }`}
          >
            {product.name}
          </p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-600 sm:text-sm">
            ₹{product.price}
          </p>
          {tracksProductStock(product) && available && stockLimit != null && (
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-indigo-600 tabular-nums sm:text-[9px]">
              {remaining !== null && remaining <= stockLimit
                ? `${remaining} left`
                : `${stockLimit} in stock`}
            </p>
          )}
          {hasCustomisation && available && (
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-zinc-500 sm:text-[9px]">
              Customisable
            </p>
          )}
          {soldOut && (
            <p className="mt-1 inline-flex rounded-md bg-rose-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-rose-700">
              Sold out
            </p>
          )}
        </div>
        {product.image && (
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white sm:h-12 sm:w-12 sm:rounded-xl">
            <img
              src={product.image}
              alt={product.name}
              className={`h-full w-full object-cover ${soldOut ? "grayscale contrast-75" : ""}`}
              loading="lazy"
            />
            {soldOut && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 text-[7px] font-black uppercase text-rose-700">
                Out
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {available || qty > 0 ? (
          <>
            <button
              type="button"
              onClick={() => onAdjustQty(product, -1)}
              disabled={qty <= 0}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-zinc-300 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:h-9 sm:w-9 sm:rounded-xl"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="min-w-[1.75rem] text-center text-base font-black tabular-nums text-zinc-900 sm:min-w-[2rem] sm:text-lg">
              {qty}
            </span>
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-zinc-900 bg-zinc-900 text-white transition-colors hover:bg-zinc-800 sm:h-9 sm:w-9 sm:rounded-xl"
                aria-label={hasCustomisation ? "Customise and add" : "Increase quantity"}
              >
                <Plus size={14} />
              </button>
            ) : (
              <div
                className="flex h-8 min-w-[2.25rem] shrink-0 items-center justify-center rounded-lg border-2 border-zinc-200 bg-zinc-100 px-1.5 text-[8px] font-black uppercase tracking-wide text-zinc-400 sm:h-9 sm:rounded-xl sm:text-[9px]"
                title={
                  soldOut
                    ? "Sold out"
                    : atCartLimit
                      ? `Only ${stockLimit} available (${cartQty} in cart)`
                      : undefined
                }
              >
                {soldOut ? "—" : "Max"}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-8 w-full items-center justify-center rounded-lg border-2 border-zinc-200 bg-zinc-100 text-[9px] font-black uppercase tracking-widest text-zinc-400 sm:h-9 sm:rounded-xl">
            Sold out
          </div>
        )}
      </div>
    </div>
  );
});

export default AdminOrderingProductCard;
