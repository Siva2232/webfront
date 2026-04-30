import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function ConfirmRemoveItemModal({ pendingIndex, itemName, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {pendingIndex !== null && pendingIndex !== undefined && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center"
          >
            <h3 className="text-2xl font-black tracking-tight mb-4">Remove Item?</h3>
            <p className="text-slate-600 mb-8">
              Are you sure you want to remove <strong>{itemName}</strong>?
            </p>
            <div className="flex gap-4">
              <button onClick={onCancel} className="flex-1 py-5 rounded-[2rem] bg-slate-100 font-black uppercase text-sm">
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-5 rounded-[2rem] bg-rose-600 text-white font-black uppercase text-sm"
              >
                Yes, Remove
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

