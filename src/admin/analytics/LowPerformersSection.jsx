import React from "react";
import { motion as Motion } from "framer-motion";
import { TrendingDown } from "lucide-react";

function fmtINR(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;
}

export default function LowPerformersSection({ items, loading }) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100/80">
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  const list = items || [];
  const maxQty = Math.max(1, ...list.map((x) => x.qty || 0));

  return (
    <div className="rounded-3xl border border-rose-100/80 bg-white p-6 shadow-sm ring-1 ring-rose-50 md:p-8">
      <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-zinc-900">
        <TrendingDown className="text-rose-500" size={18} />
        Low performing menu
      </h3>
      <div className="space-y-3">
        {list.map((item, i) => {
          const pct = item.qty > 0 ? Math.max(8, (item.qty / maxQty) * 100) : 4;
          return (
            <div
              key={`${item.name}-${i}`}
              className="flex items-center justify-between rounded-2xl border border-rose-50 bg-rose-50/30 p-4 transition hover:bg-rose-50/50"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-sm font-black text-rose-700">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">{item.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {item.noSales || item.qty === 0
                      ? "No sales in range"
                      : `${item.qty} sold · ${fmtINR(item.price ?? item.revenue / Math.max(1, item.qty))} avg`}
                  </p>
                  <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-rose-100">
                    <Motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "circOut" }}
                      className="h-full rounded-full bg-rose-400"
                    />
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold tabular-nums text-zinc-900">{fmtINR(item.revenue)}</p>
                <p className="text-[10px] font-semibold text-rose-600">
                  {item.qty} {item.qty === 1 ? "unit" : "units"}
                </p>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-400">
            No menu performance data for this range.
          </p>
        )}
      </div>
    </div>
  );
}
