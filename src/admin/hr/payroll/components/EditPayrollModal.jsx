import React from "react";
import { Banknote, Loader2, X } from "lucide-react";

export default function EditPayrollModal({
  open,
  payroll,
  editForm,
  onChangeEditForm,
  saving,
  onClose,
  onSave,
}) {
  if (!open || !payroll) return null;

  const computedNet = Math.max(
    0,
    Number(payroll.baseSalary || 0) -
      Number(payroll.leaveDeduction || 0) +
      Number(editForm.bonus || 0) +
      Number(editForm.overtime || 0)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Edit Payroll</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5">{payroll.staff?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Base</p>
              <p className="text-[13px] font-black text-slate-700">₹{payroll.baseSalary}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Absents</p>
              <p className="text-[13px] font-black text-slate-700">{payroll.absentDays || 0}</p>
            </div>
            <div className="bg-rose-50 p-3 rounded-2xl text-center">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-tighter">Loss</p>
              <p className="text-[13px] font-black text-rose-600">₹{payroll.leaveDeduction}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                Adjustment Bonus
              </label>
              <input
                type="number"
                value={editForm.bonus}
                onChange={(e) => onChangeEditForm({ ...editForm, bonus: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                Overtime Pay
              </label>
              <input
                type="number"
                value={editForm.overtime}
                onChange={(e) => onChangeEditForm({ ...editForm, overtime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
              Payment Lifecycle
            </label>
            <div className="flex gap-2">
              {["pending", "paid"].map((stat) => (
                <button
                  key={stat}
                  onClick={() => onChangeEditForm({ ...editForm, status: stat })}
                  className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                    editForm.status === stat
                      ? "bg-slate-900 text-white shadow-lg"
                      : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {stat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">New Net Payable</p>
              <h3 className="text-2xl font-black text-emerald-700 tracking-tighter">₹{computedNet.toLocaleString("en-IN")}</h3>
            </div>
            <Banknote className="w-10 h-10 text-emerald-200" />
          </div>
        </div>
        <div className="flex gap-4 p-8 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

