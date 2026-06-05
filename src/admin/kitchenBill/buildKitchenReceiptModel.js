import { getReceiptHeader } from "../orderBill/receiptHeaderSettings";
import { formatKitchenManifestItems, formatReceiptDateTime } from "../orderBill/receiptPrintCore";
import { isTakeawayOrder } from "./utils/isTakeawayOrder";
import { takeawayCustomerDisplayName } from "../../utils/takeawayCustomer";

/** Structured KOT data for preview modal */
export function buildKitchenReceiptModel(kb) {
  if (!kb) return null;

  const header = getReceiptHeader();
  const billTimestamp = kb.createdAt ? new Date(kb.createdAt) : new Date();

  const takeawayMeta = [];
  if (isTakeawayOrder(kb)) {
    const name = takeawayCustomerDisplayName(kb);
    if (name) takeawayMeta.push({ label: "Customer", value: name });
    if (kb?.tokenNumber != null && String(kb.tokenNumber).trim() !== "") {
      takeawayMeta.push({ label: "Token No", value: `#${kb.tokenNumber}` });
    }
  }

  return {
    restaurantName: header.restaurantName || "Kitchen",
    orderRef: `#${(kb.orderRef || kb._id || "").toString().slice(-8)}`,
    tableLabel: isTakeawayOrder(kb) ? "TAKEAWAY" : `TBL-${kb.table}`,
    takeawayMeta,
    placedAt: formatReceiptDateTime(billTimestamp),
    itemsManifest: formatKitchenManifestItems(kb.items || []),
    notes: kb.notes ? String(kb.notes).trim() : "",
    status: kb.status || "Pending",
  };
}
