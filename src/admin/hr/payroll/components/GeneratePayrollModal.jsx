import React from "react";
import { Clock, Loader2, X } from "lucide-react";

export default function GeneratePayrollModal({
  open,
  month,
  year,
  months,
  allStaff,
  genForm,
  onChangeGenForm,
  generating,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Entry</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 space-y-5">
          <div className="bg-indigo-600 text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-indigo-100">
            <div className="p-2 bg-white/20 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest">
              {months[month - 1]} {year} Cycle
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                Select Staff Member
              </label>
              <select
                value={genForm.staffId}
                onChange={(e) => onChangeGenForm({ ...genForm, staffId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all"
              >
                <option value="">Select an employee...</option>
                {allStaff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} (₹{s.baseSalary})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                  Bonus
                </label>
                <input
                  type="number"
                  min={0}
                  value={genForm.bonus}
                  onChange={(e) => onChangeGenForm({ ...genForm, bonus: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                  Overtime
                </label>
                <input
                  type="number"
                  min={0}
                  value={genForm.overtime}
                  onChange={(e) => onChangeGenForm({ ...genForm, overtime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-4 p-8 bg-slate-50/50">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
          >
            Discard
          </button>
          <button
            onClick={onConfirm}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

