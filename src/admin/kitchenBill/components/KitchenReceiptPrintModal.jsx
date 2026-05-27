import React, { useMemo, useCallback } from "react";
import { ChefHat } from "lucide-react";
import { buildKitchenReceiptModel } from "../buildKitchenReceiptModel";
import { directPrintKitchenReceipt } from "../kitchenPrint";
import { ThermalReceiptPrintModal } from "../../printing/ThermalReceiptPrintModal";
import { KitchenReceiptPreview } from "./KitchenReceiptPreview";

export function KitchenReceiptPrintModal({ kb, onClose, autoPrintOnOpen = false }) {
  const model = useMemo(() => (kb ? buildKitchenReceiptModel(kb) : null), [kb]);

  const handlePrint = useCallback(() => directPrintKitchenReceipt(kb), [kb]);

  if (!kb || !model) return null;

  return (
    <ThermalReceiptPrintModal
      title="KOT preview"
      subtitle={`${model.orderRef} · ${model.tableLabel}`}
      icon={ChefHat}
      preview={<KitchenReceiptPreview model={model} />}
      onPrint={handlePrint}
      onClose={onClose}
      autoPrintOnOpen={autoPrintOnOpen}
      successToast="KOT sent to kitchen printer"
    />
  );
}
