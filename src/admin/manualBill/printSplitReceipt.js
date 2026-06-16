import { directPrintSplitReceipt } from "../orderBill/directThermalPrint";

export async function printSplitReceipt({ order, items, cashierName = "N/A", toast }) {
  try {
    await directPrintSplitReceipt(order, items, cashierName);
    toast?.success?.("Bill sent to printer");
  } catch (err) {
    if (err?.queued) {
      toast?.success?.(err.message || "Bill queued — connector will print shortly", {
        duration: 5000,
      });
      return;
    }
    toast?.error?.(err?.message || "Print failed — check printer settings");
  }
}
