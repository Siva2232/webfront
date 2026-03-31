import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { io } from "socket.io-client";
import { 
  Ticket, 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  UtensilsCrossed, 
  Package,
  Search,
  Timer,
  RotateCcw,
  CheckCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "../components/StatusBadge";
import { toast } from "react-hot-toast";

const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000");

export default function Token() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const socketRef = useRef(null);

  // ─── Fetch tokens from dedicated API ─────────────────────────────────────
  const fetchTokens = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data } = await API.get("/orders/tokens");
      const fetchedTokens = data.tokens || [];
      setTokens(fetchedTokens);
      // Cache data for instant loading next time
      localStorage.setItem("cachedTokens", JSON.stringify(fetchedTokens));
      localStorage.setItem("lastTokenFetch", Date.now().toString());
    } catch (err) {
      console.error("fetchTokens error:", err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // ─── Close individual token ────────────────────────────────────────────────
  const closeToken = useCallback(async (tokenId) => {
    // Optimistic update
    setTokens(prev => prev.map(t => t._id === tokenId ? { ...t, status: "Closed" } : t));
    try {
      await API.put(`/orders/${tokenId}/status`, { status: "Closed" });
    } catch (err) {
      toast.error("Failed to close token");
      fetchTokens(); // Revert on error
    }
  }, [fetchTokens]);

  // ─── Reset all tokens ──────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!window.confirm("Reset all tokens? Active tokens will be closed and counting restarts from #1.")) return;
    setIsResetting(true);
    try {
      await API.post("/orders/reset-tokens");
      setTokens([]);
      toast.success("All tokens reset. Counter starts from #1.");
    } catch (err) {
      toast.error("Failed to reset tokens");
    } finally {
      setIsResetting(false);
    }
  };

  // ─── Mount: fetch + socket ────────────────────────────────────────────────
  useEffect(() => {
    const lastFetch = localStorage.getItem("lastTokenFetch");
    const now = Date.now();

    // Hydrate from cache immediately for instant display
    const cachedTokens = localStorage.getItem("cachedTokens");
    if (cachedTokens) {
      try { setTokens(JSON.parse(cachedTokens)); } catch (e) {}
    }

    // Only hit the network if cache is stale (>5min) or missing
    if (!lastFetch || (now - parseInt(lastFetch)) > 300000) {
      fetchTokens();
    }

    // Connect socket for real-time updates
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // New takeaway order created → add to board instantly, then sync from server
    socket.on("orderCreated", (order) => {
      if (!order.isTakeawayOrder || !order.tokenNumber) return;
      setTokens(prev => {
        const exists = prev.some(t => t._id === order._id);
        if (exists) return prev;
        return [order, ...prev];
      });
      // Invalidate cache so next mount gets fresh data
      localStorage.removeItem("lastTokenFetch");
    });

    // Order updated (status change, close, etc.) → update in place
    socket.on("orderUpdated", (order) => {
      if (!order.isTakeawayOrder || !order.tokenNumber) return;
      setTokens(prev => prev.map(t => t._id === order._id ? { ...t, ...order } : t));
    });

    // Admin triggered reset → instantly clear board
    socket.on("tokenReset", () => {
      setTokens([]);
      toast("Tokens were reset by admin", { icon: "🔄" });
    });

    // Fallback poll every 8s (lightweight safety net)
    const poll = setInterval(() => fetchTokens(), 8000);

    return () => {
      socket.disconnect();
      clearInterval(poll);
    };
  }, [fetchTokens]);

  // ─── Derived state ────────────────────────────────────────────────────────
  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      if (a.status === "Closed" && b.status !== "Closed") return 1;
      if (a.status !== "Closed" && b.status === "Closed") return -1;
      return b.tokenNumber - a.tokenNumber;
    });
  }, [tokens]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return sortedTokens;
    const q = searchQuery.toLowerCase();
    return sortedTokens.filter(t =>
      t.tokenNumber?.toString().includes(q) ||
      (t.customerName && t.customerName.toLowerCase().includes(q))
    );
  }, [sortedTokens, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = { Pending: 0, Preparing: 0, Ready: 0 };
    tokens.forEach(t => {
      if (t.status !== "Closed" && counts[t.status] !== undefined) counts[t.status]++;
    });
    return counts;
  }, [tokens]);

  const activeCount = tokens.filter(t => t.status !== "Closed").length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      {/* Header */}
      <header className="top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
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
            <button
              onClick={() => fetchTokens(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              title="Refresh"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-black text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {isResetting ? <Loader2 className="animate-spin" size={14} /> : <RotateCcw size={14} />}
              Reset Tokens
            </button>
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
          <StatCard label="Total Active" value={activeCount} color="indigo" icon={Ticket} />
          <StatCard label="Pending" value={statusCounts.Pending} color="orange" icon={Timer} />
          <StatCard label="Preparing" value={statusCounts.Preparing} color="blue" icon={UtensilsCrossed} />
          <StatCard label="Ready" value={statusCounts.Ready} color="emerald" icon={CheckCircle2} />
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by token number or customer name..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredTokens.map((token) => (
              <TokenCard key={token._id} token={token} onClose={closeToken} />
            ))}
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

function TokenCard({ token, onClose }) {
  const isClosed = token.status === "Closed";
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    if (!window.confirm(`Close Token #${token.tokenNumber}?`)) return;
    setClosing(true);
    await onClose(token._id);
    setClosing(false);
    toast.success(`Token #${token.tokenNumber} closed`);
  };

  return (
    <div
      className={`bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all overflow-hidden relative group ${
        isClosed ? "border-slate-200" : "border-slate-100"
      }`}
    >
      {/* Closed overlay stamp */}
      {isClosed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/85 text-white px-5 py-2 rounded-full flex items-center gap-2 shadow-xl backdrop-blur-sm -rotate-6 border border-slate-700">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-[11px] font-black uppercase tracking-widest">Token Closed</span>
          </div>
        </div>
      )}

      {/* Status strip */}
      <div className={`h-1.5 w-full ${
        isClosed ? "bg-slate-300" :
        token.status === "Ready" ? "bg-emerald-500" :
        token.status === "Preparing" ? "bg-blue-500" :
        "bg-orange-500"
      }`} />

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Token Number</span>
            <p className={`text-5xl font-black tracking-tighter ${isClosed ? "text-slate-400" : "text-slate-900"}`}>
              #{token.tokenNumber}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={token.status} />
            <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center justify-end gap-1">
              <Clock size={10} /> {format(new Date(token.createdAt), "hh:mm a")}
            </p>
          </div>
        </div>

        {/* Customer row */}
        <div className={`flex items-center gap-3 p-3 rounded-2xl border mb-3 ${isClosed ? "bg-slate-100 border-slate-200" : "bg-slate-50 border-slate-100"}`}>
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
            <Package size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Customer</p>
            <p className={`text-xs font-bold truncate ${isClosed ? "text-slate-500" : "text-slate-700"}`}>
              {token.customerName || "Takeaway Customer"}
            </p>
          </div>
        </div>

        {/* Items row */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {token.items?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm" title={item.name}>
                <img
                  src={item.image || "https://via.placeholder.com/64?text=?"}
                  alt={item.name}
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/64?text=?"; }}
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Items</p>
            <p className={`text-xs font-bold ${isClosed ? "text-slate-500" : "text-slate-900"}`}>{token.items?.length || 0}</p>
          </div>
        </div>

        {/* Close button — only for active tokens */}
        {!isClosed && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="w-full mt-5 py-2.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            {closing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
            {closing ? "Closing..." : "Close Token"}
          </button>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          <span>₹{token.totalAmount?.toLocaleString()}</span>
          <span className={isClosed ? "text-slate-400" : "text-indigo-600"}>
            #{token._id?.slice(-6)}
          </span>
        </div>
      </div>
    </div>
  );
}
