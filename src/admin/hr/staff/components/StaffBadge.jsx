import React from "react";

export default function StaffBadge({ value }) {
  const map = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    on_leave: "bg-amber-50 text-amber-700 border-amber-200/60",
    admin: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
    manager: "bg-blue-50 text-blue-700 border-blue-200/60",
    staff: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase ${
        map[value] || "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      {value?.replace("_", " ")}
    </span>
  );
}

