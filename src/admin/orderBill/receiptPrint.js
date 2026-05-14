import toast from "react-hot-toast";
import { format } from "date-fns";
import { TAKEAWAY_TABLE } from "../../context/CartContext";
import { computeBillStats } from "./billUtils";
import { escapeReceiptHtml } from "./receiptHeaderSettings";
import {
  RECEIPT_PRINT_CSS,
  getReceiptHeaderBlock,
  receiptPad as pad,
  formatManifestItems,
} from "./receiptPrintCore";
import { GST_TOTAL_PCT_LABEL } from "../../utils/gstRates";

export const printReceipt = (order, cashierName = "N/A") => {
  const w = window.open("", "_blank");
  if (!w) {
    toast.error("Pop-up blocked – allow pop-ups to print");
    return;
  }

  const { subtotal, tax, grandTotal: total } = computeBillStats(order);
  const safeCashier = escapeReceiptHtml(cashierName);
  const headerHtml = getReceiptHeaderBlock();

  const isTakeawayOrder = order.table === TAKEAWAY_TABLE || !order.table || order.table === "TAKEAWAY";
  const hasTakeawayItemsInDineIn = !isTakeawayOrder && (order.items || []).some((i) => i?.isTakeaway);
  const receiptItems = (order.items || []).map((i) => {
    if (!hasTakeawayItemsInDineIn || !i?.isTakeaway) return i;
    return { ...i, name: `T/A ${i.name}` };
  });
  const itemsText = formatManifestItems(receiptItems);

  const html = `<html><head><style>${RECEIPT_PRINT_CSS}</style></head><body>
<div class="header">${headerHtml}</div>
<div class="text-center bold">${
    order.paymentStatus === "paid" ? "PAID" : "Collect Cash"
  }</div>
<div class="text-center">Cashier: ${safeCashier}</div>
<div class="line"></div>

${pad("Order Ref", "#" + (order._id || "").slice(-8))}
${pad(
    "Table",
    isTakeawayOrder
      ? "TAKEAWAY"
      : "TBL-" + order.table
  )}${
    isTakeawayOrder && order.tokenNumber
      ? `\n${pad("Token No", "#" + order.tokenNumber)}`
      : ""
  }
${pad(
    "Placed At",
    format(new Date(order.createdAt || order.billedAt), "dd/MM/yyyy • hh:mm a")
  )}
${
    hasTakeawayItemsInDineIn
      ? `\n<div class="text-center bold">TAKEAWAY ITEMS INCLUDED</div>`
      : ""
  }

<div class="line"></div>
<div class="bold">Itemized Manifest</div>
<div class="line"></div>
${itemsText}

<div class="line"></div>
${pad("Subtotal", "Rs." + subtotal.toFixed(2))}
${pad("Tax (GST " + GST_TOTAL_PCT_LABEL + ")", "Rs." + tax.toFixed(2))}

<div class="line"></div>
<div class="bold">Total Summary</div>
${pad("Method", (order.paymentMethod || "cod").toUpperCase())}
<div class="bold text-center">${
    order.paymentStatus === "paid" ? "✔ COMPLETED" : "⚠️ DUE"
  }</div>
${pad("Total", "Rs." + total.toFixed(2))}
<div class="line"></div>

${
    order.paymentStatus === "paid"
      ? `<div class="text-center bold">PAID IN FULL\nRs.${total.toFixed(
          2
        )}</div>`
      : `<div class="text-center bold">Total Unpaid (Collect Cash)\nRs.${total.toFixed(
          2
        )}</div>`
  }

<div class="line"></div>
<div class="text-center bold">${
    order.paymentStatus === "paid" ? "Payment Confirmed" : "Mark Paid"
  }</div>
<div class="text-center">THANK YOU</div>

<script>window.print();window.onafterprint=()=>window.close();</script>
</body></html>`;

  w.document.write(html);
  w.document.close();
};
