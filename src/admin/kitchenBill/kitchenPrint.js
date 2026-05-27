import { buildKitchenReceiptEscPos, buildKitchenTestEscPos } from "./buildKitchenReceiptEscPos";
import { getKitchenPrinterSettings } from "./kitchenPrinterSettings";
import { sendToBridge } from "../printing/sendToBridge";

export async function directPrintKitchenReceipt(kb) {
  if (!kb) throw new Error("No kitchen ticket to print");
  const settings = getKitchenPrinterSettings();
  const text = buildKitchenReceiptEscPos(kb);
  return sendToBridge(text, settings, { printerLabel: "Kitchen" });
}

export async function directPrintKitchenTestPage() {
  const settings = getKitchenPrinterSettings();
  const text = buildKitchenTestEscPos();
  return sendToBridge(text, settings, { printerLabel: "Kitchen" });
}
