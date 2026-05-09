import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import SubItemModal from "./SubItemModal";

function FoodTypeIcon({ type }) {
  const isVeg = type === "veg";
  return (
    <div className={`w-3.5 h-3.5 border-2 flex items-center justify-center rounded-sm ${isVeg ? "border-green-600" : "border-red-600"}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? "bg-green-600" : "bg-red-600"}`} />
    </div>
  );
}

// Does this product need the customisation modal?
const hasCustomisation = (product) =>
  (product.hasPortions && product.portions?.length > 0) ||
  (product.addonGroups?.length > 0);

export default function ProductCard({ product, onAdd, onRemove, initialQty = 0, onAddConfigured }) {
  const { name, description, price, image, isAvailable = true, type = "veg" } = product;

  const [quantity, setQuantity] = useState(initialQty);
  const [showSubItem, setShowSubItem] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const needsModal = hasCustomisation(product);
  const descriptionText = typeof description === "string" ? description.trim() : "";
  const showReadMore = descriptionText.length > 80;

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;

    if (needsModal) {
      setShowSubItem(true);
      return;
    }

    setQuantity(prev => prev + 1);
    onAdd(product);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (quantity > 0) {
      setQuantity(prev => prev - 1);
      if (onRemove) onRemove(product._id || product.id);
    }
  };

  // Called from SubItem modal after user configures portions/addons
  const handleConfiguredAdd = (configuredItem) => {
    setQuantity(prev => prev + configuredItem.qty);
    if (onAddConfigured) {
      onAddConfigured(configuredItem);
    } else {
      // fallback: add configured qty times via the plain onAdd
      for (let i = 0; i < configuredItem.qty; i++) {
        onAdd(product);
      }
    }
  };

  return (
    <div className="group relative flex flex-col bg-white border border-gray-100 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden hover:shadow-2xl hover:border-black transition-all duration-500 h-full">
      {/* --- IMAGE SECTION --- */}
      <div className="relative aspect-[16/10] sm:aspect-square overflow-hidden shrink-0 bg-gray-50">
        <img
          src={image || "https://via.placeholder.com/600x600"}
          alt={name}
          className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${!isAvailable ? "grayscale brightness-95" : ""}`}
        />
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 bg-white p-1.5 rounded-xl shadow-sm">
          <FoodTypeIcon type={type} />
        </div>
        {!isAvailable && (
          <div className="absolute inset-0 z-20 bg-white/40 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-rose-600 text-white px-5 py-2 font-black text-[10px] uppercase tracking-widest">
              Sold Out
            </div>
          </div>
        )}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex flex-col flex-grow p-3 sm:p-5 md:p-6 bg-white min-w-0">
        
        {/* HEADING & PRICE: Fully Responsive, No Cutoff */}
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-start sm:gap-3 w-full mb-2 sm:mb-3 min-w-0">
          <h3 className="text-[12px] sm:text-[14px] md:text-lg font-black leading-tight uppercase tracking-tight text-black break-words min-w-0">
            {name}
          </h3>
          <span className="text-black text-[13px] sm:text-base md:text-xl font-black tracking-tighter shrink-0 tabular-nums">
            ₹{price}
          </span>
        </div>

        {/* DESCRIPTION: Static and fully visible */}
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

        {/* --- BUTTONS SECTION --- */}
        <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
          {isAvailable ? (
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
                  <motion.div
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
                    <div className="flex items-center justify-center font-black text-[11px] sm:text-xs md:text-sm">
                      {quantity}
                    </div>
                    <button 
                      onClick={handleIncrement} 
                      className="flex items-center justify-center border-l-2 border-black hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-10 sm:h-11 md:h-12 w-full bg-gray-50 flex items-center justify-center text-gray-300 font-black text-[9px] uppercase tracking-widest">
              Out of Stock
            </div>
          )}
          {needsModal && isAvailable && (
            <p className="text-center text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider"></p>
          )}
        </div>
      </div>

      {/* SubItem Modal for customisation */}
      <SubItemModal
        product={product}
        isOpen={showSubItem}
        onClose={() => setShowSubItem(false)}
        onAddToCart={handleConfiguredAdd}
      />
    </div>
  );
}
