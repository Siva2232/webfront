import React, { useEffect, useState } from "react";
import { 
  ArrowLeftRight, 
  Search, 
  RefreshCw, 
  Calendar, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Activity,
  ArrowRight,
  Hash,
  Layers,
  LayoutGrid,
  TrendingUp,
  CreditCard,
  History,
  Info
} from "lucide-react";
import accApi from "../../api/accApi";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function AccTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filterType, setFilterType] = useState("all");
  const [selectedLedger, setSelectedLedger] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data } = await accApi.getTransactions();
      setTransactions(data);
    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgers = async () => {
    try {
      const { data } = await accApi.getLedgers();
      setLedgers(data);
    } catch (err) {
      console.error("Failed to load ledgers", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchLedgers();
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || tx.referenceType?.toLowerCase() === filterType.toLowerCase();
    const matchesLedger = selectedLedger === "all" || tx.entries.some(e => e.ledger?._id === selectedLedger);
    
    let matchesDate = true;
    if (dateRange.start) matchesDate = matchesDate && new Date(tx.date) >= new Date(dateRange.start);
    if (dateRange.end) matchesDate = matchesDate && new Date(tx.date) <= new Date(dateRange.end);

    return matchesSearch && matchesType && matchesLedger && matchesDate;
  });

  const getTxTypeStyles = (type) => {
    switch (type) {
      case 'Bill': return 'bg-blue-50/50 text-blue-600 border-blue-100/50';
      case 'Manual': return 'bg-purple-50/50 text-purple-600 border-purple-100/50';
      case 'Expense': return 'bg-orange-50/50 text-orange-600 border-orange-100/50';
      case 'Purchase': return 'bg-cyan-50/50 text-cyan-600 border-cyan-100/50';
      default: return 'bg-slate-50/50 text-slate-600 border-slate-100/50';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-[1600px] mx-auto px-4 py-6 lg:px-8 lg:py-10">
        
        {/* TOP LEVEL NAVIGATION & STATS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
                <LayoutGrid size={20} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">Financial Intelligence</span>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                  Journal <span className="text-slate-400 font-light">Ledger</span>
                </h1>
              </div>
            </div>
            <p className="text-slate-500 font-medium text-xs lg:text-sm max-w-md">
              A comprehensive system for tracking double-entry transactions with real-time audit capabilities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
                <div className="px-4 py-1.5 border-r border-slate-100 text-center">
                    <p className="text-[8px] uppercase font-black text-slate-400 tracking-wider mb-0.5">Total Records</p>
                    <p className="text-base font-black text-slate-900">{transactions.length.toLocaleString()}</p>
                </div>
                <div className="px-4 py-1.5 text-center">
                    <p className="text-[8px] uppercase font-black text-slate-400 tracking-wider mb-0.5">30D Velocity</p>
                    <div className="flex items-center gap-1 justify-center">
                        <TrendingUp size={12} className="text-emerald-500" />
                        <p className="text-base font-black text-slate-900">High</p>
                    </div>
                </div>
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-2 ${showFilters ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300 hover:shadow-lg'}`}
            >
              <Filter size={16} className={showFilters ? "rotate-180 transition-transform duration-500" : ""} />
              Analysis Filters
            </button>
            
            <button 
              onClick={fetchTransactions}
              className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ADVANCED FILTERING PANEL */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -20 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-white border-2 border-slate-50/50 rounded-3xl p-6 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.03)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    <Search size={12} /> Narrative Search
                  </label>
                  <input 
                    type="text"
                    placeholder="Reference, Memo or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-xl text-xs font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    <CreditCard size={12} /> Account Ledger
                  </label>
                  <div className="relative group">
                    <select 
                        value={selectedLedger}
                        onChange={(e) => setSelectedLedger(e.target.value)}
                        className="w-full appearance-none px-5 py-3.5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                    >
                        <option value="all">All Sub-Ledgers</option>
                        {ledgers.map(l => (
                        <option key={l._id} value={l._id}>{l.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <ArrowDownLeft size={14} className="rotate-[225deg]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    <History size={12} /> Entry Classifier
                  </label>
                  <div className="relative group">
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full appearance-none px-5 py-3.5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                    >
                        <option value="all">Global Types</option>
                        <option value="Bill">Revenue (Bills)</option>
                        <option value="Manual">Journal Adjustments</option>
                        <option value="Expense">Operating Expense</option>
                        <option value="Purchase">Inventory Inflow</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <ArrowDownLeft size={14} className="rotate-[225deg]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    <Calendar size={12} /> Fiscal Interval
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      className="w-full px-3 py-3 bg-slate-50/50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-xl text-[10px] font-black tracking-tight text-slate-700 outline-none transition-all"
                    />
                    <ArrowRight size={12} className="text-slate-300 shrink-0" />
                    <input 
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      className="w-full px-3 py-3 bg-slate-50/50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-xl text-[10px] font-black tracking-tight text-slate-700 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DATA GRID COMPONENT */}
        <div className="space-y-6 relative">
          
          {/* BACKGROUND DECORATION */}
          <div className="absolute -left-10 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-slate-100 to-transparent hidden xl:block" />

          {filteredTransactions.map((tx, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.5, ease: "easeOut" }}
              key={tx._id} 
              className="group relative"
            >
              {/* TIMELINE INDICATOR */}
              <div className="absolute -left-[2.75rem] top-8 w-3 h-3 rounded-full bg-white border-[3px] border-indigo-500 hidden xl:flex items-center justify-center outline outline-4 outline-slate-50/50 group-hover:scale-125 transition-transform duration-500" />
              
              <div className="bg-white rounded-3xl border border-slate-100/80 shadow-md hover:shadow-xl hover:border-indigo-100 transition-all duration-700 group-hover:-translate-y-0.5 overflow-hidden">
                <div className="p-6 lg:p-8">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    
                    {/* LEFT: MASTER INFO */}
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
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border ${getTxTypeStyles(tx.referenceType)}`}>
                            {tx.referenceType || 'Internal Journal'}
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
                                <code className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-[10px]">{tx.referenceId}</code>
                                <Hash size={12} className="opacity-30" />
                            </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: TOTAL VALUE REVEAL */}
                    <div className="flex items-center xl:flex-col xl:items-end gap-4 xl:gap-1">
                       <div className="flex flex-col xl:items-end">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Transaction Face Value</span>
                            <div className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-indigo-700 transition-colors">
                                <span className="text-lg align-top mr-0.5 font-medium opacity-30 tracking-normal">₹</span>
                                {tx.entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                            </div>
                       </div>
                    </div>
                  </div>

                  {/* BOTTOM: BALANCED ENTRIES */}
                  <div className="mt-8 pt-8 border-t border-slate-50 relative">
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 px-3 bg-white">
                        <div className="p-1.5 bg-indigo-50/50 rounded-full border border-indigo-100/30">
                            <ArrowLeftRight size={14} className="text-indigo-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                      {/* DEBIT CLUSTER */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                           <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200">
                                    <ArrowDownLeft size={14} className="text-white" />
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Debit Assignments (In)</span>
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                          {tx.entries.filter(e => e.type === 'debit').map((entry, eIdx) => (
                            <div key={eIdx} className="group/entry flex items-center justify-between p-4 bg-slate-50/30 rounded-2xl border border-transparent hover:border-emerald-500/20 hover:bg-emerald-50/10 transition-all duration-300">
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

                      {/* CREDIT CLUSTER */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                           <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-rose-500 flex items-center justify-center shadow-md shadow-rose-200">
                                    <ArrowUpRight size={14} className="text-white" />
                                </div>
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Credit Assignments (Out)</span>
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                          {tx.entries.filter(e => e.type === 'credit').map((entry, eIdx) => (
                            <div key={eIdx} className="group/entry flex items-center justify-between p-4 bg-slate-50/30 rounded-2xl border border-transparent hover:border-rose-500/20 hover:bg-rose-50/10 transition-all duration-300">
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
          ))}
          
          {filteredTransactions.length === 0 && !loading && (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Layers className="text-slate-200" size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Financial Void</h3>
              <p className="text-slate-400 font-medium mt-2 text-sm max-w-xs mx-auto">
                We couldn't find any transaction matching your high-precision filter criteria. 
              </p>
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setSelectedLedger("all");
                  setDateRange({ start: "", end: "" });
                }}
                className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all active:scale-95"
              >
                Clear Precision Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
