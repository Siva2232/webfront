import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function DeleteProductModal({ open, product, isDeleting, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {open && product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !isDeleting && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-rose-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={24} />
                  <h3 className="text-lg font-black uppercase tracking-tight">Delete Product</h3>
                </div>
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                {product.image && (
                  <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover" />
                )}
                <div>
                  <p className="font-black text-lg uppercase tracking-tight">{product.name}</p>
                  <p className="text-indigo-600 font-bold">₹{product.price}</p>
                </div>
              </div>

              <p className="text-slate-600 text-sm">
                Are you sure you want to delete <strong>{product.name}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-6 py-4 border-2 border-slate-200 font-bold uppercase text-xs tracking-widest rounded-xl hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 px-6 py-4 bg-rose-500 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Product
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

