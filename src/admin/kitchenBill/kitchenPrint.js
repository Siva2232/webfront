import { buildKitchenReceiptEscPos, buildKitchenTestEscPos } from "./buildKitchenReceiptEscPos";
import { getKitchenPrinterSettings } from "./kitchenPrinterSettings";
import { sendToBridge } from "../printing/sendToBridge";
import { buildKotPrintPayload } from "../printing/buildPrintPayload";

export async function directPrintKitchenReceipt(kb) {
  if (!kb) throw new Error("No kitchen ticket to print");
  const settings = getKitchenPrinterSettings();
  const structuredPayload = buildKotPrintPayload(kb);
  if (!structuredPayload) throw new Error("Invalid kitchen ticket — cannot build print data");
  const text = buildKitchenReceiptEscPos(kb);
  return sendToBridge(text, settings, {
    printerLabel: "Kitchen",
    printerTarget: "kitchen",
    printerType: "kitchen",
    type: "kot",
    structuredPayload,
  });
}

export async function directPrintKitchenTestPage() {
  const settings = getKitchenPrinterSettings();
  const text = buildKitchenTestEscPos();
  return sendToBridge(text, settings, {
    printerLabel: "Kitchen",
    printerTarget: "kitchen",
    printerType: "kitchen",
    type: "kot",
    structuredPayload: {
      kotNumber: "#TEST",
      orderRef: "#TEST",
      tableLabel: "TEST",
      placedAt: new Date().toLocaleString(),
      items: [{ qty: 1, name: "Kitchen printer test item" }],
    },
  });
}
