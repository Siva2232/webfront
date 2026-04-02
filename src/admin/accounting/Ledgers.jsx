import { useEffect, useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, Search, RefreshCw, X, Shield, Layers, ArrowRight } from "lucide-react";
import { getLedgers, createLedger, updateLedger, deleteLedger } from "../../api/accountingApi";
import toast from "react-hot-toast";

const TYPES = ["asset", "liability", "income", "expense"];
const TYPE_CONFIG = {
  asset: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  liability: { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
  income: { color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
  expense: { color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
};

const EMPTY = { name: "", type: "", group: "", openingBalance: 0, description: "" };
const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export default function Ledgers() {
  const [ledgers, setLedgers] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      const res = await getLedgers(params);
      setLedgers(res.data);
    } catch { toast.error("Failed to load ledgers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    load(); 
    window.addEventListener('transactionsUpdated', load);
    return () => window.removeEventListener('transactionsUpdated', load);
  }, [typeFilter]);

  const openAdd = () => { setForm(EMPTY); setModal({ mode: "add" }); };
  const openEdit = (l) => { 
    setForm({ name: l.name, type: l.type, group: l.group || "", openingBalance: l.openingBalance, description: l.description || "" }); 
    setModal({ mode: "edit", id: l._id, isSystem: l.isSystem }); 
  };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.type) return toast.error("Account type is required");
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await createLedger(form);
        toast.success("Ledger created");
      } else {
        await updateLedger(modal.id, form);
        toast.success("Ledger updated");
      }
      closeModal();
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (l) => {
    if (l.isSystem) return toast.error("System ledgers cannot be deleted");
    if (!window.confirm(`Delete ledger "${l.name}"?`)) return;
    try {
      await deleteLedger(l._id);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const filtered = ledgers.filter((l) =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md uppercase tracking-widest">Chart of Accounts</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Ledger Management</h1>
        </div>
        
        <button onClick={openAdd} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
          <Plus size={18} /> Create New Account
        </button>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search accounts by name..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto">
          {["", ...TYPES].map((t) => (
            <button 
              key={t} 
              onClick={() => setTypeFilter(t)} 
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter transition-all ${typeFilter === t ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
            >
              {t || "All Accounts"}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-100 mx-2" />
          <button onClick={load} className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Ledger Grid/Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Details</th>
              <th className="p-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type & Group</th>
              <th className="p-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Bal.</th>
              <th className="p-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Balance</th>
              <th className="p-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="py-20 text-center"><Loader /></td></tr>
            ) : filtered.map((l) => (
              <tr key={l._id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${TYPE_CONFIG[l.type].bg} ${TYPE_CONFIG[l.type].color}`}>
                      {l.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 tracking-tight">{l.name}</span>
                        {l.isSystem && (
                          <div className="group/hint relative cursor-help">
                            <Shield size={12} className="text-amber-400" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/hint:block bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap">Protected System Account</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{l.description || "No description provided"}</p>
                    </div>
                  </div>
                </td>
                <td className="p-5">
                  <div className="flex flex-col gap-1">
                    <span className={`w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${TYPE_CONFIG[l.type].bg} ${TYPE_CONFIG[l.type].color} ${TYPE_CONFIG[l.type].border}`}>
                      {l.type}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Layers size={10} /> {l.group || "General"}
                    </span>
                  </div>
                </td>
                <td className="p-5 text-right text-xs font-semibold text-slate-500">{fmt(l.openingBalance)}</td>
                <td className="p-5 text-right">
                  <span className="text-sm font-black text-slate-900">{fmt(l.currentBalance)}</span>
                </td>
                <td className="p-5">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(l)} className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-90">
                      <Pencil size={14} />
                    </button>
                    {!l.isSystem && (
                      <button onClick={() => handleDelete(l)} className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-90">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Dialog (Modal) */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{modal.mode === "add" ? "New Ledger" : "Edit Account"}</h2>
                <p className="text-xs text-slate-400 font-medium">Define your financial account properties</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-slate-100 transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>
            
            <div className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Name *</label>
                <input 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 transition-all" 
                  placeholder="e.g. HDFC Bank Account" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type *</label>
                  <select 
                    value={form.type} 
                    onChange={(e) => setForm({ ...form, type: e.target.value })} 
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300"
                  >
                    <option value="" disabled>Select Type</option>
                    {TYPES.map((t) => <option key={t} value={t} className="capitalize text-slate-800 font-bold">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Group</label>
                  <input 
                    value={form.group} 
                    onChange={(e) => setForm({ ...form, group: e.target.value })} 
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100" 
                    placeholder="e.g. Cash & Bank" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Opening Balance</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">₹</span>
                  <input 
                    type="number" 
                    value={form.openingBalance} 
                    onChange={(e) => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })} 
                    className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Description</label>
                <textarea 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  rows={2} 
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 resize-none" 
                  placeholder="Optional details..."
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Discard</button>
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {saving ? "Processing..." : "Save Account"} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Loader = () => (
  <div className="flex flex-col items-center justify-center space-y-3">
    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Records</p>
  </div>
);