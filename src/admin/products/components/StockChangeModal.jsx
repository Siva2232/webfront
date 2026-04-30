import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, RefreshCw, X, XCircle } from "lucide-react";

export default function StockChangeModal({ open, product, type, isUpdating, onClose, onConfirm }) {
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
            <div className={`p-6 text-white ${type === "out" ? "bg-rose-500" : "bg-emerald-500"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {type === "out" ? <XCircle size={24} /> : <RefreshCw size={24} />}
                  <h3 className="text-lg font-black uppercase tracking-tight">{type === "out" ? "Stock Out" : "Restore Menu"}</h3>
                </div>
                <button
                  onClick={onClose}
                  disabled={isUpdating}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden shadow-lg mb-4">
                <img src={product.image} alt="" className="w-full h-full object-cover" />
              </div>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">{product.name}</h4>
              <p className="text-slate-500 text-sm font-medium">
                {type === "out" ? "Mark this item as sold out for customers?" : "Restore this item to the active menu?"}
              </p>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={onClose}
                disabled={isUpdating}
                className="flex-1 px-4 py-4 border-2 border-slate-200 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                Wait
              </button>
              <button
                onClick={onConfirm}
                disabled={isUpdating}
                className={`flex-1 px-4 py-4 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  type === "out"
                    ? "bg-rose-500 hover:bg-rose-600 shadow-rose-100"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100"
                } shadow-lg`}
              >
                {isUpdating ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : type === "out" ? (
                  "Stock Out"
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

