import { buildReceiptEscPos, buildTestEscPos } from "./buildReceiptEscPos";
import { getPosPrinterSettings } from "./posPrinterSettings";
import { sendToBridge } from "../printing/sendToBridge";
import { buildInvoicePrintPayload } from "../printing/buildPrintPayload";

/** Send bill to thermal printer — no browser print dialog */
export async function directPrintReceipt(order, cashierName = "N/A") {
  const settings = getPosPrinterSettings();
  const structuredPayload = buildInvoicePrintPayload(order, cashierName);
  const text = buildReceiptEscPos(order, cashierName);
  return sendToBridge(text, settings, {
    printerLabel: "Invoice",
    printerTarget: "invoice",
    printerType: "invoice",
    type: "invoice",
    structuredPayload,
  });
}

/** Manual Bill — print selected items to invoice thermal printer */
export async function directPrintSplitReceipt(order, items, cashierName = "N/A") {
  const splitOrder = { ...order, items, _splitBill: true };
  return directPrintReceipt(splitOrder, cashierName);
}

export async function directPrintTestPage() {
  const settings = getPosPrinterSettings();
  const text = buildTestEscPos();
  return sendToBridge(text, settings, {
    printerLabel: "Invoice",
    printerTarget: "invoice",
    printerType: "invoice",
    type: "invoice",
    structuredPayload: {
      header: { restaurantName: "RestoPrint Test" },
      statusLabel: "TEST PRINT",
      cashierName: "Admin",
      orderRef: "#TEST",
      tableLabel: "TEST",
      placedAt: new Date().toLocaleString(),
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentStatus: "TEST",
      items: [{ line: "Invoice printer test page" }],
    },
  });
}
