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
import StickyPageHeader from "../components/StickyPageHeader";

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
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans text-zinc-900 selection:bg-zinc-900/10 selection:text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />

      <StickyPageHeader
        icon={ArrowLeftRight}
        eyebrow="Accounting"
        title="Transactions"
        subtitle="Journal ledger & audit trail"
        rightAddon={
          <>
            <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 shadow-inner sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-zinc-200/80">
                <Hash size={16} className="text-zinc-700" />
              </div>
              <div className="flex flex-col pr-1">
                <span className="text-sm font-black tabular-nums leading-none text-zinc-900">
                  {transactions.length.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-tight text-zinc-500">
                  Records
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchTransactions}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Syncing" : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
                showFilters
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/15"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <Filter size={14} />
              Filters
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 lg:py-10">

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
