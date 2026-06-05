import { format } from "date-fns";
import { getReceiptHeader, escapeReceiptHtml } from "./receiptHeaderSettings";
import {
  isTakeawayTableOrder,
  takeawayCustomerDisplayName,
} from "../../utils/takeawayCustomer";

/**
 * Single source of truth for 80mm thermal print layout (matches customer bill receipt).
 */
export const RECEIPT_PRINT_CSS = `@page{size:80mm auto;margin:0}
body{font-family:'Courier New',Courier,monospace;font-size:12px;width:80mm;margin:0;padding:4mm;box-sizing:border-box}
.header{text-align:center;font-weight:bold;margin-bottom:2mm;white-space:pre-wrap}
.receipt-pre{white-space:pre;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.35;margin:0;width:100%}
.line{border-bottom:1px dashed #000;margin:2mm 0;height:0}
.text-center{text-align:center}.bold{font-weight:bold}`;

export const RECEIPT_TEXT_WIDTH = 32;
export const RECEIPT_DASH_LINE = "-".repeat(RECEIPT_TEXT_WIDTH);

/** ASCII-only datetime — avoid bullet/special chars that break ESC/POS code pages */
export function formatReceiptDateTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "--";
  return format(d, "dd/MM/yyyy hh:mm a");
}

function wrapReceiptText(input, width = RECEIPT_TEXT_WIDTH) {
  const raw = String(input ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return [];
  if (raw.length <= width) return [raw];

  const words = raw.split(" ");
  const lines = [];
  let current = "";

  for (const w of words) {
    // If a single word is longer than width, hard-break it.
    if (w.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < w.length; i += width) {
        lines.push(w.slice(i, i + width));
      }
      continue;
    }

    const next = current ? `${current} ${w}` : w;
    if (next.length <= width) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Multi-line header from Admin Profile / tenant cache */
export function getReceiptHeaderBlock() {
  const hdr = getReceiptHeader();
  const headerLines = [];

  wrapReceiptText(hdr.restaurantName).forEach((l) => headerLines.push(escapeReceiptHtml(l)));
  wrapReceiptText(hdr.address).forEach((l) => headerLines.push(escapeReceiptHtml(l)));
  wrapReceiptText(hdr.phone).forEach((l) => headerLines.push(escapeReceiptHtml(l)));
  if (hdr.gstNumber) {
    wrapReceiptText(`GST: ${hdr.gstNumber}`).forEach((l) => headerLines.push(escapeReceiptHtml(l)));
  }

  return headerLines.filter((line) => line.trim() !== "").join("\n");
}

/** Kitchen ticket: restaurant name only (no address / phone / GST). */
export function getKitchenReceiptHeaderBlock() {
  const hdr = getReceiptHeader();
  return escapeReceiptHtml(hdr.restaurantName || "").trim() || "Kitchen";
}

export function receiptPad(l, r, width = RECEIPT_TEXT_WIDTH) {
  const left = String(l ?? "");
  let right = String(r ?? "");
  const gap = 1;

  const maxRightWithFullLeft = width - left.length - gap;
  if (right.length > maxRightWithFullLeft) {
    const maxLeft = Math.max(4, Math.floor(width * 0.35));
    const leftBudget = Math.min(left.length, maxLeft);
    const maxRight = width - leftBudget - gap;
    if (right.length > maxRight) {
      right = right.slice(0, Math.max(4, maxRight));
    }
  }

  const maxLeft = width - right.length - gap;
  const leftTrim =
    left.length > maxLeft
      ? left.slice(0, Math.max(1, maxLeft - 2)) + ".."
      : left;
  const sp = width - leftTrim.length - right.length;
  return leftTrim + " ".repeat(sp > 0 ? sp : gap) + right;
}

/** Takeaway-only: Customer + Token lines for thermal receipts (newline-terminated, or ""). */
export function formatTakeawayReceiptLines(order, padFn = receiptPad) {
  if (!isTakeawayTableOrder(order)) return "";

  const lines = [];
  const name = takeawayCustomerDisplayName(order);
  if (name) {
    lines.push(padFn("Customer", escapeReceiptHtml(name)));
  }
  if (order?.tokenNumber != null && String(order.tokenNumber).trim() !== "") {
    lines.push(padFn("Token No", "#" + order.tokenNumber));
  }

  return lines.length ? `${lines.join("\n")}\n` : "";
}

const ITEM_NAME_COL = 18;
const ITEM_QTY_COL = 4;
const ITEM_AMT_COL = RECEIPT_TEXT_WIDTH - ITEM_NAME_COL - ITEM_QTY_COL;

/** Column layout: name (18) + qty (4) + amount (10) = 32 chars */
export function receiptItemLine(name, qty, lineTotal) {
  const n =
    String(name).length > ITEM_NAME_COL
      ? String(name).substring(0, ITEM_NAME_COL)
      : String(name);
  return (
    n.padEnd(ITEM_NAME_COL) +
    String(qty).padStart(ITEM_QTY_COL) +
    Number(lineTotal).toFixed(2).padStart(ITEM_AMT_COL)
  );
}

export function receiptItemsHeaderLine() {
  return (
    "Item".padEnd(ITEM_NAME_COL) +
    "Qty".padStart(ITEM_QTY_COL) +
    "Amount".padStart(ITEM_AMT_COL)
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

/** One line: dish name (left) + Qty n (right), 32-char monospace row */
function kitchenNameQtyLine(name, qty) {
  const right = `Qty ${String(qty ?? "")}`;
  let left = String(name || "").trim();
  const maxLeft = Math.max(4, RECEIPT_TEXT_WIDTH - right.length - 1);
  if (left.length > maxLeft) {
    left = left.slice(0, Math.max(1, maxLeft - 2)) + (maxLeft > 5 ? ".." : "");
  }
  return receiptPad(left, right, RECEIPT_TEXT_WIDTH);
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
