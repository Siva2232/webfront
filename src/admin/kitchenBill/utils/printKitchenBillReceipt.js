import { format } from "date-fns";
import { isTakeawayOrder } from "./isTakeawayOrder";

export const printKitchenBillReceipt = ({ kb }) => {
  if (!kb) return;

  const billTimestamp = kb.createdAt ? new Date(kb.createdAt) : new Date();
  const padLine = (left, right, width = 40) => {
    const pad = width - String(left).length - String(right).length;
    return `${left}${" ".repeat(pad > 0 ? pad : 1)}${right}`;
  };

  const itemsText =
    kb.items
      ?.map((item) => {
        const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
        const basePrice = item.price - addonsTotal;
        const baseLine = item.name + (item.selectedPortion ? ` (${item.selectedPortion})` : "");
        const qtyLine = padLine(
          `Qty: ${item.qty} × ₹${basePrice.toLocaleString("en-IN")}`,
          `₹${(basePrice * item.qty).toLocaleString("en-IN")}`
        );
        const addonLines =
          item.selectedAddons?.map((addon) =>
            padLine(`+ ${addon.name}`, `₹${((addon.price || 0) * item.qty).toLocaleString("en-IN")}`)
          ) || [];
        return [baseLine, qtyLine, ...addonLines].join("\n");
      })
      .join("\n") || "";

  const w = window.open("", "_blank");
  if (!w) return;

  const html = `<html><head><style>
@page{size:80mm auto;margin:0}
body{font-family:'Courier New',Courier,monospace;white-space:pre;font-size:13px;width:80mm;margin:0;padding:5mm;box-sizing:border-box}
.header{text-align:center;font-weight:bold;margin-bottom:2mm}
.line{border-bottom:1px dashed #000;margin:2mm 0}
.text-center{text-align:center}.text-right{text-align:right}.bold{font-weight:bold}
</style></head><body>
<div class="header">
MY CAFE
01 SKYLINE DRIVE, BUSINESS DISTRICT
+91 0000 000 000
GST: 18AABCT1234H1Z0
</div>
<div class="text-center">Kitchen</div>
<div class="line"></div>

${padLine("Order Ref", "#" + (kb.orderRef || kb._id || "").toString().slice(-8))}
${padLine("Table", isTakeawayOrder(kb) ? "TAKEAWAY" : "TBL-" + kb.table)}
${isTakeawayOrder(kb) && kb.tokenNumber ? padLine("Token No", "#" + kb.tokenNumber) : ""}
${padLine("Placed At", format(billTimestamp, "dd/MM/yyyy • hh:mm a"))}

<div class="line"></div>
<div class="bold">Itemized Manifest</div>
<div class="line"></div>
${itemsText}

<div class="line"></div>
${padLine("Method", "KITCHEN")}
${kb.notes ? `<div class="line"></div><div class="bold">Notes:</div>\n${kb.notes}\n` : ""}
<div class="line"></div>

<div class="text-center">Official Receipt</div>
<div class="text-center">THANK YOU</div>

<script>window.print();window.onafterprint=()=>window.close();</script>
</body></html>`;

  w.document.write(html);
  w.document.close();
};

