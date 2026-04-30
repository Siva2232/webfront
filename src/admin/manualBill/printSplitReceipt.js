import { format } from "date-fns";
import { TAKEAWAY_TABLE } from "../../context/CartContext";

export const printSplitReceipt = ({ order, items, cashierName = "N/A", toast }) => {
  const w = window.open("", "_blank");
  if (!w) {
    toast?.error?.("Pop-up blocked – allow pop-ups to print");
    return;
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const pad = (l, r, width = 32) => {
    const sp = width - l.length - r.length;
    return l + " ".repeat(sp > 0 ? sp : 1) + r;
  };

  const itemLine = (name, qty, price) => {
    const n = name.length > 18 ? name.substring(0, 18) : name;
    return n.padEnd(18) + qty.toString().padStart(4) + price.toFixed(2).padStart(10);
  };

  const itemsText = items
    .map((item) => {
      const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
      const base = item.price - addonsTotal;
      let line = itemLine(item.name, item.qty, base * item.qty);
      if (item.selectedPortion) line += "\n  Portion: " + item.selectedPortion;
      if (item.selectedAddons?.length) {
        item.selectedAddons.forEach((a) => {
          line +=
            "\n" +
            ("  + " + a.name).padEnd(22) +
            ("Rs." + ((a.price || 0) * item.qty).toFixed(2)).padStart(10);
        });
        line += "\n  " + "-".repeat(28);
        line += "\n  " + "Item Total".padEnd(18) + ("Rs." + (item.price * item.qty).toFixed(2)).padStart(12);
      }
      return line;
    })
    .join("\n");

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
<div class="text-center bold">CUSTOM BILL (SPLIT)</div>
<div class="text-center">Cashier: ${cashierName}</div>
<div class="line"></div>

${pad("Order Ref", "#" + (order._id || "").slice(-6))}
${pad("Location", order.table === TAKEAWAY_TABLE ? "TAKEAWAY" : "TBL-" + order.table)}
${pad("Placed At", format(new Date(order.createdAt || order.billedAt || Date.now()), "dd/MM/yyyy  hh:mm a"))}

<div class="line"></div>
<div class="bold">Itemized Manifest</div>
<div class="line"></div>
${itemsText}

<div class="line"></div>
${pad("Subtotal", "Rs." + subtotal.toFixed(2))}
${pad("Tax (GST 5%)", "Rs." + tax.toFixed(2))}

<div class="line"></div>
<div class="bold">Total Due</div>
<div class="bold text-center">Rs.${total.toFixed(2)}</div>
<div class="line"></div>

<div class="text-center">Official Receipt</div>
<div class="text-center">THANK YOU</div>

<script>window.print();window.onafterprint=()=>window.close();</script>
</body></html>`;

  w.document.write(html);
  w.document.close();
};

