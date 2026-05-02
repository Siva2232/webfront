import { format } from "date-fns";
import { isTakeawayOrder } from "./isTakeawayOrder";
import { escapeReceiptHtml } from "../../orderBill/receiptHeaderSettings";
import {
  RECEIPT_PRINT_CSS,
  getKitchenReceiptHeaderBlock,
  receiptPad as pad,
  formatKitchenManifestItems,
} from "../../orderBill/receiptPrintCore";

export const printKitchenBillReceipt = ({ kb }) => {
  if (!kb) return;

  const billTimestamp = kb.createdAt ? new Date(kb.createdAt) : new Date();
  const headerHtml = getKitchenReceiptHeaderBlock();
  const itemsText = formatKitchenManifestItems(kb.items);
  const notesHtml = kb.notes
    ? `<div class="line"></div><div class="bold">Notes:</div>\n${escapeReceiptHtml(
        String(kb.notes)
      )}\n`
    : "";

  const w = window.open("", "_blank");
  if (!w) return;

  const html = `<html><head><style>${RECEIPT_PRINT_CSS}</style></head><body>
<div class="header">${headerHtml}</div>
<div class="text-center bold">Kitchen</div>
<div class="line"></div>

${pad("Order Ref", "#" + (kb.orderRef || kb._id || "").toString().slice(-8))}
${pad("Table", isTakeawayOrder(kb) ? "TAKEAWAY" : "TBL-" + kb.table)}
${
  isTakeawayOrder(kb) && kb.tokenNumber
    ? pad("Token No", "#" + kb.tokenNumber) + "\n"
    : ""
}${pad("Placed At", format(billTimestamp, "dd/MM/yyyy • hh:mm a"))}

<div class="line"></div>
<div class="bold">Itemized Manifest</div>
<div class="line"></div>
${itemsText}
${notesHtml}
<div class="line"></div>

<script>window.print();window.onafterprint=()=>window.close();</script>
</body></html>`;

  w.document.write(html);
  w.document.close();
};
