import React from "react";
import { Package } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/80 py-20 text-center ring-1 ring-zinc-100/80 sm:py-24">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 shadow-sm">
        <Package className="h-8 w-8 text-zinc-400" strokeWidth={1.75} />
      </div>
      <h3 className="text-xl font-black tracking-tight text-zinc-900">No products yet</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        Add your first dish or drink — it will appear on the menu and in POS once published.
      </p>
    </div>
  );
}
