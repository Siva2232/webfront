import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingDown, Save, Calendar, Tag, FileText, CreditCard, Loader2 } from "lucide-react";
import { getLedgers, getCategories, createExpense } from "../../api/accountingApi";
import toast from "react-hot-toast";

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const today = () => new Date().toISOString().split("T")[0];

export default function Expenses() {
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState({ expense: [], asset: [] });
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ amount: "", debitLedger: "", creditLedger: "", category: "", date: today(), note: "", reference: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getLedgers({ type: "expense" }),
      getLedgers(),
      getCategories({ type: "expense" }),
    ]).then(([expLedgers, allLedgers, cats]) => {
      setLedgers({ 
        expense: expLedgers.data, 
        asset: allLedgers.data.filter((l) => l.type === "asset") 
      });
      setCategories(cats.data);

      if (!form.category && cats.data?.length > 0) {
        setForm((prev) => ({ ...prev, category: cats.data[0]._id }));
      }
    }).catch(() => toast.error("Failed to load accounting data"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.debitLedger || !form.creditLedger) return toast.error("Complete required fields");
    setSaving(true);
    try {
      await createExpense({ ...form, amount: parseFloat(form.amount) });
      toast.success("Expense recorded successfully");
      navigate("/admin/accounting/transactions");
    } catch (err) { 
      toast.error(err.response?.data?.message || "Transaction failed"); 
    } finally { setSaving(false); }
  };

  const selectedDebit = ledgers.expense?.find(l => l._id === form.debitLedger);
  const selectedCredit = ledgers.asset?.find(l => l._id === form.creditLedger);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 animate-in fade-in duration-500">
      {/* Navigation */}
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-all mb-8">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
      </button>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-rose-500 rounded-[22px] flex items-center justify-center shadow-lg shadow-rose-200">
              <TrendingDown className="text-white" size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Record Expense</h1>
              <p className="text-sm text-slate-500 font-medium">Double-entry accounting voucher</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6">
            {/* Amount Field */}
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Transaction Amount</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-300 group-focus-within:text-indigo-500">₹</span>
                <input 
                  type="number" step="0.01" value={form.amount} 
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-4 py-4 text-2xl font-black text-slate-800 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Tag size={12}/> Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100">
                  <option value="" disabled={categories.length > 0}>Select Category</option>
                  {categories.length === 0 ? (
                    <option value="" disabled>No categories found. Create one in Accounting > Categories.</option>
                  ) : (
                    categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12}/> Expense Account (Debit)</label>
                <select value={form.debitLedger} onChange={(e) => setForm({ ...form, debitLedger: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100">
                  <option value="">Select Expense Account</option>
                  {ledgers.expense.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CreditCard size={12}/> Payment Method (Credit)</label>
                <select value={form.creditLedger} onChange={(e) => setForm({ ...form, creditLedger: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100">
                  <option value="">Select Cash/Bank Account</option>
                  {ledgers.asset.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Narration & Reference</label>
              <textarea 
                rows="2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} 
                placeholder="Brief description of the expense..."
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button 
              type="submit" disabled={saving || loading} 
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? "Processing Transaction..." : "Confirm & Save Entry"}
            </button>
          </form>
        </div>

        {/* Right Column: Preview Panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-8 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 opacity-50" />
              
              <h2 className="text-lg font-black text-slate-800 mb-6">Accounting Preview</h2>
              
              {form.amount ? (
                <div className="space-y-6 relative">
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] mb-1">Debit Entry</p>
                      <p className="text-sm font-bold text-slate-700">{selectedDebit?.name || "Unselected Account"}</p>
                      <p className="text-lg font-black text-slate-900 mt-1">+{fmt(form.amount)}</p>
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="bg-white p-2 rounded-full border border-slate-100 shadow-sm">
                        <TrendingDown size={14} className="text-slate-300" />
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Credit Entry</p>
                      <p className="text-sm font-bold text-slate-700">{selectedCredit?.name || "Unselected Account"}</p>
                      <p className="text-lg font-black text-slate-900 mt-1">-{fmt(form.amount)}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Entry Date</span>
                      <span className="text-slate-700 font-bold">{new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="text-slate-200" size={24} />
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Enter transaction details to see the <br/> double-entry validation here.
                  </p>
                </div>
              )}
            </div>

            {/* Hint Card */}
            <div className="bg-indigo-600 rounded-[24px] p-6 text-white shadow-xl shadow-indigo-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Pro Tip</p>
              <p className="text-xs font-semibold leading-relaxed">
                Always record expenses against specific ledgers for accurate P&L reporting at the end of the fiscal month.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}