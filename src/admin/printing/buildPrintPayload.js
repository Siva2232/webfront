import { buildReceiptModel, prepareReceiptItems } from "../orderBill/buildReceiptModel";
import { formatManifestItems } from "../orderBill/receiptPrintCore";
import { buildKitchenReceiptModel } from "../kitchenBill/buildKitchenReceiptModel";

/** Structured payload for RestoPrint invoice ESC/POS generation */
export function buildInvoicePrintPayload(order, cashierName = "N/A") {
  const model = buildReceiptModel(order, cashierName);
  const { receiptItems } = prepareReceiptItems(order);
  const lines = (formatManifestItems(receiptItems) || "—").split("\n").filter(Boolean);

  return {
    header: model.header,
    statusLabel: model.statusLabel,
    cashierName: model.cashierName,
    orderRef: model.orderRef,
    tableLabel: model.tableLabel,
    placedAt: model.placedAt,
    subtotal: model.subtotal,
    tax: model.tax,
    total: model.total,
    paymentStatus: model.paymentStatusText,
    paymentMethod: model.paymentMethod,
    items: lines.map((line) => ({ line })),
  };
}

/** Structured payload for RestoPrint KOT ESC/POS generation */
export function buildKotPrintPayload(kb) {
  const model = buildKitchenReceiptModel(kb);
  if (!model) return null;

  const items = (kb.items || []).map((item) => {
    const mods = [];
    if (item.selectedPortion) mods.push(String(item.selectedPortion));
    if (item.selectedAddons?.length) {
      item.selectedAddons.forEach((a) => {
        if (a?.name) mods.push(String(a.name));
      });
    }
    return {
      qty: item.quantity ?? item.qty ?? 1,
      name: item.name || item.productName || "Item",
      notes: item.notes || item.specialInstructions || "",
      modifiers: mods.join(", ") || item.modifiers || "",
    };
  });

  return {
    kotNumber: model.orderRef,
    orderRef: model.orderRef,
    tableLabel: model.tableLabel,
    placedAt: model.placedAt,
    notes: model.notes || "",
    items,
  };
}
