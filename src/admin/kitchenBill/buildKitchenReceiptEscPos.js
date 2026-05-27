import { format } from "date-fns";
import {
  receiptPad as pad,
  formatKitchenManifestItems,
  formatTakeawayReceiptLines,
} from "../orderBill/receiptPrintCore";
import { escInit, escAlign, escBold, escCut, escFeed } from "../orderBill/escposCommands";
import { buildKitchenReceiptModel } from "./buildKitchenReceiptModel";

const DASH = "-".repeat(32);

function writeln(out, text, { center = false, bold = false } = {}) {
  out.value += center ? escAlign(1) : escAlign(0);
  if (bold) out.value += escBold(1);
  out.value += String(text ?? "") + "\n";
  if (bold) out.value += escBold(0);
}

export function buildKitchenReceiptEscPos(kb) {
  const m = buildKitchenReceiptModel(kb);
  if (!m) return escInit();

  const billTimestamp = kb.createdAt ? new Date(kb.createdAt) : new Date();
  const itemsText = formatKitchenManifestItems(kb.items || []);
  const out = { value: escInit() };

  const headerName = m.restaurantName;
  if (headerName) writeln(out, headerName, { center: true, bold: true });

  writeln(out, DASH);
  writeln(out, "KITCHEN", { center: true, bold: true });
  writeln(out, DASH);

  writeln(out, pad("Order Ref", m.orderRef.replace(/^#/, "#")));
  writeln(out, pad("Table", m.tableLabel));

  const takeawayBlock = formatTakeawayReceiptLines(kb, pad);
  if (takeawayBlock) {
    for (const line of takeawayBlock.trim().split("\n")) {
      if (line) writeln(out, line);
    }
  }

  writeln(out, pad("Placed At", format(billTimestamp, "dd/MM/yyyy • hh:mm a")));
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
