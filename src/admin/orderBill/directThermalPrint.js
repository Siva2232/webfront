import { buildReceiptEscPos, buildTestEscPos } from "./buildReceiptEscPos";
import { getPosPrinterSettings } from "./posPrinterSettings";
import { sendToBridge } from "../printing/sendToBridge";

/** Send bill to thermal printer — no browser print dialog */
export async function directPrintReceipt(order, cashierName = "N/A") {
  const settings = getPosPrinterSettings();
  const text = buildReceiptEscPos(order, cashierName);
  return sendToBridge(text, settings, { printerLabel: "Invoice" });
}

export async function directPrintTestPage() {
  const settings = getPosPrinterSettings();
  const text = buildTestEscPos();
  return sendToBridge(text, settings, { printerLabel: "Invoice" });
}
