import { format } from "date-fns";
import { TAKEAWAY_TABLE } from "../../context/CartContext";
import { escapeReceiptHtml } from "../orderBill/receiptHeaderSettings";
import {
  RECEIPT_PRINT_CSS,
  getReceiptHeaderBlock,
  receiptPad as pad,
  formatManifestItems,
} from "../orderBill/receiptPrintCore";
import { GST_TOTAL_RATE, GST_TOTAL_PCT_LABEL } from "../../utils/gstRates";

export const printSplitReceipt = ({ order, items, cashierName = "N/A", toast }) => {
  const w = window.open("", "_blank");
  if (!w) {
    toast?.error?.("Pop-up blocked – allow pop-ups to print");
    return;
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * GST_TOTAL_RATE;
  const total = subtotal + tax;
  const safeCashier = escapeReceiptHtml(cashierName);
  const headerHtml = getReceiptHeaderBlock();
  const itemsText = formatManifestItems(items);

  const html = `<html><head><style>${RECEIPT_PRINT_CSS}</style></head><body>
<div class="header">${headerHtml}</div>
<div class="text-center bold">CUSTOM BILL (SPLIT)</div>
<div class="text-center">Cashier: ${safeCashier}</div>
<div class="line"></div>

${pad("Order Ref", "#" + (order._id || "").slice(-6))}
${pad("Location", order.table === TAKEAWAY_TABLE ? "TAKEAWAY" : "TBL-" + order.table)}
${pad(
    "Placed At",
    format(new Date(order.createdAt || order.billedAt || Date.now()), "dd/MM/yyyy • hh:mm a")
  )}

<div class="line"></div>
<div class="bold">Itemized Manifest</div>
<div class="line"></div>
${itemsText}

<div class="line"></div>
${pad("Subtotal", "Rs." + subtotal.toFixed(2))}
${pad("Tax (GST " + GST_TOTAL_PCT_LABEL + ")", "Rs." + tax.toFixed(2))}

<div class="line"></div>
<div class="bold">Total Due</div>
<div class="bold text-center">Rs.${total.toFixed(2)}</div>
<div class="line"></div>

<div class="text-center">THANK YOU</div>

<script>window.print();window.onafterprint=()=>window.close();</script>
</body></html>`;

  w.document.write(html);
  w.document.close();
};
