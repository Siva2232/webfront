import React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

export default function ModernKPICard({ label, val, icon: Icon, color, trend, isProfit = true }) {
  const meta =
    {
      indigo: { bg: "bg-indigo-50", text: "text-indigo-600", shadow: "shadow-indigo-100", dot: "bg-indigo-600" },
      emerald: { bg: "bg-emerald-50", text: "text-emerald-600", shadow: "shadow-emerald-100", dot: "bg-emerald-600" },
      rose: { bg: "bg-rose-50", text: "text-rose-600", shadow: "shadow-rose-100", dot: "bg-rose-600" },
      amber: { bg: "bg-amber-50", text: "text-amber-600", shadow: "shadow-amber-100", dot: "bg-amber-600" },
      blue: { bg: "bg-blue-50", text: "text-blue-600", shadow: "shadow-blue-100", dot: "bg-blue-600" },
    }[color] || {
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      shadow: "shadow-indigo-100",
      dot: "bg-indigo-600",
    };

  return (
    <div
      className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-lg ${meta.shadow} hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 relative overflow-hidden group`}
    >
      <div className="flex justify-between items-start mb-5">
        <div className={`p-3 ${meta.bg} ${meta.text} rounded-xl group-hover:scale-110 transition-transform duration-500`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        <div
          className={`flex items-center gap-1 font-black text-[10px] px-2 py-1 rounded-lg ${
            trend.startsWith("+")
              ? "bg-emerald-100 text-emerald-700"
              : trend.startsWith("-")
                ? "bg-rose-100 text-rose-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {trend.startsWith("+") ? <ArrowUp size={10} /> : trend.startsWith("-") ? <ArrowDown size={10} /> : null}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <h2 className={`text-2xl font-black ${isProfit === false ? "text-rose-600" : "text-slate-900"} tracking-tight`}>
          ₹{(val || 0).toLocaleString()}
        </h2>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-full ${meta.dot} opacity-20`}></div>
    </div>
  );
}

