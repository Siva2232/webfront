import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User } from "lucide-react";

export default function SelectCashierModal({
  open,
  cashiers,
  selectedCashier,
  onChangeCashier,
  onCancel,
  onConfirm,
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl"
          >
            <div className="text-center space-y-8">
              <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600">
                <User size={40} />
              </div>

              <div>
                <h3 className="text-3xl font-black tracking-tight italic uppercase">Select Cashier</h3>
                <p className="text-slate-500 mt-2">Who is printing this bill?</p>
              </div>

              <select
                value={selectedCashier || ""}
                onChange={(e) => onChangeCashier(Number(e.target.value))}
                className="w-full p-4 border border-slate-200 rounded-2xl text-lg focus:outline-none focus:border-slate-400"
              >
                <option value="">Choose Cashier</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-4">
                <button
                  onClick={onCancel}
                  className="flex-1 py-5 rounded-[2rem] bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-sm hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!selectedCashier}
                  className="flex-1 py-5 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-widest text-sm disabled:opacity-50"
                >
                  Print Now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

