function MetaRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-[11px] leading-snug text-zinc-700">
      <span className="shrink-0 font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-right font-mono font-medium text-zinc-900">{value}</span>
    </div>
  );
}

function DashedRule() {
  return <div className="my-3 border-b border-dashed border-zinc-300" aria-hidden />;
}

export function OrderReceiptPreview({ model }) {
  if (!model) return null;
  const { header } = model;

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-sm border border-zinc-200/80 bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-zinc-900 shadow-md shadow-zinc-900/10">
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

      <div className="space-y-1.5">
        <MetaRow label="Order ref" value={model.orderRef} />
        <MetaRow label="Table" value={model.tableLabel} />
        {model.takeawayMeta.map((row) => (
          <MetaRow key={row.label} label={row.label} value={row.value} />
        ))}
        <MetaRow label="Placed at" value={model.placedAt} />
      </div>

      {model.hasTakeawayItemsInDineIn ? (
        <p className="mt-3 text-center text-[10px] font-black uppercase tracking-wide text-orange-700">
          Takeaway items included
        </p>
      ) : null}

      <DashedRule />

      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-800">
        Itemized manifest
      </p>
      <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-snug text-zinc-800">
        {model.itemsManifest || "—"}
      </pre>

      <DashedRule />

      <div className="space-y-1">
        <MetaRow label="Subtotal" value={`Rs.${model.subtotal.toFixed(2)}`} />
        <MetaRow label={model.taxLabel} value={`Rs.${model.tax.toFixed(2)}`} />
      </div>

      <DashedRule />

      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-800">Total summary</p>
      <div className="mt-2 space-y-1">
        <MetaRow label="Method" value={model.paymentMethod} />
        <div
          className={`py-1 text-center text-[10px] font-black uppercase tracking-widest ${
            model.isPaid ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {model.paymentStatusText}
        </div>
        <MetaRow label="Total" value={`Rs.${model.total.toFixed(2)}`} />
      </div>

      <DashedRule />

      <p
        className={`text-center text-[11px] font-black uppercase leading-snug ${
          model.isPaid ? "text-emerald-800" : "text-amber-800"
        }`}
      >
        {model.amountDueLabel}
      </p>

      <DashedRule />

      <p className="text-center text-[10px] font-black uppercase tracking-wide text-zinc-700">
        {model.footerLabel}
      </p>
      <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
        Thank you
      </p>
    </div>
  );
}
