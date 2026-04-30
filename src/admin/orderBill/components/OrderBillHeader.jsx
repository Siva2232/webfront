import React from "react";
import { Calendar, ChevronLeft, RefreshCw, Receipt, TrendingUp } from "lucide-react";

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
    <header className=" top-0 z-50  border-b border-slate-200 px-6 py-5 md:px-10">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
        
        {/* Left: Branding & Back Button */}
        <div className="flex items-center gap-6">
          {/* <button
            onClick={onBack}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 group border border-transparent hover:border-slate-200"
          >
            <ChevronLeft size={24} className="text-slate-400 group-hover:text-slate-900" />
          </button>
           */}
          <div className="flex items-center gap-5">
            <div className="bg-black p-3.5 rounded-[1.25rem] text-white shadow-xl shadow-orange-200/50">
              <TrendingUp size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">
                Invoice<span className="text-indigo-600">Center</span>
              </h1>
              {/* <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                <span className="w-6 h-[1.5px] bg-orange-500/30"></span>
                v2.4 • Neural Audit
              </p> */}
            </div>
          </div>
        </div>

        {/* Right: Controls & Metrics */}
        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-4 w-full lg:w-auto">
          
          {/* Status Metric - Scaled Up */}
          <div className="hidden md:flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 shadow-inner">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <Receipt size={18} className="text-indigo-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tabular-nums leading-none">
                {recordCount.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                Active Records
              </span>
            </div>
          </div>

          {/* Date Filter Input - Larger Hit Area */}
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-4 ring-orange-500/10 transition-all hover:border-orange-200">
            <Calendar size={18} className="ml-3 text-indigo-600" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-xs font-black outline-none py-2 px-1 uppercase tracking-wider text-slate-700"
            />
            {dateFilter && (
              <button 
                onClick={onClearFilter}
                className="text-[10px] font-black text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                RESET
              </button>
            )}
          </div>

          {/* Sync Action - Bolder Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="bg-slate-900 text-white text-xs font-black uppercase px-7 py-3.5 rounded-2xl flex items-center gap-3 hover:bg-orange-600 transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={16} className={`${isLoading ? "animate-spin" : ""} transition-transform duration-500`} />
            {isLoading ? "Syncing" : "Refresh Data"}
          </button>
        </div>
      </div>
    </header>
  );
}