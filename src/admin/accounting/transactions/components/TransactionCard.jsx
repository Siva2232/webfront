import React from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Hash,
  Info,
} from "lucide-react";

export default function TransactionCard({ tx, idx, typeStyles }) {
  const debitTotal = tx.entries.filter((e) => e.type === "debit").reduce((sum, e) => sum + e.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.5, ease: "easeOut" }}
      className="group relative"
    >
      <div className="absolute -left-[2.75rem] top-8 w-3 h-3 rounded-full bg-white border-[3px] border-indigo-500 hidden xl:flex items-center justify-center outline outline-4 outline-slate-50/50 group-hover:scale-125 transition-transform duration-500" />

      <div className="bg-white rounded-3xl border border-slate-100/80 shadow-md hover:shadow-xl hover:border-indigo-100 transition-all duration-700 group-hover:-translate-y-0.5 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative shrink-0">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:rotate-3 transition-all duration-500">
                  <Activity size={24} className="text-slate-400 group-hover:text-white transition-colors duration-500" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-white border border-slate-50 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <Info size={14} className="text-indigo-500" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border ${typeStyles}`}>
                    {tx.referenceType || "Internal Journal"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-50 rounded-lg">
                    <Calendar size={12} className="text-indigo-400" />
                    {format(new Date(tx.date), "EEE, dd MMM yyyy · hh:mm a")}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-950 transition-colors">
                    {tx.description}
                  </h3>
                  {tx.referenceId && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                      <span className="text-indigo-500 opacity-60">REF_ID:</span>
                      <code className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-[10px]">
                        {tx.referenceId}
                      </code>
                      <Hash size={12} className="opacity-30" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center xl:flex-col xl:items-end gap-4 xl:gap-1">
              <div className="flex flex-col xl:items-end">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Transaction Face Value</span>
                <div className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-indigo-700 transition-colors">
                  <span className="text-lg align-top mr-0.5 font-medium opacity-30 tracking-normal">₹</span>
                  {debitTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-50 relative">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 px-3 bg-white">
              <div className="p-1.5 bg-indigo-50/50 rounded-full border border-indigo-100/30">
                <ArrowLeftRight size={14} className="text-indigo-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200">
                      <ArrowDownLeft size={14} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                      Debit Assignments (In)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {tx.entries
                    .filter((e) => e.type === "debit")
                    .map((entry, eIdx) => (
                      <div
                        key={eIdx}
                        className="group/entry flex items-center justify-between p-4 bg-slate-50/30 rounded-2xl border border-transparent hover:border-emerald-500/20 hover:bg-emerald-50/10 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black text-base text-slate-300 group-hover/entry:text-emerald-500 transition-colors">
                            {entry.ledger?.name?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{entry.ledger?.name}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">GL Account</span>
                          </div>
                        </div>
                        <span className="text-lg font-black text-emerald-600 tracking-tight">₹{entry.amount.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500 flex items-center justify-center shadow-md shadow-rose-200">
                      <ArrowUpRight size={14} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">
                      Credit Assignments (Out)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {tx.entries
                    .filter((e) => e.type === "credit")
                    .map((entry, eIdx) => (
                      <div
                        key={eIdx}
                        className="group/entry flex items-center justify-between p-4 bg-slate-50/30 rounded-2xl border border-transparent hover:border-rose-500/20 hover:bg-rose-50/10 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black text-base text-slate-300 group-hover/entry:text-rose-500 transition-colors">
                            {entry.ledger?.name?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{entry.ledger?.name}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">GL Account</span>
                          </div>
                        </div>
                        <span className="text-lg font-black text-slate-700 tracking-tight">₹{entry.amount.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

