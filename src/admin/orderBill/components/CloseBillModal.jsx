import React from "react";
import { CheckCircle } from "lucide-react";
import { ModalOverlay } from "./ModalOverlay";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../../../context/CartContext";

export function CloseBillModal({ closeBillModal, onCancel, onConfirm }) {
  if (!closeBillModal) return null;
  const order = closeBillModal.order;

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="flex items-center justify-center w-14 h-14 bg-rose-100 rounded-full mx-auto mb-4">
        <CheckCircle size={28} className="text-rose-600" />
      </div>
      <h3 className="text-lg font-black text-center text-slate-900 mb-2">
        {order.table === TAKEAWAY_TABLE || !order.table
          ? "Close Bill"
          : "Close Bill & Free Table"}
      </h3>
      <p className="text-sm text-slate-500 text-center mb-1">
        Close order for{" "}
        <span className="font-bold text-slate-900">
          {order.table === TAKEAWAY_TABLE || !order.table
            ? "Takeaway"
            : order.table === DELIVERY_TABLE
              ? "Delivery"
              : `Table ${order.table}`}
        </span>
        ?
      </p>
      <p className="text-xs text-slate-400 text-center mb-6">
        {order.table === TAKEAWAY_TABLE || !order.table
          ? "This will finalize the order and remove it from the active list."
          : "This will mark the order as closed and free the table."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition flex items-center justify-center gap-2"
        >
          <CheckCircle size={16} /> Close Bill
        </button>
      </div>
    </ModalOverlay>
  );
}

