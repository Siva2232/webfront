function DashedRule() {
  return <div className="my-2 border-b border-dashed border-zinc-400" aria-hidden />;
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[10px]">
      <span className="shrink-0 font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="min-w-0 text-right font-bold text-zinc-900">{value}</span>
    </div>
  );
}

export function KitchenReceiptPreview({ model }) {
  if (!model) return null;

  const rows = model.itemRows?.length
    ? model.itemRows
    : (model.itemsManifest || "—")
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const m = line.trim().match(/^(\d+)x\s+(.+)$/);
          return m ? { qty: Number(m[1]), name: m[2], addons: [] } : { qty: 1, name: line, addons: [] };
        });

  return (
    <div className="mx-auto w-full max-w-[min(100%,22rem)] rounded-sm border border-zinc-300 bg-white px-3 py-3 font-mono text-[11px] leading-snug text-zinc-900 shadow-md shadow-zinc-900/10 sm:px-4">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {model.restaurantName}
        </p>
        <p className="mt-1 text-sm font-black uppercase tracking-tight text-orange-700">
          Kitchen order
        </p>
        {model.batchNumber ? (
          <p className="mt-0.5 text-[10px] font-black uppercase text-red-700">
            Batch #{model.batchNumber}
          </p>
        ) : null}
      </div>

      <div className="mt-2 space-y-1">
        <MetaRow label="Order" value={model.orderRef} />
        <MetaRow label="Table" value={model.tableLabel} />
        <MetaRow label="Time" value={model.placedAt} />
        {model.takeawayMeta?.map((row) => (
          <MetaRow key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
        ))}
      </div>

      <DashedRule />

      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        <span className="text-right">Qty</span>
        <span>Item</span>
      </div>

      <DashedRule />

      <div className="space-y-2">
        {rows.map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 gap-y-0.5"
          >
            <span className="text-right text-[11px] font-black tabular-nums text-zinc-900">
              {item.qty}×
            </span>
            <div className="min-w-0">
              <p className="break-words text-[11px] font-bold leading-snug text-zinc-900">
                {item.name}
              </p>
              {item.isTakeaway ? (
                <span className="mt-0.5 inline-block rounded bg-orange-100 px-1 text-[8px] font-black uppercase text-orange-800">
                  T/A
                </span>
              ) : null}
              {item.addons?.length > 0 ? (
                <p className="mt-0.5 break-words text-[9px] font-medium text-emerald-700">
                  + {item.addons.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {model.notes ? (
        <>
          <DashedRule />
          <p className="break-words text-[10px] font-semibold text-zinc-800">
            Note: {model.notes}
          </p>
        </>
      ) : null}
    </div>
  );
}
