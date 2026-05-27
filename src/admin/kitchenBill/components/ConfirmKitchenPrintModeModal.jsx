import React from "react";
import { AnimatePresence, motion } from "framer-motion";

const COPY = {
  manual: {
    title: "Switch to manual print?",
    body: "You will need to open and print each kitchen ticket yourself.",
  },
  auto: {
    title: "Switch to auto print?",
    body: "New kitchen tickets will print automatically when they arrive.",
  },
};

export function ConfirmKitchenPrintModeModal({ open, mode, onClose, onConfirm }) {
  const copy = mode ? COPY[mode] : null;

  return (
    <AnimatePresence>
      {open && copy && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="mb-2 text-lg font-black text-zinc-900">{copy.title}</h3>
              <p className="mb-5 text-sm text-zinc-600">Are you sure? {copy.body}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 rounded-xl bg-zinc-900 px-4 py-2 font-bold text-white hover:bg-zinc-800"
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
