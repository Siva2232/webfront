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

export function KitchenReceiptPreview({ model }) {
  if (!model) return null;

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-sm border border-zinc-200/80 bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-zinc-900 shadow-md shadow-zinc-900/10">
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-tight">{model.restaurantName}</p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-orange-700">
          Kitchen ticket
        </p>
      </div>

      <DashedRule />

      <div className="space-y-1.5">
        <MetaRow label="Order ref" value={model.orderRef} />
        <MetaRow label="Table" value={model.tableLabel} />
        {model.takeawayMeta.map((row) => (
          <MetaRow key={row.label} label={row.label} value={row.value} />
        ))}
        <MetaRow label="Placed at" value={model.placedAt} />
        {model.status ? (
          <MetaRow label="Status" value={String(model.status).toUpperCase()} />
        ) : null}
      </div>

      <DashedRule />

      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-800">
        Itemized manifest
      </p>
      <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-snug text-zinc-800">
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
