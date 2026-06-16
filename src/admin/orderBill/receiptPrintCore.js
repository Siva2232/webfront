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
body{font-family:'Courier New',Courier,monospace;font-size:12px;width:80mm;margin:0;padding:2mm;box-sizing:border-box}
.header{text-align:center;font-weight:bold;margin-bottom:1mm;white-space:pre-wrap}
.receipt-pre{white-space:pre;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.2;margin:0;width:100%}
.line{border-bottom:1px dashed #000;margin:1mm 0;height:0}
.text-center{text-align:center}.bold{font-weight:bold}`;

export const RECEIPT_TEXT_WIDTH = 56;
export const RECEIPT_DASH_LINE = "-".repeat(RECEIPT_TEXT_WIDTH);

/** 80mm thermal — kitchen tickets share the same printable width */
export const KITCHEN_RECEIPT_TEXT_WIDTH = RECEIPT_TEXT_WIDTH;
export const KITCHEN_DASH_LINE = "-".repeat(KITCHEN_RECEIPT_TEXT_WIDTH);
const KITCHEN_QTY_COL = 5;

export function kitchenDashLine(width = KITCHEN_RECEIPT_TEXT_WIDTH) {
  return "-".repeat(width);
}

export function kitchenItemsHeaderLine(width = KITCHEN_RECEIPT_TEXT_WIDTH) {
  const qtyCol = KITCHEN_QTY_COL;
  return "QTY".padEnd(qtyCol) + "ITEM".padEnd(width - qtyCol);
}

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

const ITEM_QTY_COL = 4;
const ITEM_AMT_COL = 11;
const ITEM_NAME_COL = RECEIPT_TEXT_WIDTH - ITEM_QTY_COL - ITEM_AMT_COL;

/** Column layout: name + qty + amount = full 80mm width */
export function receiptItemLine(name, qty, lineTotal, width = RECEIPT_TEXT_WIDTH) {
  const nameCol = width - ITEM_QTY_COL - ITEM_AMT_COL;
  const amtCol = ITEM_AMT_COL;
  const nRaw = String(name ?? "");
  const n =
    nRaw.length > nameCol ? nRaw.substring(0, Math.max(4, nameCol - 2)) + ".." : nRaw;
  const qtyStr = qty === "" || qty == null ? "".padStart(ITEM_QTY_COL) : String(qty).padStart(ITEM_QTY_COL);
  const amtStr =
    lineTotal === "" || lineTotal == null
      ? "".padStart(amtCol)
      : Number(lineTotal).toFixed(2).padStart(amtCol);
  return n.padEnd(nameCol) + qtyStr + amtStr;
}

export function receiptItemsHeaderLine(width = RECEIPT_TEXT_WIDTH) {
  const nameCol = width - ITEM_QTY_COL - ITEM_AMT_COL;
  return (
    "Item".padEnd(nameCol) +
    "Qty".padStart(ITEM_QTY_COL) +
    "Amount".padStart(ITEM_AMT_COL)
  );
}

/**
 * Itemized block: base row, portion on next line, addons — full 80mm width.
 */
export function buildReceiptItemRows(items) {
  const lineItems = Array.isArray(items) ? items : [];
  return lineItems.map((item) => {
    const addonsTotal =
      item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
    const base = item.price - addonsTotal;
    return {
      name: String(item.name || ""),
      portion: item.selectedPortion ? String(item.selectedPortion) : null,
      qty: item.qty ?? item.quantity ?? 1,
      lineTotal: base * (item.qty ?? item.quantity ?? 1),
      addons: (item.selectedAddons || []).map((a) => ({
        name: a.name,
        lineTotal: (a.price || 0) * (item.qty ?? item.quantity ?? 1),
      })),
    };
  });
}

export function formatManifestItems(items, width = RECEIPT_TEXT_WIDTH) {
  const lineItems = Array.isArray(items) ? items : [];
  return lineItems
    .map((item) => {
      const addonsTotal =
        item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
      const base = item.price - addonsTotal;
      const qty = item.qty ?? item.quantity ?? 1;
      let block = receiptItemLine(String(item.name || ""), qty, base * qty, width);
      if (item.selectedPortion) {
        block += `\n  Portion: ${item.selectedPortion}`;
      }
      if (item.selectedAddons?.length) {
        item.selectedAddons.forEach((a) => {
          const addonName = `+ ${a.name}`;
          block += "\n" + receiptItemLine(addonName, qty, (a.price || 0) * qty, width);
        });
      }
      return block;
    })
    .join("\n");
}

function kitchenItemName(item) {
  let name = String(item.name || item.productName || "").trim();
  if (item.selectedPortion) name += ` (${item.selectedPortion})`;
  return name || "Item";
}

/** Kitchen ticket rows for preview UI — [{ qty, name, addons }] */
export function buildKitchenItemRows(items) {
  const lineItems = Array.isArray(items) ? items : [];
  return lineItems.map((item) => {
    const qty = item.qty ?? item.quantity ?? 1;
    const addons = (item.selectedAddons || [])
      .map((a) => a?.name)
      .filter(Boolean);
    return {
      qty,
      name: kitchenItemName(item),
      addons,
      isTakeaway: Boolean(item.isTakeaway),
    };
  });
}

/**
 * Kitchen ticket: full-width qty + item columns; portion inline — no prices.
 */
export function formatKitchenManifestItems(items, width = KITCHEN_RECEIPT_TEXT_WIDTH) {
  const lineItems = Array.isArray(items) ? items : [];
  const qtyCol = KITCHEN_QTY_COL;
  const nameCol = Math.max(12, width - qtyCol);
  const blocks = [];

  for (const item of lineItems) {
    const qty = item.qty ?? item.quantity ?? 1;
    const name = kitchenItemName(item);
    const qtyLabel = `${qty}x`.padEnd(qtyCol);
    const nameLines = wrapReceiptText(name, nameCol);
    const lines = [`${qtyLabel}${nameLines[0] || ""}`];
    for (let i = 1; i < nameLines.length; i++) {
      lines.push(`${" ".repeat(qtyCol)}${nameLines[i]}`);
    }
    if (item.selectedAddons?.length) {
      const addonText = item.selectedAddons.map((a) => a.name).filter(Boolean).join(", ");
      if (addonText) {
        wrapReceiptText(`+ ${addonText}`, nameCol).forEach((addonLine) => {
          lines.push(`${" ".repeat(qtyCol)}${addonLine}`);
        });
      }
    }
    blocks.push(lines.join("\n"));
  }

  return blocks.join("\n");
}
