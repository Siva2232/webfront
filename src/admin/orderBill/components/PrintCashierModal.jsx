import React, { useState, useEffect } from "react";
import { Plus, Printer, User } from "lucide-react";
import { ModalOverlay } from "./ModalOverlay";

export function PrintCashierModal({
  isOpen,
  selectedCashier,
  setSelectedCashier,
  cashiers,
  onAddCashier,
  onCancel,
  onConfirm,
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isOpen) setNewName("");
  }, [isOpen]);

  // When there is exactly one cashier, pre-select them in the dropdown
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

  const handleAdd = () => {
    if (!onAddCashier) return;
    setAdding(true);
    try {
      const result = onAddCashier(newName);
      if (result?.ok && result.cashier) {
        setSelectedCashier(result.cashier.id);
        setNewName("");
      }
    } finally {
      setAdding(false);
    }
  };

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
      <div className="mb-4 max-h-64 overflow-y-auto">
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
          <p className="mt-2 text-xs text-amber-700 font-medium text-center">
            No cashiers yet — add one below.
          </p>
        )}
      </div>

      {onAddCashier && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Add cashier
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="New cashier name"
              className="flex-1 min-w-0 px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              disabled={adding || !String(newName).trim()}
              onClick={handleAdd}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-black uppercase tracking-wide hover:bg-black disabled:opacity-40"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      )}

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

