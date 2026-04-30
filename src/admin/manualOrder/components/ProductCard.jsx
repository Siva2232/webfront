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
      className={`relative p-4 border-2 transition-all flex flex-col justify-between 
      ${qty > 0 ? "border-black bg-gray-50" : "border-gray-100"}
      ${isTakeawayItem ? "bg-orange-50 border-orange-200" : ""}`}
    >
      {qty > 0 && (
        <button
          onClick={() => onToggleTakeaway(prodId)}
          className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
            isTakeawayItem ? "bg-orange-500 text-white" : "bg-white text-gray-300 hover:bg-gray-200"
          }`}
          title="Mark item as takeaway"
        >
          <Package size={16} />
        </button>
      )}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex-1">
          <p className="font-bold text-lg leading-tight uppercase tracking-tight line-clamp-2">
            {product.name}
          </p>
          <p className="text-sm font-medium text-gray-500 italic">₹{product.price}</p>
          {hasCustomisation && (
            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">
              Customisable
            </p>
          )}
        </div>
        {product.image && (
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 shrink-0 bg-white">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => onAdjustQty(product, -1)}
          className="w-8 h-8 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="text-lg font-black w-6 text-center">{qty}</span>
        <button
          onClick={() => {
            if (hasCustomisation) {
              onOpenCustomise(product);
            } else {
              onAdjustQty(product, 1);
            }
          }}
          className="w-8 h-8 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
});

export default ProductCard;

