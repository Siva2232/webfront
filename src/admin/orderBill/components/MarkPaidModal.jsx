import React, { useMemo } from "react";
import { AlertCircle, CheckCircle, CreditCard, RefreshCw, Scissors, Wallet } from "lucide-react";
import { ModalOverlay } from "./ModalOverlay";

export function MarkPaidModal({
  markPaidModal,
  paymentData,
  setPaymentData,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  const netEntered = useMemo(() => {
    return (
      Number(paymentData.cash) +
      Number(paymentData.bank) +
      Number(paymentData.discount) -
      Number(paymentData.balance)
    );
  }, [paymentData]);

  if (!markPaidModal) return null;

  const isMatch = Math.abs(netEntered - markPaidModal.amount) < 0.01;

  return (
    <ModalOverlay onClose={() => (!isSubmitting ? onClose() : null)}>
      <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-full mx-auto mb-4">
        <Wallet size={28} className="text-emerald-600" />
      </div>
      <h3 className="text-lg font-black text-center text-slate-900 mb-2">
        Record Payment
      </h3>
      <p className="text-sm text-slate-500 text-center mb-6">
        Total Amount:{" "}
        <span className="font-bold text-slate-900 text-lg">
          ₹{markPaidModal.amount.toLocaleString()}
        </span>
      </p>

      <div className="space-y-4 mb-6">
        {[
          { label: "Cash Payment", key: "cash", icon: <Wallet size={16} /> },
          { label: "Bank / UPI", key: "bank", icon: <CreditCard size={16} /> },
          { label: "Discount", key: "discount", icon: <Scissors size={16} /> },
          {
            label: "Balance (Credit)",
            key: "balance",
            icon: <AlertCircle size={16} />,
          },
        ].map((field) => (
          <div key={field.key}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-tight mb-1.5 flex items-center gap-2">
              {field.icon} {field.label}
            </label>
            <input
              type="number"
              value={paymentData[field.key] || ""}
              onChange={(e) =>
                setPaymentData({
                  ...paymentData,
                  [field.key]: Number(e.target.value),
                })
              }
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              placeholder="0"
            />
          </div>
        ))}

        <div className="p-4 bg-slate-900 rounded-xl">
          <div className="flex justify-between items-center text-white">
            <span className="text-xs font-bold uppercase opacity-60">
              Net Entered
            </span>
            <span
              className={`text-lg font-black ${
                isMatch ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              ₹{netEntered.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <CheckCircle size={16} />
          )}
          {isSubmitting ? "Saving..." : "Record Payment"}
        </button>
      </div>
    </ModalOverlay>
  );
}

