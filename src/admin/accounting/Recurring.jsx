import { useEffect, useState } from "react";
import { Repeat, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, Calendar, ArrowRightLeft, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { getRecurring, createRecurring, updateRecurring, deleteRecurring, getLedgers, getCategories } from "../../api/accountingApi";
import toast from "react-hot-toast";

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const EMPTY = { name: "", transactionType: "expense", amount: "", debitLedger: "", creditLedger: "", category: "", note: "", frequency: "monthly", dayOfMonth: 1 };

const FREQ_CONFIG = {
  monthly: { color: "text-indigo-600", bg: "bg-indigo-50", label: "Monthly Cycle" },
  weekly: { color: "text-blue-600", bg: "bg-blue-50", label: "Weekly Cycle" },
  daily: { color: "text-violet-600", bg: "bg-violet-50", label: "Daily Cycle" }
};

export default function Recurring() {
  const [list, setList] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, l, c] = await Promise.all([getRecurring(), getLedgers(), getCategories()]);
      setList(r.data);
      setLedgers(l.data);
      setCategories(c.data);
    } catch { toast.error("Failed to sync automation records"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setModal({ mode: "add" }); };
  const openEdit = (r) => {
    setForm({ 
      name: r.name, 
      transactionType: r.transactionType, 
      amount: r.amount, 
      debitLedger: r.debitLedger?._id || r.debitLedger, 
      creditLedger: r.creditLedger?._id || r.creditLedger, 
      category: r.category?._id || r.category || "", 
      note: r.note || "", 
      frequency: r.frequency, 
      dayOfMonth: r.dayOfMonth 
    });
    setModal({ mode: "edit", id: r._id });
  };

  const handleSave = async () => {
    if (!form.name || !form.amount || !form.debitLedger || !form.creditLedger) return toast.error("Please fill all required accounting fields");
    setSaving(true);
    try {
      if (modal.mode === "add") { 
        await createRecurring({ ...form, amount: parseFloat(form.amount) }); 
        toast.success("Automation engine scheduled"); 
      }
      else { 
        await updateRecurring(modal.id, { ...form, amount: parseFloat(form.amount) }); 
        toast.success("Schedule updated"); 
      }
      setModal(null);
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Operation failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanent delete this automation schedule?")) return;
    try { await deleteRecurring(id); toast.success("Automation removed"); load(); }
    catch (e) { toast.error("Sync error during deletion"); }
  };

  const handleToggle = async (r) => {
    try { 
      await updateRecurring(r._id, { isActive: !r.isActive }); 
      toast.success(r.isActive ? "Automation Paused" : "Automation Resumed"); 
      load(); 
    }
    catch { toast.error("Status toggle failed"); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} /> Smart Automation
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Recurring Ledger</h1>
          <p className="text-sm text-slate-400 font-medium">Scheduled double-entry bookkeeping</p>
        </div>
        
        <button onClick={openAdd} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
          <Plus size={18} /> Schedule New
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waking automation engine...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-[40px] border border-dashed border-slate-200 p-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Repeat size={32} className="text-slate-200" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No active schedules</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8">Set up recurring expenses like rent or subscriptions to automate your accounting.</p>
          <button onClick={openAdd} className="text-indigo-600 font-bold text-sm hover:underline">Create your first schedule &rarr;</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {list.map((r) => (
            <div key={r._id} className={`group bg-white rounded-[32px] border transition-all duration-500 p-6 space-y-5 ${r.isActive ? "border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50" : "border-slate-100 opacity-60 grayscale-[0.5]"}`}>
              
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-black text-slate-800 tracking-tight text-lg leading-tight group-hover:text-indigo-600 transition-colors">{r.name}</h3>
                  <div className={`w-fit px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${FREQ_CONFIG[r.frequency].bg} ${FREQ_CONFIG[r.frequency].color}`}>
                    {FREQ_CONFIG[r.frequency].label}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black tracking-tighter ${r.transactionType === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                    {r.transactionType === "income" ? "+" : "-"}{fmt(r.amount)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">per cycle</p>
                </div>
              </div>

              {/* Automation Logic Preview */}
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-50 space-y-3">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                   <p className="text-[11px] font-bold text-slate-600 truncate flex-1">Debit: {r.debitLedger?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                   <p className="text-[11px] font-bold text-slate-600 truncate flex-1">Credit: {r.creditLedger?.name}</p>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                   <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                     <Calendar size={12} /> Next Sync
                   </span>
                   <span className="text-[11px] font-black text-slate-700">
                     {r.nextRunDate ? new Date(r.nextRunDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }) : "TBD"}
                   </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button 
                  onClick={() => handleToggle(r)} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${r.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                >
                  {r.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {r.isActive ? "System Live" : "Paused"}
                </button>
                
                <div className="flex gap-2">
                  <button onClick={() => openEdit(r)} className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all hover:bg-white hover:shadow-md">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(r._id)} className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all hover:bg-white hover:shadow-md">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Automation Modal */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{modal.mode === "add" ? "Automation Setup" : "Update Schedule"}</h2>
                <p className="text-xs text-slate-400 font-medium">Configure recurring double-entry logic</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-full hover:bg-slate-100 transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-6 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="e.g. Monthly Office Rent" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Type</label>
                  <select value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100">
                    <option value="expense">Business Expense</option>
                    <option value="income">Revenue/Income</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cycle Amount</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ArrowRightLeft size={12} className="text-emerald-500" /> Debit Ledger</label>
                  <select value={form.debitLedger} onChange={(e) => setForm({ ...form, debitLedger: e.target.value })} className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-100">
                    <option value="">Select Ledger...</option>
                    {ledgers.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ArrowRightLeft size={12} className="text-rose-500" /> Credit Ledger</label>
                  <select value={form.creditLedger} onChange={(e) => setForm({ ...form, creditLedger: e.target.value })} className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-100">
                    <option value="">Select Ledger...</option>
                    {ledgers.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequency</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100">
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day of Cycle (1-28)</label>
                  <input type="number" min="1" max="28" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: parseInt(e.target.value) })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memo / Private Note</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 resize-none" placeholder="Reference for future audits..." />
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setModal(null)} className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Discard</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Repeat size={16} />}
                {saving ? "Saving Schedule..." : "Activate Automation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}