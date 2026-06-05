import {
  receiptPad as pad,
  formatKitchenManifestItems,
  formatTakeawayReceiptLines,
  RECEIPT_DASH_LINE as DASH,
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
  const out = { value: escInit() };

  const headerName = String(m.restaurantName || "").trim();
  const genericKitchen =
    !headerName || /^kitchen$/i.test(headerName);
  if (!genericKitchen) {
    writeln(out, headerName, { center: true, bold: true });
  }
  writeln(out, "Kitchen Ticket", { center: true, bold: genericKitchen });
  writeln(out, DASH);

  writeln(out, pad("Order Ref", m.orderRef.replace(/^#/, "#")));
  writeln(out, pad("Table", m.tableLabel));

  const takeawayBlock = formatTakeawayReceiptLines(kb, pad);
  if (takeawayBlock) {
    for (const line of takeawayBlock.trim().split("\n")) {
      if (line) writeln(out, line);
    }
  }

  writeln(out, pad("Placed At", m.placedAt));
  writeln(out, DASH);
  writeln(out, "Itemized Manifest", { bold: true });
  writeln(out, DASH);

  for (const line of (itemsText || "—").split("\n")) {
    writeln(out, line);
  }

  if (m.notes) {
    writeln(out, DASH);
    writeln(out, "Notes:", { bold: true });
    for (const line of m.notes.split("\n")) {
      writeln(out, line);
    }
  }

  writeln(out, DASH);
  out.value += escFeed(4);
  out.value += escCut();
  return out.value;
}

export function buildKitchenTestEscPos() {
  const out = { value: escInit() };
  writeln(out, "KITCHEN PRINTER TEST", { center: true, bold: true });
  writeln(out, DASH);
  writeln(out, new Date().toLocaleString(), { center: true });
  writeln(out, "If you see this, kitchen direct print works.");
  out.value += escFeed(4);
  out.value += escCut();
  return out.value;
}
