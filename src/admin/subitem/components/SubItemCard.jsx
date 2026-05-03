import React from "react";
import { CheckCircle, Edit3, IndianRupee, Trash2, XCircle } from "lucide-react";

export default function SubItemCard({ item, onEdit, onDelete, onToggleStatus }) {
  return (
    <div
      className={`space-y-4 rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
        item.isAvailable === false
          ? "border-rose-200/90 bg-rose-50/30 ring-1 ring-rose-100/60"
          : "border-zinc-200/80 bg-white ring-1 ring-zinc-100/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                item.type === "portion" ? "bg-zinc-100 text-zinc-800" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {item.type === "portion" ? "Portion" : "Add-on group"}
            </span>
            {item.isAvailable === false && (
              <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[8px] font-bold uppercase text-white">
                Unavailable
              </span>
            )}
          </div>
          <h3
            className={`text-base font-bold leading-snug tracking-tight ${
              item.isAvailable === false ? "text-zinc-400 line-through decoration-rose-400" : "text-zinc-900"
            }`}
          >
            {item.name}
          </h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onToggleStatus(item)}
            className={`rounded-lg p-2 transition ${
              item.isAvailable !== false
                ? "border border-zinc-200 bg-white text-zinc-500 hover:border-rose-200 hover:text-rose-600"
                : "border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            }`}
          >
            {item.isAvailable !== false ? <XCircle size={14} /> : <CheckCircle size={14} />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600 transition hover:border-zinc-300 hover:bg-white"
          >
            <Edit3 size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-rose-600 transition hover:border-rose-200 hover:bg-rose-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {item.type === "portion" && (
        <div className="flex items-center gap-1 font-black text-zinc-900">
          <IndianRupee size={14} strokeWidth={2.5} className="text-zinc-500" />
          <span className="text-lg tabular-nums">{item.price}</span>
        </div>
      )}

      {item.type === "addonGroup" && (
        <div className="space-y-2">
          {item.maxSelections > 0 && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Max select · {item.maxSelections}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {item.addons?.map((a, i) => (
              <span
                key={i}
                className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-2 py-1 text-[10px] font-semibold text-emerald-900"
              >
                {a.name}
                {a.price > 0 ? ` · ₹${a.price}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
