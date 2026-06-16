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

function MoneyRow({ label, value, bold = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 text-[10px] ${
        bold ? "font-black text-zinc-900" : "text-zinc-700"
      }`}
    >
      <span className="shrink-0 font-semibold uppercase tracking-wide">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function OrderReceiptPreview({ model }) {
  if (!model) return null;
  const { header } = model;
  const rows = model.itemRows?.length ? model.itemRows : [];

  return (
    <div className="mx-auto w-full max-w-[min(100%,22rem)] rounded-sm border border-zinc-300 bg-white px-3 py-3 font-mono text-[11px] leading-snug text-zinc-900 shadow-md shadow-zinc-900/10 sm:px-4">
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-tight">{header.restaurantName}</p>
        {header.address ? (
          <p className="mt-1 break-words text-[10px] leading-snug text-zinc-600">{header.address}</p>
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

      <div className="space-y-1">
        <MetaRow label="Order Ref" value={model.orderRef} />
        <MetaRow label="Table" value={model.tableLabel} />
        {model.takeawayMeta.map((row) => (
          <MetaRow key={row.label} label={row.label} value={row.value} />
        ))}
        <MetaRow label="Placed At" value={model.placedAt} />
      </div>

      {model.hasTakeawayItemsInDineIn ? (
        <p className="mt-3 text-center text-[10px] font-black uppercase tracking-wide text-orange-700">
          Takeaway items included
        </p>
      ) : null}

      <DashedRule />

      <div className="grid grid-cols-[minmax(0,1fr)_2rem_4.5rem] gap-x-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Amount</span>
      </div>

      <DashedRule />

      <div className="space-y-2.5">
        {rows.length > 0 ? (
          rows.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="space-y-0.5">
              <div className="grid grid-cols-[minmax(0,1fr)_2rem_4.5rem] gap-x-2 items-start">
                <p className="min-w-0 break-words font-semibold leading-snug text-zinc-900">
                  {item.name}
                </p>
                <span className="text-right font-black tabular-nums text-zinc-900">{item.qty}</span>
                <span className="text-right font-bold tabular-nums text-zinc-800">
                  {Number(item.lineTotal).toFixed(2)}
                </span>
              </div>
              {item.portion ? (
                <p className="pl-2 text-[9px] font-medium text-zinc-600">Portion: {item.portion}</p>
              ) : null}
              {item.addons?.map((addon, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_2rem_4.5rem] gap-x-2 pl-2 text-[9px] text-emerald-700"
                >
                  <span className="min-w-0 break-words">+ {addon.name}</span>
                  <span className="text-right tabular-nums">{item.qty}</span>
                  <span className="text-right tabular-nums">{Number(addon.lineTotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ))
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-zinc-800">
            {model.itemsManifest || "—"}
          </pre>
        )}
      </div>

      <DashedRule />

      <div className="space-y-1">
        <MoneyRow label="Subtotal" value={`Rs.${model.subtotal.toFixed(2)}`} />
        <MoneyRow label={model.taxLabel} value={`Rs.${model.tax.toFixed(2)}`} />
        <MoneyRow label="Total" value={`Rs.${model.total.toFixed(2)}`} bold />
        {!model.isPaid ? (
          <MoneyRow label="DUE" value={`Rs.${model.total.toFixed(2)}`} bold />
        ) : (
          <MoneyRow label="PAID" value={`Rs.${model.total.toFixed(2)}`} bold />
        )}
      </div>
    </div>
  );
}
