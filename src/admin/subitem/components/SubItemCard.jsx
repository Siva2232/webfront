import React from "react";
import { CheckCircle, Edit3, IndianRupee, Trash2, XCircle } from "lucide-react";

export default function SubItemCard({ item, onEdit, onDelete, onToggleStatus }) {
  return (
    <div
      className={`bg-white rounded-[2rem] border transition-all p-6 space-y-4 shadow-sm hover:shadow-md ${
        item.isAvailable === false ? "opacity-75 border-rose-200 bg-rose-50/10" : "border-slate-100"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                item.type === "portion" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {item.type === "portion" ? "Portion" : "Add-on Group"}
            </span>
            {item.isAvailable === false && (
              <span className="px-2 py-1 bg-rose-600 text-white text-[8px] font-black uppercase rounded-lg">Stock Out</span>
            )}
          </div>
          <div className="flex flex-col">
            <h3
              className={`text-lg font-black uppercase tracking-tight ${
                item.isAvailable === false
                  ? "text-slate-400 line-through decoration-rose-500 decoration-2"
                  : "text-slate-900"
              }`}
            >
              {item.name}
            </h3>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => onToggleStatus(item)}
            className={`p-2.5 rounded-xl transition-all shadow-sm ${
              item.isAvailable !== false
                ? "bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                : "bg-emerald-600 text-white border border-emerald-600 shadow-lg shadow-emerald-100"
            }`}
          >
            {item.isAvailable !== false ? <XCircle size={14} /> : <CheckCircle size={14} />}
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100"
          >
            <Edit3 size={14} className="text-slate-500" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100"
          >
            <Trash2 size={14} className="text-rose-500" />
          </button>
        </div>
      </div>

      {item.type === "portion" && (
        <div className="flex items-center gap-1.5 text-violet-600 font-black">
          <IndianRupee size={14} strokeWidth={3} />
          <span className="text-xl tracking-tighter italic">{item.price}</span>
        </div>
      )}

      {item.type === "addonGroup" && (
        <div className="space-y-2">
          {item.maxSelections > 0 && (
            <p className="text-[10px] font-bold text-slate-400 uppercase">Max select: {item.maxSelections}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {item.addons?.map((a, i) => (
              <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg">
                {a.name}
                {a.price > 0 ? ` +₹${a.price}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

