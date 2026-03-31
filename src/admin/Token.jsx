import React, { useMemo } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import { 
  Ticket, 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  UtensilsCrossed, 
  Package,
  Search,
  Timer
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "../components/StatusBadge";

export default function Token() {
  const { orders = [], fetchOrders, isLoading } = useOrders();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const activeTokens = useMemo(() => {
    return orders
      .filter(o => o.isTakeawayOrder && o.tokenNumber && o.status !== "Closed" && o.status !== "Cancelled")
      .sort((a, b) => b.tokenNumber - a.tokenNumber); // Newest tokens first
  }, [orders]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return activeTokens;
    const query = searchQuery.toLowerCase();
    return activeTokens.filter(t => 
      t.tokenNumber.toString().includes(query) || 
      (t.customerName && t.customerName.toLowerCase().includes(query)) ||
      (t._id && t._id.toLowerCase().includes(query))
    );
  }, [activeTokens, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = {
      Pending: 0,
      Preparing: 0,
      Ready: 0,
    };
    activeTokens.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
    return counts;
  }, [activeTokens]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                <Ticket className="text-indigo-600" /> Token Management
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Real-time takeaway tracking
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Live System</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Active" value={activeTokens.length} color="indigo" icon={Ticket} />
          <StatCard label="Pending" value={statusCounts.Pending} color="orange" icon={Timer} />
          <StatCard label="Preparing" value={statusCounts.Preparing} color="blue" icon={UtensilsCrossed} />
          <StatCard label="Ready" value={statusCounts.Ready} color="emerald" icon={CheckCircle2} />
        </div>

        {/* Search & Filter */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search by token number, customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium"
          />
        </div>

        {/* Token Grid */}
        {filteredTokens.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket size={40} className="text-slate-200" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">No Active Tokens</h3>
            <p className="text-slate-400 text-xs mt-1">New takeaway orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredTokens.map((token) => (
                <TokenCard key={token._id} token={token} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  const themes = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };

  return (
    <div className={`p-4 rounded-2xl border ${themes[color]} shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} />
        <span className="text-sm font-black">{value}</span>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
  );
}

function TokenCard({ token }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden relative group"
    >
      {/* Status Color Strip */}
      <div className={`h-1.5 w-full ${
        token.status === 'Ready' ? 'bg-emerald-500' : 
        token.status === 'Preparing' ? 'bg-blue-500' : 
        'bg-orange-500'
      }`} />
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Token Number</span>
            <p className="text-5xl font-black text-slate-900 tracking-tighter">#{token.tokenNumber}</p>
          </div>
          <div className="text-right">
            <StatusBadge status={token.status} />
            <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center justify-end gap-1">
              <Clock size={10} /> {format(new Date(token.createdAt), "hh:mm a")}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                <Package size={16} />
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Customer</p>
                <p className="text-xs font-bold text-slate-700 truncate">{token.customerName || "Takeaway Customer"}</p>
             </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {token.items?.slice(0, 3).map((item, idx) => (
                <div key={idx} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm" title={item.name}>
                  <img
                    src={item.image || "https://via.placeholder.com/64?text=No+Img"}
                    alt={item.name || "Product"}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/64?text=No+Img";
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {token.items?.length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                  +{token.items.length - 3}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Items</p>
              <p className="text-xs font-bold text-slate-900">{token.items?.length || 0} Products</p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
           <span>Subtotal: ₹{token.totalAmount?.toLocaleString()}</span>
           <span className="text-indigo-600">ID: {(token._id || "").slice(-6)}</span>
        </div>
      </div>
    </motion.div>
  );
}
