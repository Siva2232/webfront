import React, { useEffect, useState } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  RefreshCw, 
  Landmark, 
  Wallet, 
  MoreVertical, 
  ArrowRight,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  CreditCard,
  Hash,
  ChevronRight,
  Filter,
  X
} from "lucide-react";
import { NavLink } from "react-router-dom";
import accApi from "../../api/accApi";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import StickyPageHeader from "../components/StickyPageHeader";

export default function AccLedgers() {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [newLedger, setNewLedger] = useState({ name: "", type: "asset" });

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const { data } = await accApi.getLedgers();
      setLedgers(data);
    } catch (err) {
      toast.error("Failed to load ledgers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await accApi.createLedger(newLedger);
      toast.success("Ledger created!");
      setShowAdd(false);
      setNewLedger({ name: "", type: "asset" });
      fetchLedgers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create ledger");
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, []);

  const filteredLedgers = ledgers.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || l.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getLedgerIcon = (type) => {
    switch (type) {
      case 'asset': return <Wallet size={18} />;
      case 'income': return <TrendingUp size={18} />;
      case 'expense': return <CreditCard size={18} />;
      case 'liability': return <Landmark size={18} />;
      default: return <BookOpen size={18} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'asset': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'income': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'expense': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'liability': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />

      <StickyPageHeader
        icon={BookOpen}
        eyebrow="Accounting"
        title="Ledgers"
        subtitle="Chart of accounts"
        rightAddon={
          <>
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Search ledgers..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-zinc-800 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm outline-none hover:bg-zinc-50"
            >
              <option value="all">All</option>
              <option value="asset">Assets</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
              <option value="liability">Liabilities</option>
            </select>
            <button
              type="button"
              onClick={fetchLedgers}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Syncing" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <Plus size={14} />
              New ledger
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">

      {/* SUMMARY STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         <StatsCard label="Total Ledgers" count={ledgers.length} icon={Hash} color="slate" />
         <StatsCard label="Revenue Heads" count={ledgers.filter(l => l.type === 'income').length} icon={TrendingUp} color="indigo" />
         <StatsCard label="Asset Nodes" count={ledgers.filter(l => l.type === 'asset').length} icon={Wallet} color="emerald" />
         <StatsCard label="Default System" count={ledgers.filter(l => l.isDefault).length} icon={ShieldCheck} color="amber" />
      </div>

      {/* LEDGER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
           {filteredLedgers.map((ledger) => (
              <motion.div 
                 layout
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 key={ledger._id}
                 className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all group"
              >
                 <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl border ${getTypeColor(ledger.type)}`}>
                       {getLedgerIcon(ledger.type)}
                    </div>
                    <div className="flex items-center gap-1.5">
                       {ledger.isDefault && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-md border border-amber-100">Default</span>
                       )}
                       <button className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors">
                          <MoreVertical size={18}/>
                       </button>
                    </div>
                 </div>

                 <div className="mb-6">
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{ledger.name}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">CODE: LDR-{ledger._id?.slice(-4).toUpperCase()}</p>
                 </div>

                 <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Category</span>
                       <span className="text-xs font-bold text-slate-700 capitalize">{ledger.type} Account</span>
                    </div>
                    <NavLink
                       to={`/admin/accounting/ledgers/${ledger._id}`}
                       className="w-10 h-10 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm"
                    >
                       <ChevronRight size={20}/>
                    </NavLink>
                 </div>
              </motion.div>
           ))}
        </AnimatePresence>
      </div>

      {filteredLedgers.length === 0 && !loading && (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
           <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Search size={32}/>
           </div>
           <h3 className="text-xl font-black text-slate-900 mb-1">No matching accounts found</h3>
           <p className="text-slate-500 font-medium text-sm max-w-xs mx-auto">Try adjusting your search or filters to find the ledger you're looking for.</p>
        </div>
      )}

      {/* CREATE MODAL */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowAdd(false)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative overflow-hidden"
            >
               <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">New Account</h2>
                    <p className="text-slate-500 font-medium text-sm">Add a head to your chart of accounts</p>
                  </div>
                  <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                     <X size={20}/>
                  </button>
               </div>

               <form onSubmit={handleCreate} className="space-y-5">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Label</label>
                   <input 
                     required
                     type="text" 
                     value={newLedger.name}
                     onChange={(e) => setNewLedger({...newLedger, name: e.target.value})}
                     className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner text-sm"
                     placeholder="e.g. ICICI Corporate Account, Salary Expense"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Classification Type</label>
                   <div className="grid grid-cols-2 gap-2.5">
                      {['asset', 'income', 'expense', 'liability', 'equity'].map((type) => (
                         <button
                            key={type}
                            type="button"
                            onClick={() => setNewLedger({...newLedger, type})}
                            className={`px-3 py-3 rounded-xl font-black text-[10px] uppercase tracking-tighter border-2 transition-all ${
                               newLedger.type === type 
                               ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' 
                               : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                         >
                            {type}
                         </button>
                      ))}
                   </div>
                 </div>

                 <div className="flex gap-3 pt-3">
                   <button 
                     type="button" 
                     onClick={() => setShowAdd(false)} 
                     className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black tracking-widest text-[10px] uppercase hover:bg-slate-200 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit" 
                     className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black tracking-widest text-[10px] uppercase shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     Finalize Account
                   </button>
                 </div>
               </form>

               {/* Hint Box */}
               <div className="mt-6 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-[10px] text-indigo-700 font-bold leading-relaxed">
                     <ShieldCheck size={12} className="inline mr-1 mb-0.5" />
                     Classification defines how this account interacts with P&L and Balance Sheet reports. Use Assets for resources and Expenses for operations.
                  </p>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function StatsCard({ label, count, icon: Icon, color }) {
  const colors = {
    slate: 'bg-slate-600 shadow-slate-200',
    indigo: 'bg-indigo-600 shadow-indigo-200',
    emerald: 'bg-emerald-600 shadow-emerald-200',
    amber: 'bg-amber-600 shadow-amber-200',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/40 flex items-center gap-4 group">
       <div className={`w-12 h-12 ${colors[color]} text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-500`}>
          <Icon size={20}/>
       </div>
       <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
          <p className="text-xl font-black text-slate-900">{count}</p>
       </div>
    </div>
  );
}

