import { directPrintKitchenReceipt } from "../kitchenPrint";

/** @deprecated Use directPrintKitchenReceipt from ../kitchenPrint.js */
export function printKitchenBillReceipt({ kb }) {
  return directPrintKitchenReceipt(kb);
}
