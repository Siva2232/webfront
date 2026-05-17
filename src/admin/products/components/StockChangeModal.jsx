import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, X, XCircle } from "lucide-react";

export default function StockChangeModal({
  open,
  product,
  type,
  isUpdating,
  onClose,
  onConfirm,
}) {
  const isTrackedRestore = Boolean(product?.trackStock && type === "restore");
  const [restockQty, setRestockQty] = useState("10");

  useEffect(() => {
    if (!open || !product) return;
    if (product.trackStock && type === "restore") {
      const prev = Number(product.stock) || 0;
      setRestockQty(String(prev > 0 ? prev : 10));
    }
  }, [open, product?._id, product?.stock, type]);

  const parsedRestock = Math.floor(Number(restockQty));
  const restockValid = !isTrackedRestore || (Number.isFinite(parsedRestock) && parsedRestock >= 1);

  const handleConfirm = () => {
    if (isTrackedRestore) {
      if (!restockValid) return;
      onConfirm(parsedRestock);
      return;
    }
    onConfirm();
  };

  return (
    <AnimatePresence>
      {open && product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !isUpdating && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className={`p-6 text-white ${type === "out" ? "bg-rose-500" : "bg-emerald-500"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {type === "out" ? <XCircle size={24} /> : <RefreshCw size={24} />}
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    {type === "out" ? "Stock Out" : "Restock Item"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUpdating}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>

            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden shadow-lg">
                <img src={product.image} alt="" className="w-full h-full object-cover" />
              </div>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">
                {product.name}
              </h4>

              {product.trackStock ? (
                type === "out" ? (
                  <p className="text-slate-500 text-sm font-medium">
                    Set quantity to 0? This item will show as sold out until you restock.
                  </p>
                ) : (
                  <div className="space-y-3 text-left">
                    <p className="text-slate-500 text-sm font-medium text-center">
                      Enter how many units to add back to inventory.
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 text-center">
                      Current qty: {product.stock ?? 0}
                    </p>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Restock quantity <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={restockQty}
                        onChange={(e) => setRestockQty(e.target.value)}
                        disabled={isUpdating}
                        placeholder="e.g. 10"
                        className="mt-1.5 w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-black text-lg tabular-nums text-center focus:border-emerald-500 outline-none"
                        autoFocus
                      />
                    </label>
                  </div>
                )
              ) : (
                <p className="text-slate-500 text-sm font-medium">
                  {type === "out"
                    ? "Mark this item as sold out for customers?"
                    : "Restore this item to the active menu?"}
                </p>
              )}
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isUpdating}
                className="flex-1 px-4 py-4 border-2 border-slate-200 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isUpdating || !restockValid}
                className={`flex-1 px-4 py-4 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  type === "out"
                    ? "bg-rose-500 hover:bg-rose-600 shadow-rose-100"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100"
                } shadow-lg`}
              >
                {isUpdating ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : type === "out" ? (
                  "Stock Out"
                ) : isTrackedRestore ? (
                  "Restock"
                ) : (
                  "Restore"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
