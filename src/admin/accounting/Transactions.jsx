import { useEffect, useState } from "react";
import { Plus, Trash2, Search, RefreshCw, X, Filter, Calendar, ChevronRight, ChevronDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getTransactions, deleteTransaction } from "../../api/accountingApi";
import toast from "react-hot-toast";

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const TX_TYPES = ["expense", "income", "transfer", "journal", "pos_sale"];

const TYPE_CONFIG = {
  expense: { bg: "bg-rose-50 text-rose-600 border-rose-100", icon: <ArrowUpRight size={12} /> },
  income: { bg: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: <ArrowDownLeft size={12} /> },
  pos_sale: { bg: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: <ArrowDownLeft size={12} /> },
  journal: { bg: "bg-slate-50 text-slate-500 border-slate-100", icon: null },
  transfer: { bg: "bg-blue-50 text-blue-600 border-blue-100", icon: null },
};

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await getTransactions(params);
      setTxs(res.data.transactions || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setPage(p);
    } catch { toast.error("Sync failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Reverse this transaction?")) return;
    try {
      await deleteTransaction(id);
      toast.success("Transaction reversed successfully");
      load(page);
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md uppercase tracking-widest mb-2 inline-block">Audit Ledger</span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Activity Streams</h1>
          <p className="text-sm text-slate-400 font-medium">{total.toLocaleString()} total entries indexed</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => load(page)} className="p-4 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all shadow-sm active:scale-95">
             <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
           </button>
           <button className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
             <Plus size={16} strokeWidth={3} /> New Entry
           </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white rounded-[32px] p-2 border border-slate-100 shadow-sm flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && load()} 
            placeholder="Search notes or reference numbers..." 
            className="pl-12 pr-4 py-4 w-full bg-slate-50/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300" 
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-2xl border border-slate-50">
          <Calendar size={14} className="ml-2 text-slate-400" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent text-xs font-black text-slate-600 focus:outline-none" />
          <span className="text-slate-300 text-xs">—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent text-xs font-black text-slate-600 focus:outline-none" />
        </div>

        <div className="h-10 w-[1px] bg-slate-100 mx-2 hidden lg:block" />

        <div className="flex gap-1 p-1 overflow-x-auto no-scrollbar">
          {["", ...TX_TYPES].map((t) => (
            <button 
              key={t} 
              onClick={() => setTypeFilter(t)} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === t ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:bg-slate-100"}`}
            >
              {t || "Everything"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Date</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocation</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-24 text-center">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Ledger...</span>
                </td></tr>
              ) : txs.length === 0 ? (
                <tr><td colSpan={6} className="py-24 text-center text-slate-400 font-medium">No results found for current filters</td></tr>
              ) : txs.map((tx) => (
                <React.Fragment key={tx._id}>
                  <tr 
                    className={`group transition-all cursor-pointer ${expanded === tx._id ? "bg-indigo-50/30" : "hover:bg-slate-50/50"}`}
                    onClick={() => setExpanded(expanded === tx._id ? null : tx._id)}
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-md transition-colors ${expanded === tx._id ? "bg-indigo-100 text-indigo-600" : "text-slate-300"}`}>
                          {expanded === tx._id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                        <span className="text-xs font-black text-slate-600">{new Date(tx.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${TYPE_CONFIG[tx.transactionType]?.bg || "bg-slate-100 border-slate-200 text-slate-600"}`}>
                        {TYPE_CONFIG[tx.transactionType]?.icon}
                        {tx.transactionType.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1">{tx.note || "System Entry"}</p>
                      {tx.reference && <p className="text-[10px] font-medium text-slate-400">REF: {tx.reference}</p>}
                    </td>
                    <td className="p-6">
                      {tx.category ? (
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.category.color }} />
                           <span className="text-xs font-bold text-slate-500">{tx.category.name}</span>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-6 text-right font-black text-slate-900">{fmt(tx.totalAmount)}</td>
                    <td className="p-6 text-right">
                      <button 
                        onClick={(e) => handleDelete(e, tx._id)} 
                        className="p-2.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Double Entry Detail */}
                  {expanded === tx._id && (
                    <tr>
                      <td colSpan={6} className="p-0 border-none">
                        <div className="px-12 py-8 bg-gradient-to-b from-indigo-50/30 to-transparent border-t border-indigo-100/50">
                          <div className="flex items-center gap-2 mb-6">
                             <div className="h-px w-8 bg-indigo-200" />
                             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Double Entry Reconciliation</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                            {tx.entries.map((e, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-indigo-100/50 shadow-sm group/entry hover:scale-[1.02] transition-transform">
                                <div className="flex items-center gap-4">
                                  <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${e.type === "debit" ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"}`}>
                                    {e.type}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">{e.ledger?.name || "System Ledger"}</span>
                                </div>
                                <span className="text-sm font-black text-slate-900">{fmt(e.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refined Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button 
            disabled={page === 1}
            onClick={() => load(page - 1)}
            className="p-3 rounded-xl bg-white border border-slate-100 text-slate-400 disabled:opacity-30 hover:text-indigo-600 shadow-sm transition-all"
          >
            <ChevronRight size={18} className="rotate-180" />
          </button>
          
          <div className="flex gap-1 bg-slate-100/50 p-1 rounded-xl">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button 
                key={p} 
                onClick={() => load(p)} 
                className={`w-10 h-10 rounded-lg text-xs font-black transition-all ${p === page ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                {p}
              </button>
            ))}
          </div>

          <button 
            disabled={page === pages}
            onClick={() => load(page + 1)}
            className="p-3 rounded-xl bg-white border border-slate-100 text-slate-400 disabled:opacity-30 hover:text-indigo-600 shadow-sm transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}