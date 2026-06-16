import { getReceiptHeader } from "../orderBill/receiptHeaderSettings";
import {
  buildKitchenItemRows,
  formatKitchenManifestItems,
  formatReceiptDateTime,
  kitchenItemsHeaderLine,
  receiptPad,
  KITCHEN_RECEIPT_TEXT_WIDTH,
} from "../orderBill/receiptPrintCore";
import { isTakeawayOrder } from "./utils/isTakeawayOrder";
import { takeawayCustomerDisplayName } from "../../utils/takeawayCustomer";

/** Structured KOT data for preview modal */
export function buildKitchenReceiptModel(kb) {
  if (!kb) return null;

  const header = getReceiptHeader();
  const billTimestamp = kb.createdAt ? new Date(kb.createdAt) : new Date();
  const orderRef = `#${(kb.orderRef || kb._id || "").toString().slice(-8)}`;
  const tableLabel = isTakeawayOrder(kb) ? "TAKEAWAY" : `TBL-${kb.table}`;
  const placedAt = formatReceiptDateTime(billTimestamp);

  const takeawayMeta = [];
  if (isTakeawayOrder(kb)) {
    const name = takeawayCustomerDisplayName(kb);
    if (name) takeawayMeta.push({ label: "Customer", value: name });
    if (kb?.tokenNumber != null && String(kb.tokenNumber).trim() !== "") {
      takeawayMeta.push({ label: "Token No", value: `#${kb.tokenNumber}` });
    }
  }

  const metaLines = [
    receiptPad("Order", orderRef, KITCHEN_RECEIPT_TEXT_WIDTH),
    receiptPad("Table", tableLabel, KITCHEN_RECEIPT_TEXT_WIDTH),
    receiptPad("Time", placedAt, KITCHEN_RECEIPT_TEXT_WIDTH),
  ];

  return {
    restaurantName: header.restaurantName || "Kitchen",
    orderRef,
    tableLabel,
    takeawayMeta,
    placedAt,
    batchNumber: kb.batchNumber > 1 ? kb.batchNumber : null,
    metaLines,
    itemsHeader: kitchenItemsHeaderLine(),
    itemRows: buildKitchenItemRows(kb.items || []),
    itemsManifest: formatKitchenManifestItems(kb.items || []),
    notes: kb.notes ? String(kb.notes).trim() : "",
    status: kb.status || "Pending",
  };
}
