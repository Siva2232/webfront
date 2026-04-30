import React from "react";
import { Layers } from "lucide-react";

export default function TransactionsEmptyState({ onClear }) {
  return (
    <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-20 text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
        <Layers className="text-slate-200" size={32} />
      </div>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">Financial Void</h3>
      <p className="text-slate-400 font-medium mt-2 text-sm max-w-xs mx-auto">
        We couldn't find any transaction matching your high-precision filter criteria.
      </p>
      <button
        onClick={onClear}
        className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all active:scale-95"
      >
        Clear Precision Filters
      </button>
    </div>
  );
}

