import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function DeleteSubItemModal({ open, item, onClose, onConfirm }) {
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
              <h3 className="text-lg font-black mb-2">Delete Item</h3>
              <p className="text-sm text-slate-600 mb-5">
                Are you sure you want to delete "{item?.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold">
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

