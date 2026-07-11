import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Check } from "lucide-react";
import {
  countPortionQtyInCart,
  countProductQtyInCart,
  getPortionUnavailableInfo,
  getProductId,
  getRemainingStock,
  getStockLimit,
  isPortionSelectable,
  tracksPortionStock,
} from "../utils/productStockCart";

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
  onPortionQtyChange,
  initialQty = 1,
  maxQty,
  cart = [],
}) {
  const name = product?.name ?? "";
  const price = product?.price ?? 0;
  const image = product?.image;
  const type = product?.type ?? "veg";
  const hasPortions = Boolean(product?.hasPortions && product?.portions?.length > 0);
  const portions = product?.portions ?? [];
  const addonGroups = (product?.addonGroups ?? []).filter(
    (group) => group.isAvailable !== false && group.name && (group.addons?.length || 0) > 0,
  );
  const perPortionQtyMode = hasPortions && addonGroups.length === 0;

  const [selectedPortion, setSelectedPortion] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [qty, setQty] = useState(initialQty);

  useEffect(() => {
    if (!isOpen || !product) return;
    const firstAvailable = portions.find((p) =>
      isPortionSelectable(product, p.name, cart),
    );
    setSelectedPortion(
      hasPortions ? firstAvailable?.name ?? portions[0]?.name ?? null : null,
    );
    setSelectedAddons([]);
    setQty(initialQty);
  }, [isOpen, product?._id, product?.id, hasPortions, portions, initialQty, cart]);

  const effectiveStockLimit = useMemo(
    () => (product ? getStockLimit(product, selectedPortion) : null),
    [product, selectedPortion],
  );
  const effectiveRemaining = useMemo(
    () => (product ? getRemainingStock(product, cart, selectedPortion) : null),
    [product, cart, selectedPortion],
  );
  const effectiveCartQty = useMemo(() => {
    if (!product) return 0;
    const pid = getProductId(product);
    if (selectedPortion && tracksPortionStock(product, selectedPortion)) {
      return countPortionQtyInCart(cart, pid, selectedPortion);
    }
    return countProductQtyInCart(cart, pid);
  }, [product, cart, selectedPortion]);

  const maxAllowed =
    effectiveRemaining != null && Number.isFinite(effectiveRemaining)
      ? Math.max(0, Math.floor(effectiveRemaining))
      : maxQty != null && Number.isFinite(maxQty)
        ? Math.max(0, Math.floor(maxQty))
        : 99;

  const selectedInfo = useMemo(
    () =>
      selectedPortion && product
        ? getPortionUnavailableInfo(product, selectedPortion, cart)
        : null,
    [product, selectedPortion, cart],
  );
  const canAdd = selectedInfo?.selectable !== false && maxAllowed > 0;

  const stockHintText = useMemo(() => {
    if (!canAdd && selectedInfo && !selectedInfo.selectable) {
      return selectedInfo.reason
        ? `${selectedInfo.title} — ${selectedInfo.reason}`
        : selectedInfo.title || "Sold out";
    }
    if (effectiveStockLimit == null) return null;
    if (effectiveCartQty > 0) {
      return `${maxAllowed} more allowed (${effectiveStockLimit} total, ${effectiveCartQty} in cart)`;
    }
    return `${maxAllowed} available`;
  }, [canAdd, selectedInfo, effectiveStockLimit, effectiveCartQty, maxAllowed]);

  useEffect(() => {
    if (isOpen) {
      setQty((q) =>
        Math.min(
          Math.max(canAdd ? 1 : 0, q),
          Math.max(canAdd ? 1 : 0, maxAllowed),
        ),
      );
    }
  }, [isOpen, maxAllowed, canAdd]);

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

  const portionOverview = useMemo(() => {
    if (!perPortionQtyMode || !product) {
      return { lines: [], total: 0, totalQty: 0 };
    }
    const pid = getProductId(product);
    const lines = portions
      .map((p) => {
        const portionName = p.name;
        const qty = countPortionQtyInCart(cart, pid, portionName);
        if (qty <= 0) return null;
        const unit = Number(p.price) || price;
        return { name: portionName, qty, unit, total: unit * qty };
      })
      .filter(Boolean);
    const total = lines.reduce((sum, line) => sum + line.total, 0);
    const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);
    return { lines, total, totalQty };
  }, [perPortionQtyMode, product, cart, portions, price]);

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
    if (!product) return;
    if (
      selectedPortion &&
      !isPortionSelectable(product, selectedPortion, cart)
    ) {
      return;
    }
    const configuredItem = {
      ...product,
      baseProductPrice: product.price,
      selectedPortion: selectedPortion || null,
      selectedAddons: selectedAddons.map(({ name, price, groupName }) => ({
        name,
        price,
        groupName,
        qty: 1
      })),
      price: unitPrice, // per-unit price including portion + addons
      qty,
      // unique key so same product with diff configs are separate cart entries
      cartKey: `${product._id || product.id}_${
        selectedPortion || "base"
      }_${selectedAddons
        .map((a) => `${a.name}x1`)
        .sort()
        .join("+")}`,
    };
    onAddToCart(configuredItem);
    onClose();
    // reset
    setSelectedAddons([]);
    setQty(1);
    if (hasPortions && portions.length > 0) {
      const next = portions.find((p) =>
        isPortionSelectable(product, p.name, cart),
      );
      setSelectedPortion(next?.name ?? portions[0]?.name ?? null);
    }
  };

  const isVeg = type === "veg";

  return (
    <AnimatePresence>
      {isOpen && product && (
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
              {hasPortions && portions.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">
                    Select Portion
                  </h3>
                  <div className="space-y-2">
                    {portions.map((p) => {
                      if (perPortionQtyMode) {
                        const portionName = p.name;
                        const pid = getProductId(product);
                        const inCart = countPortionQtyInCart(cart, pid, portionName);
                        const unavailable = getPortionUnavailableInfo(
                          product,
                          portionName,
                          cart,
                        );
                        const remaining = getRemainingStock(product, cart, portionName);
                        const stockLimit = getStockLimit(product, portionName);
                        const canIncrease =
                          unavailable.selectable &&
                          (remaining === null || remaining > 0);
                        const canDecrease = inCart > 0;
                        const showQtyControls = unavailable.selectable || inCart > 0;

                        return (
                          <div
                            key={p.name}
                            className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all ${
                              inCart > 0
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-slate-100 bg-white"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-bold truncate ${
                                  unavailable.selectable || inCart > 0
                                    ? "text-slate-800"
                                    : "text-slate-400 line-through decoration-rose-300"
                                }`}
                              >
                                {p.name}
                              </p>
                              <p className="text-sm font-black text-slate-900 mt-0.5">
                                ₹{p.price}
                              </p>
                              {stockLimit != null && unavailable.selectable && remaining != null && remaining > 0 && (
                                <p className="text-[9px] font-bold uppercase tracking-wide text-indigo-600 mt-1">
                                  {remaining} left
                                </p>
                              )}
                            </div>
                            {!showQtyControls ? (
                              <div className="shrink-0 text-right max-w-[7.5rem]">
                                <span className="block text-[10px] font-black uppercase tracking-wide text-rose-600">
                                  {unavailable.title}
                                </span>
                                {unavailable.reason ? (
                                  <span className="mt-0.5 block text-[9px] font-bold text-rose-500 normal-case">
                                    {unavailable.reason}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                {!unavailable.selectable && unavailable.reason ? (
                                  <div className="text-right max-w-[7.5rem]">
                                    <span className="block text-[10px] font-black uppercase tracking-wide text-rose-600">
                                      {unavailable.title}
                                    </span>
                                    <span className="mt-0.5 block text-[9px] font-bold text-rose-500 normal-case">
                                      {unavailable.reason}
                                    </span>
                                  </div>
                                ) : null}
                                <div className="flex items-center bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                                  <button
                                    type="button"
                                    disabled={!canDecrease}
                                    onClick={() => onPortionQtyChange?.(portionName, -1)}
                                    className="w-9 h-10 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Minus size={15} strokeWidth={3} />
                                  </button>
                                  <span className="w-7 text-center font-black text-sm tabular-nums">
                                    {inCart}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!canIncrease}
                                    onClick={() => onPortionQtyChange?.(portionName, 1)}
                                    className={`w-9 h-10 flex items-center justify-center transition-colors ${
                                      !canIncrease
                                        ? "cursor-not-allowed text-slate-300"
                                        : "hover:bg-slate-200"
                                    }`}
                                  >
                                    <Plus size={15} strokeWidth={3} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      const unavailable = getPortionUnavailableInfo(
                        product,
                        p.name,
                        cart,
                      );
                      const selectable = unavailable.selectable;
                      const isSelected = selectedPortion === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          disabled={!selectable}
                          onClick={() => selectable && setSelectedPortion(p.name)}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all ${
                            !selectable
                              ? "cursor-not-allowed border-rose-100 bg-rose-50/80 opacity-95"
                              : isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-100 bg-white hover:border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                                !selectable
                                  ? "border-rose-200 bg-rose-100"
                                  : isSelected
                                    ? "border-blue-500 bg-blue-500"
                                    : "border-slate-300"
                              }`}
                            >
                              {isSelected && selectable && (
                                <Check
                                  size={12}
                                  className="text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                            <span
                              className={`text-sm font-bold truncate ${
                                selectable
                                  ? "text-slate-800"
                                  : "text-slate-400 line-through decoration-rose-300"
                              }`}
                            >
                              {p.name}
                            </span>
                          </div>
                          {!selectable ? (
                            <div className="shrink-0 text-right max-w-[7.5rem]">
                              <span className="block text-[10px] font-black uppercase tracking-wide text-rose-600">
                                {unavailable.title}
                              </span>
                              {unavailable.reason ? (
                                <span className="mt-0.5 block text-[9px] font-bold text-rose-500 normal-case">
                                  {unavailable.reason}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm font-black text-slate-900 shrink-0">
                              ₹{p.price}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Addon Groups ── */}
              {addonGroups.map((group) => (
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
            {stockHintText && !perPortionQtyMode && (
              <p
                className={`shrink-0 px-5 pt-3 text-center text-[10px] font-bold uppercase tracking-wide tabular-nums ${
                  canAdd ? "text-indigo-600" : "text-rose-600"
                }`}
              >
                {stockHintText}
              </p>
            )}
            {perPortionQtyMode ? (
              <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-3 min-h-[7rem]">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">
                  Order overview
                </p>
                {portionOverview.lines.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {portionOverview.lines.map((line) => (
                        <div
                          key={line.name}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {line.name}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-500 tabular-nums">
                              ₹{line.unit.toLocaleString()} × {line.qty}
                            </p>
                          </div>
                          <p className="text-sm font-black text-slate-900 tabular-nums shrink-0">
                            ₹{line.total.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="my-3 border-t border-slate-200" />
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase tracking-wide text-indigo-600">
                        Total ({portionOverview.totalQty}{" "}
                        {portionOverview.totalQty === 1 ? "item" : "items"})
                      </p>
                      <p className="text-lg font-black text-indigo-600 tabular-nums">
                        ₹{portionOverview.total.toLocaleString()}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs font-medium text-slate-400 italic">
                    Tap + on portions to add to your order
                  </p>
                )}
              </div>
            ) : null}
            {perPortionQtyMode ? (
              <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider transition-all"
                >
                  {portionOverview.total > 0
                    ? `Done · ₹${portionOverview.total.toLocaleString()}`
                    : "Done"}
                </button>
              </div>
            ) : (
            <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 flex items-center gap-4">
              {/* qty selector */}
              <div className="flex items-center bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={!canAdd || qty <= 1}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus size={16} strokeWidth={3} />
                </button>
                <span className="w-8 text-center font-black text-sm">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(maxAllowed, q + 1))}
                  disabled={!canAdd || qty >= maxAllowed}
                  className={`w-10 h-10 flex items-center justify-center transition-colors ${
                    !canAdd || qty >= maxAllowed
                      ? "cursor-not-allowed text-slate-300"
                      : "hover:bg-slate-200"
                  }`}
                >
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>

              {/* add button */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd}
                className={`flex-1 min-h-12 rounded-2xl font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition-all ${
                  canAdd
                    ? "bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] text-white shadow-lg shadow-emerald-200"
                    : "cursor-not-allowed bg-slate-300 text-slate-500 py-2"
                }`}
              >
                {canAdd ? (
                  `Add — ₹${totalPrice.toLocaleString()}`
                ) : (
                  <>
                    <span>{selectedInfo?.title || "Sold out"}</span>
                    {selectedInfo?.reason ? (
                      <span className="text-[10px] font-bold normal-case tracking-normal text-slate-400">
                        {selectedInfo.reason}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
