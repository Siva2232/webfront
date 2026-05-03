import React, { useEffect } from "react";
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
  useEffect(() => {
    if (!open || cashiers.length !== 1) return;
    const only = cashiers[0];
    const isValid =
      selectedCashier != null &&
      cashiers.some((c) => String(c.id) === String(selectedCashier));
    if (!isValid) onChangeCashier(only.id);
  }, [open, cashiers, selectedCashier, onChangeCashier]);

  const hasValidCashier =
    selectedCashier != null &&
    cashiers.some((c) => String(c.id) === String(selectedCashier));

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
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600">
                <User size={40} />
              </div>

              <div>
                <h3 className="text-3xl font-black tracking-tight italic uppercase">
                  Select Cashier
                </h3>
                <p className="text-slate-500 mt-2">Who is printing this bill?</p>
              </div>

              <select
                value={selectedCashier == null ? "" : String(selectedCashier)}
                onChange={(e) => {
                  const v = e.target.value;
                  onChangeCashier(v === "" ? null : v);
                }}
                className="w-full p-4 border border-slate-200 rounded-2xl text-lg focus:outline-none focus:border-slate-400"
              >
                <option value="">Choose Cashier</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>

              {!cashiers.length && (
                <p className="text-xs text-amber-800 font-bold leading-relaxed">
                  No POS cashiers yet. In <strong className="text-slate-900">HR → Staff</strong>,
                  enable <strong className="text-slate-900">POS cashier</strong> on a staff profile.
                </p>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-5 rounded-[2rem] bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-sm hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!hasValidCashier}
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
