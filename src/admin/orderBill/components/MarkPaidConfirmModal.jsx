import React from "react";
import { HelpCircle, CheckCircle, Loader2 } from "lucide-react";
import { ModalOverlay } from "./ModalOverlay";

/**
 * Shown only when accounting is off — short yes/no before marking bill paid (no ledger split).
 */
export function MarkPaidConfirmModal({ payload, onCancel, onConfirm, loading }) {
  if (!payload) return null;

  return (
    <ModalOverlay onClose={() => (!loading ? onCancel() : null)}>
      <div className="max-w-xs mx-auto">
        <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-2xl mx-auto mb-3">
          <HelpCircle size={26} className="text-slate-600" />
        </div>
        <h3 className="text-base font-black text-center text-slate-900 mb-1">
          Mark bill as paid?
        </h3>
        <p className="text-xs text-slate-900 text-center mb-1">
          Bill{" "}
          <span className="font-mono font-bold text-red-800">
            #{String(payload.billId || "").slice(-8)}
          </span>
          {" · "}
          <span className="font-bold text-red-900">
            ₹
            {Number(payload.amount || 0).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </span>
        </p>
        <p className="text-[10px] text-slate-400 text-center mb-5">
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-3 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-3 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            {loading ? "Saving…" : "Yes, mark paid"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
