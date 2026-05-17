import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";
import SubItemModal from "./SubItemModal";
import { useCart } from "../context/CartContext";
import {
  canAddProductQty,
  countProductQtyInCart,
  getProductId,
  getRemainingStock,
  getStockLimit,
  isProductSoldOut,
  tracksProductStock,
} from "../utils/productStockCart";

function FoodTypeIcon({ type }) {
  const isVeg = type === "veg";
  return (
    <div className={`w-3.5 h-3.5 border-2 flex items-center justify-center rounded-sm ${isVeg ? "border-green-600" : "border-red-600"}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? "bg-green-600" : "bg-red-600"}`} />
    </div>
  );
}

const hasCustomisation = (product) =>
  (product.hasPortions && product.portions?.length > 0) ||
  (product.addonGroups?.length > 0);

export default function ProductCard({
  product,
  onAdd,
  onRemove,
  initialQty = 0,
  onAddConfigured,
  isTakeawayMode = false,
}) {
  const { name, description, price, image, type = "veg" } = product;
  const { cart } = useCart();

  const [showSubItem, setShowSubItem] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const productId = getProductId(product);
  const cartQty = countProductQtyInCart(cart, productId);
  const remaining = getRemainingStock(product, cart);
  const stockLimit = getStockLimit(product);
  const soldOut = isProductSoldOut(product);
  const available = !soldOut;

  const [quantity, setQuantity] = useState(cartQty || initialQty);

  useEffect(() => {
    setQuantity(cartQty);
  }, [cartQty]);

  const needsModal = hasCustomisation(product);
  const descriptionText = typeof description === "string" ? description.trim() : "";
  const showReadMore = descriptionText.length > 80;

  const tryAdd = (addQty = 1) => {
    const check = canAddProductQty(product, cart, addQty);
    if (!check.ok) {
      toast.error(check.message);
      return false;
    }
    return true;
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (!available) return;

    if (needsModal) {
      if (atCartLimit) {
        toast.error(
          stockLimit === 1
            ? "Only 1 available — already in your cart"
            : `Only ${stockLimit} available — your cart is full for this item`
        );
        return;
      }
      setShowSubItem(true);
      return;
    }

    if (!tryAdd(1)) return;
    onAdd?.(product);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (quantity > 0) {
      onRemove?.(productId);
    }
  };

  const handleConfiguredAdd = (configuredItem) => {
    const addQty = configuredItem.qty || 1;
    if (!tryAdd(addQty)) return;

    if (onAddConfigured) {
      onAddConfigured(configuredItem);
    } else {
      for (let i = 0; i < addQty; i++) {
        onAdd?.(product);
      }
    }
    setShowSubItem(false);
  };

  const atCartLimit = tracksProductStock(product) && remaining !== null && remaining <= 0;

  return (
    <div className="group relative flex flex-col bg-white border border-gray-100 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden hover:shadow-2xl hover:border-black transition-all duration-500 h-full">
      <div className="relative aspect-[16/10] sm:aspect-square overflow-hidden shrink-0 bg-gray-50">
        <img
          src={image || "https://via.placeholder.com/600x600"}
          alt={name}
          className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${!available ? "grayscale brightness-95" : ""}`}
        />
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 bg-white p-1.5 rounded-xl shadow-sm">
          <FoodTypeIcon type={type} />
        </div>
        {!available && (
          <div className="absolute inset-0 z-20 bg-white/40 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-rose-600 text-white px-5 py-2 font-black text-[10px] uppercase tracking-widest">
              Sold Out
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-grow p-3 sm:p-5 md:p-6 bg-white min-w-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-start sm:gap-3 w-full mb-2 sm:mb-3 min-w-0">
          <h3 className="text-[12px] sm:text-[14px] md:text-lg font-black leading-tight uppercase tracking-tight text-black break-words min-w-0">
            {name}
          </h3>
          <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0">
            <span className="text-black text-[13px] sm:text-base md:text-xl font-black tracking-tighter tabular-nums">
              ₹{price}
            </span>
            {tracksProductStock(product) && available && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-600 tabular-nums">
                {remaining !== null && remaining <= stockLimit
                  ? `${remaining} left`
                  : `${stockLimit} in stock`}
              </span>
            )}
          </div>
        </div>

        {descriptionText && (
          <div className="mb-4 sm:mb-6">
            <p
              className="text-gray-500 text-[10px] sm:text-[11px] md:text-[13px] leading-relaxed font-medium break-words"
              style={
                isDescExpanded
                  ? undefined
                  : {
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }
              }
            >
              {descriptionText}
            </p>
            {showReadMore && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDescExpanded((v) => !v);
                }}
                className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:text-slate-900"
              >
                {isDescExpanded ? "Read less" : "Read more"}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
          {available ? (
            <div className="h-10 sm:h-11 md:h-12 w-full">
              <AnimatePresence mode="wait">
                {quantity === 0 ? (
                  <motion.button
                    key="add-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleIncrement}
                    className="w-full h-full bg-black text-white font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-zinc-800"
                  >
                    <Plus size={14} strokeWidth={4} /> Add
                  </motion.button>
                ) : (
                  <div
                    key="qty-selector"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full h-full grid grid-cols-3 border-2 border-black overflow-hidden"
                  >
                    <button
                      onClick={handleDecrement}
                      className="flex items-center justify-center border-r-2 border-black hover:bg-gray-50 transition-colors"
                    >
                      <Minus size={14} strokeWidth={3} />
                    </button>
                    <div className="flex items-center justify-center font-black text-[11px] sm:text-xs md:text-sm tabular-nums">
                      {quantity}
                    </div>
                    <button
                      onClick={handleIncrement}
                      disabled={atCartLimit}
                      className={`flex items-center justify-center border-l-2 border-black transition-colors ${
                        atCartLimit
                          ? "cursor-not-allowed bg-gray-100 text-gray-300"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-10 sm:h-11 md:h-12 w-full bg-gray-50 flex items-center justify-center text-gray-300 font-black text-[9px] uppercase tracking-widest">
              Out of Stock
            </div>
          )}
        </div>
      </div>

      <SubItemModal
        product={product}
        isOpen={showSubItem}
        onClose={() => setShowSubItem(false)}
        onAddToCart={handleConfiguredAdd}
        maxQty={remaining ?? undefined}
        stockLimit={stockLimit}
        cartQty={cartQty}
      />
    </div>
  );
}
