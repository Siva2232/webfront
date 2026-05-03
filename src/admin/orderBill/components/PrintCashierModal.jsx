import React, { useEffect } from "react";
import { Printer, User } from "lucide-react";
import { ModalOverlay } from "./ModalOverlay";

export function PrintCashierModal({
  isOpen,
  selectedCashier,
  setSelectedCashier,
  cashiers,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen || cashiers.length !== 1) return;
    const only = cashiers[0];
    const isValid =
      selectedCashier != null &&
      cashiers.some((c) => String(c.id) === String(selectedCashier));
    if (!isValid) setSelectedCashier(only.id);
  }, [isOpen, cashiers, selectedCashier, setSelectedCashier]);

  if (!isOpen) return null;

  const hasValidCashier =
    selectedCashier != null &&
    cashiers.some((c) => String(c.id) === String(selectedCashier));

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-full mx-auto mb-4">
        <User size={28} className="text-indigo-600" />
      </div>
      <h3 className="text-lg font-black text-center text-slate-900 mb-2">
        Select Cashier
      </h3>
      <p className="text-sm text-slate-500 text-center mb-6">
        Who is handling this bill?
      </p>
      <div className="mb-6 max-h-64 overflow-y-auto">
        <select
          value={selectedCashier == null ? "" : String(selectedCashier)}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedCashier(v === "" ? null : v);
          }}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Select Cashier —</option>
          {cashiers.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        {!cashiers.length && (
          <p className="mt-3 text-xs text-amber-800 font-medium text-center leading-relaxed">
            No POS cashiers yet. In{" "}
            <strong className="text-slate-900">HR → Staff</strong>, add or edit a person and
            enable <strong className="text-slate-900">POS cashier</strong>.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!hasValidCashier}
          className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Printer size={16} /> Print Bill
        </button>
      </div>
    </ModalOverlay>
  );
}
