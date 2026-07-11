import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, Minus, Plus, X } from "lucide-react";

function clampQty(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function StockRow({ label, sublabel, trackStock, qty, onQtyChange, onEnableTrack, disabled }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-tight text-slate-900 truncate">{label}</p>
          {sublabel ? (
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{sublabel}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
            !trackStock
              ? "bg-slate-200 text-slate-600"
              : qty > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-600"
          }`}
        >
          {!trackStock ? "Manual" : qty > 0 ? `${qty} left` : "Sold out"}
        </span>
      </div>

      {!trackStock ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onEnableTrack(10)}
          className="w-full rounded-xl border-2 border-dashed border-indigo-200 bg-white py-2.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          Enable quantity tracking
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || qty <= 0}
              onClick={() => onQtyChange(qty - 1)}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
            >
              <Minus size={16} strokeWidth={3} />
            </button>
            <input
              type="number"
              min={0}
              step={1}
              value={qty}
              disabled={disabled}
              onChange={(e) => onQtyChange(clampQty(e.target.value))}
              className="flex-1 h-10 rounded-xl border-2 border-slate-200 bg-white text-center font-black text-lg tabular-nums focus:border-indigo-500 outline-none"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onQtyChange(qty + 1)}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[0, 5, 10, 25, 50].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={disabled}
                onClick={() => onQtyChange(preset)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide border transition-colors ${
                  qty === preset
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}
              >
                {preset === 0 ? "Clear" : preset}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function StockUpdateModal({
  open,
  product,
  isSaving,
  onClose,
  onSave,
}) {
  const [mainTrack, setMainTrack] = useState(false);
  const [mainQty, setMainQty] = useState(0);
  const [portionRows, setPortionRows] = useState([]);

  useEffect(() => {
    if (!open || !product) return;
    setMainTrack(Boolean(product.trackStock));
    setMainQty(Math.max(0, Number(product.stock) || 0));
    setPortionRows(
      (product.portions || []).map((p) => ({
        name: p.name || "",
        price: p.price,
        trackStock: Boolean(p.trackStock),
        qty: Math.max(0, Number(p.stock) || 0),
        isAvailable: p.isAvailable !== false,
      }))
    );
  }, [open, product?._id, product?.stock, product?.trackStock, product?.portions]);

  const hasPortions = Boolean(product?.hasPortions && portionRows.length > 0);
  const showMainStock = !hasPortions || product?.trackStock;

  const hasChanges = useMemo(() => {
    if (!product) return false;
    if (showMainStock) {
      if (Boolean(product.trackStock) !== mainTrack) return true;
      if (mainTrack && mainQty !== Math.max(0, Number(product.stock) || 0)) return true;
    }
    const orig = product.portions || [];
    if (portionRows.length !== orig.length) return true;
    return portionRows.some((row, i) => {
      const p = orig[i];
      if (!p) return true;
      if (Boolean(p.trackStock) !== row.trackStock) return true;
      if (row.trackStock && row.qty !== Math.max(0, Number(p.stock) || 0)) return true;
      return false;
    });
  }, [product, showMainStock, mainTrack, mainQty, portionRows]);

  const canSave = hasChanges && (
    (showMainStock && mainTrack) ||
    portionRows.some((r) => r.trackStock) ||
    (!hasPortions && mainTrack)
  );

  const handleSave = () => {
    if (!product) return;
    const payload = {};

    if (showMainStock && mainTrack) {
      payload.stock = mainQty;
    }

    if (hasPortions) {
      const tracked = portionRows.filter((row) => row.trackStock);
      if (tracked.length > 0) {
        payload.portions = tracked.map((row) => ({
          name: row.name,
          stock: row.qty,
          trackStock: true,
        }));
      }
    } else if (mainTrack) {
      payload.stock = mainQty;
    }

    if (!payload.stock && !payload.portions?.length) return;
    onSave(payload);
  };

  return (
    <AnimatePresence>
      {open && product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !isSaving && onClose()}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 bg-indigo-600 text-white shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Boxes size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-tight">Update stock</h3>
                    <p className="text-[11px] font-bold text-indigo-100 truncate">{product.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {showMainStock && (
                <StockRow
                  label="Main item"
                  sublabel={`Base price ₹${Number(product.price || 0).toLocaleString()}`}
                  trackStock={mainTrack}
                  qty={mainQty}
                  disabled={isSaving}
                  onEnableTrack={(n) => {
                    setMainTrack(true);
                    setMainQty(n);
                  }}
                  onQtyChange={setMainQty}
                />
              )}

              {hasPortions ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    Sub-items / portions
                  </p>
                  {portionRows.map((row, idx) => (
                    <StockRow
                      key={`${row.name}-${idx}`}
                      label={row.name}
                      sublabel={row.price != null ? `₹${Number(row.price).toLocaleString()}` : null}
                      trackStock={row.trackStock}
                      qty={row.qty}
                      disabled={isSaving}
                      onEnableTrack={(n) => {
                        setPortionRows((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, trackStock: true, qty: n } : r
                          )
                        );
                      }}
                      onQtyChange={(next) => {
                        setPortionRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, qty: next } : r))
                        );
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-3.5 border-2 border-slate-200 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !canSave}
                className="flex-1 px-4 py-3.5 bg-indigo-600 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Save stock"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
