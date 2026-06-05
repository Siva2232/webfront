import { receiptPad } from "../../orderBill/receiptPrintCore";

function PaddedRow({ line }) {
  return (
    <pre className="whitespace-pre font-mono text-[10px] leading-snug text-zinc-800">
      {line}
    </pre>
  );
}

function DashedRule() {
  return <div className="my-3 border-b border-dashed border-zinc-300" aria-hidden />;
}

export function KitchenReceiptPreview({ model }) {
  if (!model) return null;

  const headerName = String(model.restaurantName || "").trim();
  const genericKitchen = !headerName || /^kitchen$/i.test(headerName);

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-sm border border-zinc-200/80 bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-zinc-900 shadow-md shadow-zinc-900/10">
      <div className="text-center">
        {!genericKitchen ? (
          <p className="text-sm font-black uppercase tracking-tight">{headerName}</p>
        ) : null}
        <p
          className={`text-[10px] font-bold uppercase tracking-widest text-orange-700 ${
            genericKitchen ? "" : "mt-1"
          }`}
        >
          Kitchen ticket
        </p>
      </div>

      <DashedRule />

      <div className="space-y-0.5">
        <PaddedRow line={receiptPad("Order Ref", model.orderRef)} />
        <PaddedRow line={receiptPad("Table", model.tableLabel)} />
        {model.takeawayMeta.map((row) => (
          <PaddedRow key={row.label} line={receiptPad(row.label, row.value)} />
        ))}
        <PaddedRow line={receiptPad("Placed At", model.placedAt)} />
        {model.status ? (
          <PaddedRow line={receiptPad("Status", String(model.status).toUpperCase())} />
        ) : null}
      </div>

      <DashedRule />

      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-800">
        Itemized manifest
      </p>
      <pre className="mt-2 whitespace-pre font-mono text-[10px] leading-snug text-zinc-800">
        {model.itemsManifest || "—"}
      </pre>

      {model.notes ? (
        <>
          <DashedRule />
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-800">Notes</p>
          <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-snug text-zinc-800">
            {model.notes}
          </pre>
        </>
      ) : null}
    </div>
  );
}
