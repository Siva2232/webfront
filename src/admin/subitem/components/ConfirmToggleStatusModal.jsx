import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function ConfirmToggleStatusModal({ open, item, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-black mb-2">{item?.isAvailable !== false ? "Stock Out" : "Stock In"}</h3>
              <p className="text-sm text-slate-600 mb-5">
                {item?.isAvailable !== false
                  ? `Mark ${item?.name} as unavailable in the menu?`
                  : `Mark ${item?.name} as available in the menu?`}
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold">
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

