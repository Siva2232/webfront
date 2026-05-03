import React from "react";
import { Calendar, ChefHat, RefreshCw, Receipt } from "lucide-react";

export function KitchenBillHeader({
  isLoading,
  dateFilter,
  onDateChange,
  onClearFilter,
  recordCount,
  onRefresh,
}) {
  return (
    <header className="top-0 z-50 border-b border-zinc-200 bg-white px-6 py-5 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 lg:flex-row">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="rounded-[1.25rem] bg-zinc-900 p-3.5 text-white shadow-[0_12px_40px_-18px_rgba(24,24,27,0.35)] ring-1 ring-zinc-900/10">
              <ChefHat size={26} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Kitchen Operations
              </p>
              <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-zinc-900">
                Kitchen Bill
              </h1>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-center gap-4 lg:w-auto lg:justify-end">
          <div className="hidden items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-6 py-3 shadow-inner md:flex">
            <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-200/80">
              <Receipt size={18} className="text-zinc-700" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tabular-nums leading-none text-zinc-900">
                {recordCount.toLocaleString()}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-tight text-zinc-500">
                Active records
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-2 transition-all focus-within:ring-4 focus-within:ring-zinc-900/10 hover:border-zinc-300">
            <Calendar size={18} className="ml-3 text-zinc-600" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent px-1 py-2 text-xs font-black uppercase tracking-wider text-zinc-800 outline-none"
            />
            {dateFilter && (
              <button
                onClick={onClearFilter}
                className="rounded-lg px-3 py-1.5 text-[10px] font-black text-zinc-700 transition-colors hover:bg-zinc-200/80"
              >
                RESET
              </button>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-7 py-3.5 text-xs font-black uppercase text-white shadow-lg shadow-zinc-900/15 transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={16} className={`${isLoading ? "animate-spin" : ""} transition-transform duration-500`} />
            {isLoading ? "Syncing" : "Refresh Data"}
          </button>
        </div>
      </div>
    </header>
  );
}

