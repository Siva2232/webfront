import { buildReceiptModel, prepareReceiptItems } from "./buildReceiptModel";
import {
  receiptPad as pad,
  formatManifestItems,
  receiptItemsHeaderLine,
  RECEIPT_DASH_LINE as DASH,
} from "./receiptPrintCore";
import { escInit, escAlign, escBold, escCut, escFeed, escFont } from "./escposCommands";

function writeln(out, text, { center = false, bold = false } = {}) {
  out.value += center ? escAlign(1) : escAlign(0);
  if (bold) out.value += escBold(1);
  out.value += String(text ?? "") + "\n";
  if (bold) out.value += escBold(0);
}

/** Raw ESC/POS receipt bytes (UTF-8 text + control codes) for direct thermal print */
export function buildReceiptEscPos(order, cashierName = "N/A") {
  const m = buildReceiptModel(order, cashierName);
  const { receiptItems } = prepareReceiptItems(order);
  const itemsText = formatManifestItems(receiptItems);
  const out = { value: escInit() + escFont(1) };

  const { header } = m;
  if (header.restaurantName) writeln(out, header.restaurantName, { center: true, bold: true });
  if (header.address) writeln(out, header.address, { center: true });
  if (header.phone) writeln(out, header.phone, { center: true });
  if (header.gstNumber) writeln(out, `GST: ${header.gstNumber}`, { center: true });

  writeln(out, DASH);
  writeln(out, m.statusLabel, { center: true, bold: true });
  writeln(out, `Cashier: ${m.cashierName}`);
  writeln(out, pad("Order Ref", m.orderRef.replace(/^#/, "#")));
  writeln(out, pad("Table", m.tableLabel));
  for (const row of m.takeawayMeta) {
    writeln(out, pad(row.label, row.value));
  }
  writeln(out, pad("Placed At", m.placedAt));

  if (m.hasTakeawayItemsInDineIn) {
    writeln(out, "TAKEAWAY ITEMS INCLUDED", { center: true, bold: true });
  }

  writeln(out, DASH);
  writeln(out, receiptItemsHeaderLine());

  for (const line of (itemsText || "—").split("\n")) {
    if (line) writeln(out, line);
  }

  writeln(out, DASH);
  writeln(out, pad("Subtotal", `Rs.${m.subtotal.toFixed(2)}`));
  writeln(out, pad("Tax", `Rs.${m.tax.toFixed(2)}`));
  writeln(out, pad("Total", `Rs.${m.total.toFixed(2)}`), { bold: true });

  if (m.isPaid) {
    writeln(out, pad("PAID", `Rs.${m.total.toFixed(2)}`), { bold: true });
  } else {
    writeln(out, pad("DUE", `Rs.${m.total.toFixed(2)}`), { bold: true });
  }

  out.value += escFeed(2);
  out.value += escCut();
  return out.value;
}

export function buildTestEscPos() {
  const out = { value: escInit() + escFont(1) };
  writeln(out, "PRINTER TEST", { center: true, bold: true });
  writeln(out, DASH);
  writeln(out, new Date().toLocaleString(), { center: true });
  writeln(out, "If you see this, direct print works.");
  out.value += escFeed(4);
  out.value += escCut();
  return out.value;
}
