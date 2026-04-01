import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Save, Calendar, Tag, FileText, Landmark, Loader2, Sparkles } from "lucide-react";
import { getLedgers, getCategories, createIncome } from "../../api/accountingApi";
import toast from "react-hot-toast";

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const today = () => new Date().toISOString().split("T")[0];

export default function Income() {
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState({ income: [], asset: [] });
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ amount: "", debitLedger: "", creditLedger: "", category: "", date: today(), note: "", reference: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getLedgers(), getCategories({ type: "income" })])
      .then(([allLedgers, cats]) => {
        setLedgers({
          income: allLedgers.data.filter((l) => l.type === "income"),
          asset: allLedgers.data.filter((l) => l.type === "asset"),
        });
        setCategories(cats.data);
      })
      .catch(() => toast.error("Failed to load accounting data"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.debitLedger || !form.creditLedger) return toast.error("Amount, payment source, and income type are required");
    setSaving(true);
    try {
      await createIncome({ ...form, amount: parseFloat(form.amount) });
      toast.success("Income recorded successfully");
      navigate("/admin/accounting/transactions");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record transaction");
    } finally {
      setSaving(false);
    }
  };

  const selectedDebit = ledgers.asset?.find(l => l._id === form.debitLedger);
  const selectedCredit = ledgers.income?.find(l => l._id === form.creditLedger);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 animate-in fade-in duration-500">
      {/* Navigation */}
      <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 uppercase tracking-widest transition-all mb-8">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
      </button>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Main Entry Form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-[22px] flex items-center justify-center shadow-lg shadow-emerald-100">
              <TrendingUp className="text-white" size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Record Income</h1>
              <p className="text-sm text-slate-500 font-medium">Add revenue to your business ledgers</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6">
            {/* Massive Amount Input */}
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Revenue Amount</label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-emerald-500/40 group-focus-within:text-emerald-500 transition-colors">₹</span>
                <input 
                  type="number" step="0.01" value={form.amount} 
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-5 text-3xl font-black text-slate-800 focus:ring-2 focus:ring-emerald-100 transition-all placeholder:text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Received On</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-100 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Tag size={12}/> Income Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-100 transition-all">
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Landmark size={12}/> Destination Account (Debit Cash/Bank)</label>
                <select value={form.debitLedger} onChange={(e) => setForm({ ...form, debitLedger: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-100 transition-all">
                  <option value="">Where was it received?</option>
                  {ledgers.asset.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={12}/> Revenue Source (Credit Income Ledger)</label>
                <select value={form.creditLedger} onChange={(e) => setForm({ ...form, creditLedger: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-100 transition-all">
                  <option value="">Source of Income</option>
                  {ledgers.income.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Internal Note</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Catering services..." className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-100 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ref Number</label>
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="INV-001" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-100 transition-all" />
              </div>
            </div>

            <button 
              type="submit" disabled={saving || loading} 
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? "Processing Receipt..." : "Record Income Entry"}
            </button>
          </form>
        </div>

        {/* Dynamic Voucher Sidebar */}
        <div className="lg:col-span-2">
          <div className="sticky top-8 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-40" />
              
              <h2 className="text-lg font-black text-slate-800 mb-6">Accounting Voucher</h2>
              
              {form.amount ? (
                <div className="space-y-6 relative">
                  <div className="flex flex-col gap-4">
                    {/* Debit Entry (Assets Increase) */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Debit (+ Asset)</p>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 leading-tight">{selectedDebit?.name || "Target Account"}</p>
                      <p className="text-xl font-black text-slate-900 mt-2">+{fmt(form.amount)}</p>
                    </div>

                    {/* Credit Entry (Income Increase) */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">Credit (+ Income)</p>
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 leading-tight">{selectedCredit?.name || "Income Source"}</p>
                      <p className="text-xl font-black text-slate-900 mt-2">+{fmt(form.amount)}</p>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entry Date</span>
                      <span className="text-xs text-slate-700 font-bold">{new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</span>
                    </div>
                    {form.reference && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reference</span>
                        <span className="text-xs text-indigo-600 font-bold">{form.reference}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 space-y-4">
                  <div className="w-20 h-20 bg-emerald-50/50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-emerald-100">
                    <Sparkles className="text-emerald-200" size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-400 italic">"Waiting for figures..."</p>
                    <p className="text-[10px] text-slate-300 font-medium px-8">Voucher will auto-generate as you fill the form.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Premium Branding Footer */}
            <div className="px-4 text-center">
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Powered by Luxinity Accounting Core</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}