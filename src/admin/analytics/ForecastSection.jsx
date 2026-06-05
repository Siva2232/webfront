import React from "react";
import { motion as Motion } from "framer-motion";
import { Sparkles, ShoppingBag, Banknote, TrendingUp } from "lucide-react";

function fmtINR(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;
}

export default function ForecastSection({ forecast, loading }) {
  if (loading) {
    return <div className="h-full min-h-[320px] animate-pulse rounded-3xl bg-zinc-100" />;
  }

  const f = forecast || {};
  const horizon = f.horizonDays || 7;

  return (
    <Motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex h-full min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-xl"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 opacity-[0.08]">
        <Sparkles size={220} />
      </div>

      <div className="relative z-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
          <TrendingUp size={24} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
          Forecasting analytics
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Next {horizon} days based on daily averages in your selected range
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <ShoppingBag size={14} />
              Expected orders
            </div>
            <p className="text-3xl font-black tabular-nums">{f.expectedOrders ?? "—"}</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              ~{f.dailyAvgOrders ?? 0} orders / day
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <Banknote size={14} />
              Expected revenue
            </div>
            <p className="text-3xl font-black tabular-nums">{fmtINR(f.expectedRevenue)}</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              ~{fmtINR(f.dailyAvgRevenue)} / day
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-medium text-zinc-400">
        Simple moving average — not ML. Use as a directional guide for staffing and prep.
      </div>
    </Motion.div>
  );
}
