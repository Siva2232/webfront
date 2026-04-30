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
import { getTxTypeStyles } from "./transactions/utils/getTxTypeStyles";
import TransactionCard from "./transactions/components/TransactionCard";
import TransactionsEmptyState from "./transactions/components/TransactionsEmptyState";

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
            <TransactionCard key={tx._id} tx={tx} idx={idx} typeStyles={getTxTypeStyles(tx.referenceType)} />
          ))}
          
          {filteredTransactions.length === 0 && !loading && (
            <TransactionsEmptyState
              onClear={() => {
                setSearchTerm("");
                setFilterType("all");
                setSelectedLedger("all");
                setDateRange({ start: "", end: "" });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
