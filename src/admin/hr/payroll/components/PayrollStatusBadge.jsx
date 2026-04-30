import React from "react";
import { CheckCircle2, Clock } from "lucide-react";

export default function PayrollStatusBadge({ status }) {
  return status === "paid" ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
      <CheckCircle2 className="w-3 h-3" /> Paid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

