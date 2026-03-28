import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Check } from "lucide-react";

/**
 * SubItem Modal — Swiggy/Zomato-style customisation sheet.
 *
 * Props
 * ─────
 * product       — full product object (with portions, addonGroups)
 * isOpen        — boolean controlling visibility
 * onClose       — called to dismiss the modal
 * onAddToCart   — (configuredItem) => void   — the final item to push into the cart
 * initialQty    — starting quantity (default 1)
 */
export default function SubItemModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  initialQty = 1,
}) {
  if (!product) return null;

  const {
    name,
    price,
    image,
    type = "veg",
    hasPortions,
    portions = [],
    addonGroups = [],
  } = product;

  // ── Local state ──
  const [selectedPortion, setSelectedPortion] = useState(() => {
    if (hasPortions && portions.length > 0) {
      const firstAvailable = portions.find(p => p.isAvailable !== false);
      return firstAvailable ? firstAvailable.name : portions[0].name;
    }
    return null;
  });
  const [selectedAddons, setSelectedAddons] = useState([]); // [{ name, price, groupName }]
  const [qty, setQty] = useState(initialQty);

  // ── Derived price ──
  const portionPrice = useMemo(() => {
    if (!hasPortions || !selectedPortion) return price;
    const p = portions.find((pt) => pt.name === selectedPortion);
    return p ? p.price : price;
  }, [hasPortions, selectedPortion, portions, price]);

  const addonsTotal = useMemo(
    () => selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0),
    [selectedAddons]
  );

  const unitPrice = portionPrice + addonsTotal;
  const totalPrice = unitPrice * qty;

  // ── Addon toggle ──
  const toggleAddon = (addon, group) => {
    setSelectedAddons((prev) => {
      const exists = prev.find(
        (a) => a.name === addon.name && a.groupName === group.name
      );
      if (exists) {
        return prev.filter(
          (a) => !(a.name === addon.name && a.groupName === group.name)
        );
      }
      // enforce maxSelections per group (0 = unlimited)
      if (group.maxSelections > 0) {
        const groupCount = prev.filter((a) => a.groupName === group.name).length;
        if (groupCount >= group.maxSelections) {
          // replace oldest in group
          const withoutOldest = prev
            .filter((a) => a.groupName !== group.name)
            .concat(prev.filter((a) => a.groupName === group.name).slice(1));
          return [...withoutOldest, { ...addon, groupName: group.name }];
        }
      }
      return [...prev, { ...addon, groupName: group.name }];
    });
  };

  const isAddonSelected = (addonName, groupName) =>
    selectedAddons.some(
      (a) => a.name === addonName && a.groupName === groupName
    );

  // ── Submit ──
  const handleAdd = () => {
    const configuredItem = {
      ...product,
      selectedPortion: selectedPortion || null,
      selectedAddons: selectedAddons.map(({ name, price }) => ({
        name,
        price,
      })),
      price: unitPrice, // per-unit price including portion + addons
      qty,
      // unique key so same product with diff configs are separate cart entries
      cartKey: `${product._id || product.id}_${
        selectedPortion || "base"
      }_${selectedAddons
        .map((a) => a.name)
        .sort()
        .join("+")}`,
    };
    onAddToCart(configuredItem);
    onClose();
    // reset
    setSelectedAddons([]);
    setQty(1);
    if (hasPortions && portions.length > 0)
      setSelectedPortion(portions[0].name);
  };

  const isVeg = type === "veg";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header Image ── */}
            <div className="relative h-44 shrink-0 bg-slate-100">
              <img
                src={image || "https://via.placeholder.com/400x200"}
                alt={name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <X size={18} className="text-slate-700" />
              </button>
              <div className="absolute bottom-4 left-5 right-5">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-4 h-4 border-2 flex items-center justify-center rounded-sm ${
                      isVeg ? "border-emerald-500" : "border-red-500"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isVeg ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                  </div>
                </div>
                <h2 className="text-white text-xl font-black uppercase tracking-tight leading-tight">
                  {name}
                </h2>
                <p className="text-white/80 text-sm font-bold mt-0.5">
                  ₹{price}
                </p>
              </div>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* ── Portions ── */}
              {hasPortions && portions.length > 0 && portions.some(p => p.isAvailable !== false) && (
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">
                    Select Portion
                  </h3>
                  <div className="space-y-2">
                    {portions
                      .filter((p) => p.isAvailable !== false)
                      .map((p) => (
                        <button
                          key={p.name}
                          onClick={() => setSelectedPortion(p.name)}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all ${
                            selectedPortion === p.name
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-100 bg-white hover:border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                selectedPortion === p.name
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-slate-300"
                              }`}
                            >
                              {selectedPortion === p.name && (
                                <Check
                                  size={12}
                                  className="text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                            <span className="text-sm font-bold text-slate-800">
                              {p.name}
                            </span>
                          </div>
                          <span className="text-sm font-black text-slate-900">
                            ₹{p.price}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Addon Groups ── */}
              {addonGroups
                .filter((group) => group.isAvailable !== false)
                .map((group) => (
                  <div key={group.name}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                        {group.name}
                      </h3>
                      {group.maxSelections > 0 && (
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          Select upto {group.maxSelections}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {group.addons.map((addon) => {
                        const isSelected = isAddonSelected(
                          addon.name,
                          group.name
                        );
                        return (
                          <button
                            key={addon.name}
                            onClick={() => toggleAddon(addon, group)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-slate-100 bg-white hover:border-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "border-emerald-500 bg-emerald-500"
                                    : "border-slate-300"
                                }`}
                              >
                                {isSelected && (
                                  <Check
                                    size={12}
                                    className="text-white"
                                    strokeWidth={3}
                                  />
                                )}
                              </div>
                              <span className="text-sm font-medium text-slate-700">
                                {addon.name}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-slate-600">
                              +₹{addon.price || 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>

            {/* ── Footer: Qty + Add ── */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 flex items-center gap-4">
              {/* qty selector */}
              <div className="flex items-center bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <Minus size={16} strokeWidth={3} />
                </button>
                <span className="w-8 text-center font-black text-sm">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>

              {/* add button */}
              <button
                onClick={handleAdd}
                className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
              >
                Add — ₹{totalPrice.toLocaleString()}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
