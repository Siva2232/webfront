import { getReceiptHeader, escapeReceiptHtml } from "./receiptHeaderSettings";

/**
 * Single source of truth for 80mm thermal print layout (matches customer bill receipt).
 */
export const RECEIPT_PRINT_CSS = `@page{size:80mm auto;margin:0}
body{font-family:'Courier New',Courier,monospace;white-space:pre;font-size:13px;width:80mm;margin:0;padding:5mm;box-sizing:border-box}
.header{text-align:center;font-weight:bold;margin-bottom:2mm}
.line{border-bottom:1px dashed #000;margin:2mm 0}
.text-center{text-align:center}.text-right{text-align:right}.bold{font-weight:bold}`;

/** Multi-line header from Admin Profile / tenant cache */
export function getReceiptHeaderBlock() {
  const hdr = getReceiptHeader();
  const headerLines = [
    escapeReceiptHtml(hdr.restaurantName),
    escapeReceiptHtml(hdr.address),
    escapeReceiptHtml(hdr.phone),
    hdr.gstNumber ? `GST: ${escapeReceiptHtml(hdr.gstNumber)}` : "",
  ].filter((line) => line.trim() !== "");
  return headerLines.join("\n");
}

/** Kitchen ticket: restaurant name only (no address / phone / GST). */
export function getKitchenReceiptHeaderBlock() {
  const hdr = getReceiptHeader();
  return escapeReceiptHtml(hdr.restaurantName || "").trim() || "Kitchen";
}

export function receiptPad(l, r, width = 32) {
  const sp = width - String(l).length - String(r).length;
  return String(l) + " ".repeat(sp > 0 ? sp : 1) + String(r);
}

/** Same column layout as main receipt: 18 + 4 + 10 monospace columns */
export function receiptItemLine(name, qty, lineTotal) {
  const n = String(name).length > 18 ? String(name).substring(0, 18) : String(name);
  return (
    n.padEnd(18) +
    String(qty).padStart(4) +
    Number(lineTotal).toFixed(2).padStart(10)
  );
}

/**
 * Itemized block: base row, optional portion, addons, dashed subtotal — identical to customer receipt.
 */
export function formatManifestItems(items) {
  const lineItems = Array.isArray(items) ? items : [];
  return lineItems
    .map((item) => {
      const addonsTotal =
        item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
      const base = item.price - addonsTotal;
      let line = receiptItemLine(item.name, item.qty, base * item.qty);
      if (item.selectedPortion) line += "\n  Portion: " + item.selectedPortion;
      if (item.selectedAddons?.length) {
        item.selectedAddons.forEach((a) => {
          line +=
            "\n" +
            ("  + " + a.name).padEnd(22) +
            ("Rs." + ((a.price || 0) * item.qty).toFixed(2)).padStart(10);
        });
        line += "\n  " + "-".repeat(28);
        line +=
          "\n  " +
          "Item Total".padEnd(18) +
          ("Rs." + (item.price * item.qty).toFixed(2)).padStart(12);
      }
      return line;
    })
    .join("\n");
}

const KITCHEN_PAD_WIDTH = 32;

/** One line: dish name (left) · Qty n (right), monospace columns like order meta. */
function kitchenNameQtyLine(name, qty) {
  const right = "Qty " + String(qty ?? "");
  let left = String(name || "").trim();
  const maxLeft = Math.max(4, KITCHEN_PAD_WIDTH - right.length - 1);
  if (left.length > maxLeft) {
    left = left.slice(0, Math.max(1, maxLeft - 2)) + (maxLeft > 5 ? ".." : "");
  }
  return receiptPad(left, right, KITCHEN_PAD_WIDTH);
}

/**
 * Kitchen ticket: dish names + qty on one aligned row; portion & add-ons below — no prices.
 */
export function formatKitchenManifestItems(items) {
  const lineItems = Array.isArray(items) ? items : [];
  return lineItems
    .map((item) => {
      let block = kitchenNameQtyLine(item.name, item.qty);
      if (item.selectedPortion) block += "\n  Portion: " + item.selectedPortion;
      if (item.selectedAddons?.length) {
        item.selectedAddons.forEach((a) => {
          block += "\n  + " + String(a.name || "");
        });
      }
      return block;
    })
    .join("\n\n");
}
