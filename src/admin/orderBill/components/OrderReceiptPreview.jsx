import { receiptPad, receiptItemsHeaderLine } from "../receiptPrintCore";

function PaddedRow({ line }) {
  return (
    <pre className="whitespace-pre font-mono text-[10px] leading-snug text-zinc-800">
      {line}
    </pre>
  );
}

function DashedRule() {
  return <div className="my-1.5 border-b border-dashed border-zinc-300" aria-hidden />;
}

export function OrderReceiptPreview({ model }) {
  if (!model) return null;
  const { header } = model;

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-sm border border-zinc-200/80 bg-white px-4 py-3 font-mono text-[11px] leading-snug text-zinc-900 shadow-md shadow-zinc-900/10">
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-tight">{header.restaurantName}</p>
        {header.address ? (
          <p className="mt-1 text-[10px] leading-snug text-zinc-600">{header.address}</p>
        ) : null}
        {header.phone ? <p className="text-[10px] text-zinc-600">{header.phone}</p> : null}
        {header.gstNumber ? (
          <p className="text-[10px] text-zinc-500">GST: {header.gstNumber}</p>
        ) : null}
      </div>

      <DashedRule />

      <div
        className={`mb-2 text-center text-[10px] font-black uppercase tracking-widest ${
          model.isPaid ? "text-emerald-700" : "text-amber-700"
        }`}
      >
        {model.statusLabel}
      </div>
      <p className="text-center text-[10px] text-zinc-600">
        Cashier: <span className="font-semibold text-zinc-800">{model.cashierName}</span>
      </p>

      <DashedRule />

      <div className="space-y-0.5">
        <PaddedRow line={receiptPad("Order Ref", model.orderRef)} />
        <PaddedRow line={receiptPad("Table", model.tableLabel)} />
        {model.takeawayMeta.map((row) => (
          <PaddedRow key={row.label} line={receiptPad(row.label, row.value)} />
        ))}
        <PaddedRow line={receiptPad("Placed At", model.placedAt)} />
      </div>

      {model.hasTakeawayItemsInDineIn ? (
        <p className="mt-3 text-center text-[10px] font-black uppercase tracking-wide text-orange-700">
          Takeaway items included
        </p>
      ) : null}

      <DashedRule />

      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-800">Items</p>
      <pre className="mt-1 whitespace-pre font-mono text-[10px] leading-snug text-zinc-800">
        {`${receiptItemsHeaderLine()}\n${model.itemsManifest || "—"}`}
      </pre>

      <DashedRule />

      <div className="space-y-0.5">
        <PaddedRow line={receiptPad("Subtotal", `Rs.${model.subtotal.toFixed(2)}`)} />
        <PaddedRow line={receiptPad(model.taxLabel, `Rs.${model.tax.toFixed(2)}`)} />
        <PaddedRow line={receiptPad("Total", `Rs.${model.total.toFixed(2)}`)} />
        {!model.isPaid ? (
          <PaddedRow line={receiptPad("DUE", `Rs.${model.total.toFixed(2)}`)} />
        ) : (
          <PaddedRow line={receiptPad("PAID", `Rs.${model.total.toFixed(2)}`)} />
        )}
      </div>
    </div>
  );
}
