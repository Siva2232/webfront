import {
  formatKitchenManifestItems,
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

  writeln(out, "KITCHEN ORDER", { center: true, bold: true });
  writeln(out, m.orderRef, { center: true });
  writeln(out, `Table: ${m.tableLabel}`, { center: true });
  writeln(out, `Time: ${m.placedAt}`, { center: true });
  writeln(out, DASH);

  for (const line of (itemsText || "—").split("\n")) {
    if (!line) continue;
    writeln(out, line, { bold: /^\d+x/.test(line.trim()) });
  }

  if (m.notes) {
    writeln(out, DASH);
    writeln(out, `Note: ${m.notes}`);
  }

  out.value += escFeed(2);
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
