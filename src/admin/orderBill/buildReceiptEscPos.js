import { buildReceiptModel, prepareReceiptItems } from "./buildReceiptModel";
import {
  receiptPad as pad,
  formatManifestItems,
  formatTakeawayReceiptLines,
  receiptItemsHeaderLine,
  RECEIPT_DASH_LINE as DASH,
} from "./receiptPrintCore";
import { escInit, escAlign, escBold, escCut, escFeed } from "./escposCommands";

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
  const out = { value: escInit() };

  const { header } = m;
  if (header.restaurantName) writeln(out, header.restaurantName, { center: true, bold: true });
  if (header.address) writeln(out, header.address, { center: true });
  if (header.phone) writeln(out, header.phone, { center: true });
  if (header.gstNumber) writeln(out, `GST: ${header.gstNumber}`, { center: true });

  writeln(out, DASH);
  writeln(out, m.statusLabel, { center: true, bold: true });
  writeln(out, `Cashier: ${m.cashierName}`, { center: true });
  writeln(out, DASH);

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
  writeln(out, "Itemized Manifest", { bold: true });
  writeln(out, DASH);

  const takeawayBlock = formatTakeawayReceiptLines(order, pad);
  if (takeawayBlock) {
    for (const line of takeawayBlock.trim().split("\n")) {
      if (line) writeln(out, line);
    }
  }

  for (const line of (itemsText || "—").split("\n")) {
    writeln(out, line);
  }

  writeln(out, DASH);
  writeln(out, pad("Subtotal", `Rs.${m.subtotal.toFixed(2)}`));
  writeln(out, pad(m.taxLabel, `Rs.${m.tax.toFixed(2)}`));
  writeln(out, DASH);
  writeln(out, "Total Summary", { bold: true });
  writeln(out, pad("Method", m.paymentMethod));
  writeln(out, pad("Status", m.isPaid ? "COMPLETED" : "DUE"));
  writeln(out, pad("Total", `Rs.${m.total.toFixed(2)}`));
  writeln(out, DASH);

  if (m.isPaid) {
    writeln(out, `PAID IN FULL`, { center: true, bold: true });
    writeln(out, `Rs.${m.total.toFixed(2)}`, { center: true, bold: true });
  } else {
    writeln(out, "Total Unpaid (Collect Cash)", { center: true, bold: true });
    writeln(out, `Rs.${m.total.toFixed(2)}`, { center: true, bold: true });
  }

  writeln(out, DASH);
  writeln(out, m.footerLabel.toUpperCase(), { center: true, bold: true });
  writeln(out, "THANK YOU", { center: true });

  out.value += escFeed(4);
  out.value += escCut();
  return out.value;
}

export function buildTestEscPos() {
  const out = { value: escInit() };
  writeln(out, "PRINTER TEST", { center: true, bold: true });
  writeln(out, DASH);
  writeln(out, new Date().toLocaleString(), { center: true });
  writeln(out, "If you see this, direct print works.");
  out.value += escFeed(4);
  out.value += escCut();
  return out.value;
}
