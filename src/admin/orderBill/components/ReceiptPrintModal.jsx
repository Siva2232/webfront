import React, { useMemo, useCallback } from "react";
import { Receipt } from "lucide-react";
import { buildReceiptModel } from "../buildReceiptModel";
import { directPrintReceipt } from "../receiptPrint";
import { ThermalReceiptPrintModal } from "../../printing/ThermalReceiptPrintModal";
import { OrderReceiptPreview } from "./OrderReceiptPreview";

export function ReceiptPrintModal({ order, cashierName, onClose }) {
  const model = useMemo(
    () => (order ? buildReceiptModel(order, cashierName) : null),
    [order, cashierName]
  );

  const handlePrint = useCallback(
    () => directPrintReceipt(order, cashierName),
    [order, cashierName]
  );

  if (!order || !model) return null;

  return (
    <ThermalReceiptPrintModal
      title="Bill receipt"
      subtitle={`${model.orderRef} · ${model.tableLabel}`}
      icon={Receipt}
      preview={<OrderReceiptPreview model={model} />}
      onPrint={handlePrint}
      onClose={onClose}
      autoPrintOnOpen={false}
    />
  );
}
