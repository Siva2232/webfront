function DashedRule() {
  return <div className="my-1.5 border-b border-dashed border-zinc-300" aria-hidden />;
}

export function KitchenReceiptPreview({ model }) {
  if (!model) return null;

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-sm border border-zinc-200/80 bg-white px-4 py-3 font-mono text-[11px] leading-snug text-zinc-900 shadow-md shadow-zinc-900/10">
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-tight text-orange-700">Kitchen order</p>
        <p className="mt-0.5 text-[10px] font-semibold text-zinc-700">{model.orderRef}</p>
        <p className="text-[10px] text-zinc-600">Table: {model.tableLabel}</p>
        <p className="text-[10px] text-zinc-600">Time: {model.placedAt}</p>
      </div>

      <DashedRule />

      <pre className="whitespace-pre font-mono text-[10px] leading-snug text-zinc-800">
        {model.itemsManifest || "—"}
      </pre>

      {model.notes ? (
        <>
          <DashedRule />
          <p className="text-[10px] font-semibold text-zinc-800">Note: {model.notes}</p>
        </>
      ) : null}
    </div>
  );
}
