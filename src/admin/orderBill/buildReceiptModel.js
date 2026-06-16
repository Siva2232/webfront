import { TAKEAWAY_TABLE } from "../../context/CartContext";
import { computeBillStats } from "./billUtils";
import { getReceiptHeader, escapeReceiptHtml } from "./receiptHeaderSettings";
import {
  getReceiptHeaderBlock,
  receiptPad as pad,
  buildReceiptItemRows,
  formatManifestItems,
  formatTakeawayReceiptLines,
  formatReceiptDateTime,
  receiptItemsHeaderLine,
} from "./receiptPrintCore";
import {
  isTakeawayTableOrder,
  takeawayCustomerDisplayName,
} from "../../utils/takeawayCustomer";
import { GST_TOTAL_PCT_LABEL } from "../../utils/gstRates";

export function prepareReceiptItems(order) {
  const isTakeawayOrder =
    order.table === TAKEAWAY_TABLE || !order.table || order.table === "TAKEAWAY";
  const hasTakeawayItemsInDineIn =
    !isTakeawayOrder && (order.items || []).some((i) => i?.isTakeaway);
  const receiptItems = (order.items || []).map((i) => {
    if (!hasTakeawayItemsInDineIn || !i?.isTakeaway) return i;
    return { ...i, name: `T/A ${i.name}` };
  });
  return { isTakeawayOrder, hasTakeawayItemsInDineIn, receiptItems };
}

/** Structured receipt data for the in-app print preview UI */
export function buildReceiptModel(order, cashierName = "N/A") {
  const { subtotal, tax, grandTotal: total } = computeBillStats(order);
  const header = getReceiptHeader();
  const { isTakeawayOrder, hasTakeawayItemsInDineIn, receiptItems } =
    prepareReceiptItems(order);
  const isPaid = order.paymentStatus === "paid";

  const takeawayMeta = [];
  if (isTakeawayTableOrder(order)) {
    const name = takeawayCustomerDisplayName(order);
    if (name) takeawayMeta.push({ label: "Customer", value: name });
    if (order?.tokenNumber != null && String(order.tokenNumber).trim() !== "") {
      takeawayMeta.push({ label: "Token No", value: `#${order.tokenNumber}` });
    }
  }

  return {
    header,
    isPaid,
    statusLabel: isPaid ? "PAID" : "Collect Cash",
    cashierName,
    orderRef: `#${(order._id || "").slice(-8)}`,
    tableLabel: isTakeawayOrder ? "TAKEAWAY" : `TBL-${order.table}`,
    takeawayMeta,
    placedAt: formatReceiptDateTime(order.createdAt || order.billedAt),
    hasTakeawayItemsInDineIn,
    itemsHeader: receiptItemsHeaderLine(),
    itemRows: buildReceiptItemRows(receiptItems),
    itemsManifest: formatManifestItems(receiptItems),
    subtotal,
    tax,
    total,
    taxLabel: `Tax (GST ${GST_TOTAL_PCT_LABEL})`,
    paymentMethod: (order.paymentMethod || "cod").toUpperCase(),
    paymentStatusText: isPaid ? "COMPLETED" : "DUE",
    amountDueLabel: isPaid
      ? `Paid in full — Rs.${total.toFixed(2)}`
      : `Total unpaid (collect cash) — Rs.${total.toFixed(2)}`,
    footerLabel: isPaid ? "Payment confirmed" : "Mark paid",
  };
}

/** Thermal HTML body (no document wrapper) for hidden iframe print */
export function buildReceiptBodyHtml(order, cashierName = "N/A") {
  const { subtotal, tax, grandTotal: total } = computeBillStats(order);
  const safeCashier = escapeReceiptHtml(cashierName);
  const headerHtml = getReceiptHeaderBlock();
  const { isTakeawayOrder, hasTakeawayItemsInDineIn, receiptItems } =
    prepareReceiptItems(order);
  const itemsText = formatManifestItems(receiptItems);
  const isPaid = order.paymentStatus === "paid";

  const metaBlock = [
    pad("Order Ref", "#" + (order._id || "").slice(-8)),
    pad("Table", isTakeawayOrder ? "TAKEAWAY" : "TBL-" + order.table),
    formatTakeawayReceiptLines(order, pad).trim(),
    pad("Placed At", formatReceiptDateTime(order.createdAt || order.billedAt)),
  ]
    .filter(Boolean)
    .join("\n");

  const totalsBlock = [
    pad("Subtotal", "Rs." + subtotal.toFixed(2)),
    pad("Tax (GST " + GST_TOTAL_PCT_LABEL + ")", "Rs." + tax.toFixed(2)),
  ].join("\n");

  return `<div class="header">${headerHtml}</div>
<div class="text-center bold">${isPaid ? "PAID" : "Collect Cash"}</div>
<div>Cashier: ${safeCashier}</div>
<div class="line"></div>
<pre class="receipt-pre">${metaBlock}</pre>
${
    hasTakeawayItemsInDineIn
      ? `<div class="text-center bold">TAKEAWAY ITEMS INCLUDED</div>`
      : ""
  }
<div class="line"></div>
<pre class="receipt-pre">${receiptItemsHeaderLine()}\n${itemsText}</pre>
<div class="line"></div>
<pre class="receipt-pre">${totalsBlock}\n${pad("Total", "Rs." + total.toFixed(2))}${isPaid ? "" : "\n" + pad("DUE", "Rs." + total.toFixed(2))}</pre>`;
}
