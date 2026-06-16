import {
  formatKitchenManifestItems,
  kitchenDashLine,
  kitchenItemsHeaderLine,
  KITCHEN_RECEIPT_TEXT_WIDTH,
  receiptPad,
} from "../orderBill/receiptPrintCore";
import { escInit, escAlign, escBold, escCut, escFeed } from "../orderBill/escposCommands";
import { buildKitchenReceiptModel } from "./buildKitchenReceiptModel";

function writeln(out, text, { center = false, bold = false } = {}) {
  out.value += center ? escAlign(1) : escAlign(0);
  if (bold) out.value += escBold(1);
  out.value += String(text ?? "") + "\n";
  if (bold) out.value += escBold(0);
}

export function buildKitchenReceiptEscPos(kb) {
  const m = buildKitchenReceiptModel(kb);
  if (!m) return escInit();

  const itemsText = formatKitchenManifestItems(kb.items || []);
  const dash = kitchenDashLine();
  const out = { value: escInit() };

  writeln(out, m.restaurantName, { center: true, bold: true });
  writeln(out, "KITCHEN ORDER", { center: true, bold: true });
  if (m.batchNumber) {
    writeln(out, `BATCH #${m.batchNumber}`, { center: true, bold: true });
  }

  writeln(out, receiptPad("Order", m.orderRef, KITCHEN_RECEIPT_TEXT_WIDTH));
  writeln(out, receiptPad("Table", m.tableLabel, KITCHEN_RECEIPT_TEXT_WIDTH));
  writeln(out, receiptPad("Time", m.placedAt, KITCHEN_RECEIPT_TEXT_WIDTH));

  for (const row of m.takeawayMeta || []) {
    writeln(out, receiptPad(row.label, row.value, KITCHEN_RECEIPT_TEXT_WIDTH));
  }

  writeln(out, dash);
  writeln(out, kitchenItemsHeaderLine(), { bold: true });
  writeln(out, dash);

  for (const line of (itemsText || "—").split("\n")) {
    if (!line) continue;
    const trimmed = line.trimStart();
    const isQtyLine = /^\d+x/.test(trimmed);
    writeln(out, line, { bold: isQtyLine });
  }

  if (m.notes) {
    writeln(out, dash);
    const noteLines = String(m.notes).split(/\n/);
    noteLines.forEach((noteLine, idx) => {
      writeln(out, idx === 0 ? `Note: ${noteLine}` : noteLine);
    });
  }

  out.value += escFeed(2);
  out.value += escCut();
  return out.value;
}

export function buildKitchenTestEscPos() {
  const dash = kitchenDashLine();
  const out = { value: escInit() };
  writeln(out, "KITCHEN PRINTER TEST", { center: true, bold: true });
  writeln(out, dash);
  writeln(out, new Date().toLocaleString(), { center: true });
  writeln(out, "If you see this, kitchen direct print works.");
  out.value += escFeed(4);
  out.value += escCut();
  return out.value;
}
