import React from "react";
import { Calendar, ChefHat, RefreshCw, Receipt, Search } from "lucide-react";
import StickyPageHeader from "../../components/StickyPageHeader";

export function KitchenBillHeader({
  isLoading,
  dateFilter,
  onDateChange,
  onClearFilter,
  recordCount,
  onRefresh,
  customerSearch = "",
  onCustomerSearchChange,
  takeawayOnly = false,
  onTakeawayOnlyChange,
}) {
  return (
    <StickyPageHeader
      icon={ChefHat}
      eyebrow="Kitchen"
      title="Kitchen bill"
      subtitle="Live tickets, batches, and prep status"
      rightAddon={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:gap-3 lg:w-auto lg:justify-end">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 shadow-inner">
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

          {onCustomerSearchChange && (
            <div className="flex w-full min-w-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2 sm:py-1.5 sm:max-w-xs sm:flex-1 focus-within:ring-2 focus-within:ring-zinc-900/10">
              <Search size={14} className="ml-1 shrink-0 text-zinc-500" />
              <input
                type="search"
                value={customerSearch}
                onChange={(e) => onCustomerSearchChange(e.target.value)}
                placeholder="Name or token #"
                className="min-w-0 w-full flex-1 bg-transparent text-sm sm:text-[10px] font-medium sm:font-bold text-zinc-800 outline-none"
              />
            </div>
          )}

          {onTakeawayOnlyChange && (
            <button
              type="button"
              onClick={() => onTakeawayOnlyChange(!takeawayOnly)}
              className={`w-full sm:w-auto rounded-full border px-3 py-2 sm:py-1.5 text-[10px] font-black uppercase tracking-wider ${
                takeawayOnly
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-zinc-200 bg-white text-zinc-600"
              }`}
            >
              Takeaway only
            </button>
          )}

          <div className="flex w-full min-w-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2 sm:py-1.5 sm:w-auto sm:flex-initial focus-within:ring-2 focus-within:ring-zinc-900/10">
            <Calendar size={14} className="ml-1 shrink-0 text-zinc-500" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => onDateChange(e.target.value)}
              className="min-w-0 w-full flex-1 bg-transparent text-sm sm:text-[10px] font-bold uppercase tracking-wide text-zinc-800 outline-none"
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
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? "Syncing" : "Refresh"}
          </button>
        </div>
      }
    />
  );
}
