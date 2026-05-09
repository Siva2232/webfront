import React from "react";
import { Calendar, ChefHat, RefreshCw, Receipt } from "lucide-react";
import StickyPageHeader from "../../components/StickyPageHeader";

export function KitchenBillHeader({
  isLoading,
  dateFilter,
  onDateChange,
  onClearFilter,
  recordCount,
  onRefresh,
}) {
  return (
    <StickyPageHeader
      icon={ChefHat}
      eyebrow="Kitchen"
      title="Kitchen bill"
      subtitle="Live tickets, batches, and prep status"
      rightAddon={
        <>
          <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 shadow-inner sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-zinc-200/80">
              <Receipt size={16} className="text-zinc-700" />
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-sm font-black tabular-nums leading-none text-zinc-900">
                {recordCount.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-tight text-zinc-500">
                Active
              </span>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 focus-within:ring-2 focus-within:ring-zinc-900/10">
            <Calendar size={14} className="ml-1 shrink-0 text-zinc-500" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => onDateChange(e.target.value)}
              className="min-w-0 bg-transparent text-[10px] font-bold uppercase tracking-wide text-zinc-800 outline-none"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={onClearFilter}
                className="shrink-0 rounded-lg px-2 py-1 text-[9px] font-black text-zinc-600 hover:bg-zinc-200/80"
              >
                Reset
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? "Syncing" : "Refresh"}
          </button>
        </>
      }
    />
  );
}

