import React from "react";
import { Link } from "react-router-dom";
import { Calendar, RefreshCw, Receipt, TrendingUp, Scissors, ChevronRight } from "lucide-react";

export function OrderBillHeader({
  isLoading,
  dateFilter,
  onDateChange,
  onClearFilter,
  recordCount,
  onBack,
  onRefresh,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/20">
            <TrendingUp size={22} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
              <span>Billing</span>
              <ChevronRight size={12} className="opacity-70" />
              {/* <span className="text-zinc-600">Order bill</span> */}
            </div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 md:text-2xl">Order bill</h1>
            <p className="text-[11px] text-zinc-500">Active invoices, print, and payments</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:justify-end">
          <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 shadow-inner sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-zinc-200/80">
              <Receipt size={16} className="text-zinc-700" />
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-sm font-black tabular-nums leading-none text-zinc-900">
                {recordCount.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-tight text-zinc-500">Active</span>
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

          <Link
            to="/admin/manual-bill"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-900 shadow-sm shadow-zinc-900/10 transition-colors hover:bg-zinc-50 active:scale-[0.99]"
          >
            <Scissors size={14} />
            Split bill
          </Link>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? "Syncing" : "Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}