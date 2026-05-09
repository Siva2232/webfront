import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { io } from "socket.io-client";
import { getCurrentRestaurantId, tenantKey } from "../utils/tenantCache";
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
import StickyPageHeader from "./components/StickyPageHeader";

const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000");

export default function Token() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState(() => {
    // Hydrate from cache immediately so board is never empty on first render
    try {
      const rid = getCurrentRestaurantId();
      const cached = localStorage.getItem(tenantKey("cachedTokens", rid));
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  // Start in loading state only when there is no cache (first ever visit)
  const [isFetching, setIsFetching] = useState(() => {
    const rid = getCurrentRestaurantId();
    return !localStorage.getItem(tenantKey("cachedTokens", rid));
  });
  const [isResetting, setIsResetting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;
  const socketRef = useRef(null);

  // ─── Fetch tokens from dedicated API ─────────────────────────────────────
  const fetchTokens = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data } = await API.get(`/orders/tokens?page=${page}&limit=${PER_PAGE}`);
      const fetchedTokens = data.tokens || [];
      setTokens(fetchedTokens);
      try {
        const rid = getCurrentRestaurantId();
        localStorage.setItem(tenantKey("cachedTokens", rid), JSON.stringify(fetchedTokens));
        localStorage.setItem(tenantKey("lastTokenFetch", rid), Date.now().toString());
      } catch {}
    } catch (err) {
      console.error("fetchTokens error:", err);
    } finally {
      setIsFetching(false);
    }
  }, [page]);

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
    const rid = getCurrentRestaurantId();
    const lastFetch = localStorage.getItem(tenantKey("lastTokenFetch", rid));
    const now = Date.now();

    // Always fetch on mount to get fresh server data
    // Cache was already applied in useState initializer above
    const cacheAge = lastFetch ? now - parseInt(lastFetch) : Infinity;
    if (cacheAge > 10000) {
      // Only skip if fetched within last 10s (e.g. hot reload)
      fetchTokens();
    } else {
      setIsFetching(false); // cache is fresh, no network needed yet
    }

    // Connect socket for real-time updates
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // Join restaurant room for scoped events
    if (rid) socket.emit('joinRoom', rid);
    socket.on("connect", () => {
      if (rid) socket.emit('joinRoom', rid);
    });

    // New takeaway order created → add to board instantly, then sync from server
    socket.on("orderCreated", (order) => {
      if (!order.isTakeawayOrder || !order.tokenNumber) return;
      setTokens(prev => {
        const exists = prev.some(t => t._id === order._id);
        if (exists) return prev;
        const next = [order, ...prev];
        try { const curRid = getCurrentRestaurantId(); localStorage.setItem(tenantKey("cachedTokens", curRid), JSON.stringify(next)); } catch {}
        return next;
      });
      const resRid = getCurrentRestaurantId();
      localStorage.removeItem(tenantKey("lastTokenFetch", resRid));
    });

    // Order updated (status change, close, etc.) → update in place
    socket.on("orderUpdated", (order) => {
      if (!order.isTakeawayOrder || !order.tokenNumber) return;
      setTokens(prev => {
        const next = prev.map(t => t._id === order._id ? { ...t, ...order } : t);
        try { const curRid = getCurrentRestaurantId(); localStorage.setItem(tenantKey("cachedTokens", curRid), JSON.stringify(next)); } catch {}
        return next;
      });
    });

    // Admin triggered reset → instantly clear board
    socket.on("tokenReset", () => {
      setTokens([]);
      const curRid = getCurrentRestaurantId();
      localStorage.removeItem(tenantKey("cachedTokens", curRid));
      localStorage.removeItem(tenantKey("lastTokenFetch", curRid));
      toast("Tokens were reset by admin", { icon: "🔄" });
    });

    // Lightweight poll every 15s (socket handles real-time; poll is safety net only)
    const poll = setInterval(() => fetchTokens(), 15000);

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

  useEffect(() => { setPage(1); }, [searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = { Pending: 0, Preparing: 0, Ready: 0 };
    tokens.forEach(t => {
      if (t.status !== "Closed" && counts[t.status] !== undefined) counts[t.status]++;
    });
    return counts;
  }, [tokens]);

  const activeCount = tokens.filter(t => t.status !== "Closed").length;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-20 font-sans">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />
      <StickyPageHeader
        icon={Ticket}
        eyebrow="Takeaway"
        title="Token management"
        subtitle="Real-time takeaway tracking"
        onBack={() => navigate(-1)}
        rightAddon={
          <>
            <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 shadow-inner sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-zinc-200/80">
                <Ticket size={16} className="text-zinc-700" />
              </div>
              <div className="flex flex-col pr-1">
                <span className="text-sm font-black tabular-nums leading-none text-zinc-900">
                  {activeCount.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-tight text-zinc-500">
                  Active
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchTokens}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              {isFetching ? "Syncing" : "Refresh"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {isResetting ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <RotateCcw size={14} />
              )}
              Reset tokens
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 shadow-inner md:flex">
              <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-700" />
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-700">
                Live
              </span>
            </div>
          </>
        }
      />

      <main className="mx-auto max-w-5xl p-6">
        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Active" value={activeCount} color="zinc" icon={Ticket} />
          <StatCard label="Pending" value={statusCounts.Pending} color="amber" icon={Timer} />
          <StatCard label="Preparing" value={statusCounts.Preparing} color="slate" icon={UtensilsCrossed} />
          <StatCard label="Ready" value={statusCounts.Ready} color="emerald" icon={CheckCircle2} />
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Search by token number or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-white py-4 pl-12 pr-6 font-medium shadow-sm shadow-zinc-900/5 outline-none transition-all focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        {/* Token Grid */}
        {isFetching && filteredTokens.length === 0 ? (
          /* Loading skeleton — shown only on first load with no cache */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm shadow-zinc-900/5 animate-pulse">
                <div className="h-1.5 w-full bg-zinc-200" />
                <div className="space-y-4 p-6">
                  <div className="h-12 w-20 rounded-xl bg-zinc-100" />
                  <div className="h-4 w-full rounded-lg bg-zinc-100" />
                  <div className="h-4 w-3/4 rounded-lg bg-zinc-100" />
                  <div className="h-10 w-full rounded-xl bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white py-20 text-center shadow-sm shadow-zinc-900/5">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100">
              <Ticket size={40} className="text-zinc-300" />
            </div>
            <h3 className="text-lg font-black uppercase text-zinc-900">No active tokens</h3>
            <p className="mt-1 text-xs text-zinc-500">New takeaway orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredTokens.map((token) => (
              <TokenCard key={token._id} token={token} onClose={closeToken} />
            ))}
          </div>
        )}

        {filteredTokens.length >= PER_PAGE && (
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Page {page}
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  const themes = {
    zinc: "border-zinc-200 bg-white text-zinc-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    slate: "border-zinc-200 bg-zinc-50 text-zinc-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm shadow-zinc-900/5 ${themes[color]}`}>
      <div className="mb-2 flex items-center justify-between">
        <Icon size={18} className="opacity-90" />
        <span className="text-sm font-black tabular-nums">{value}</span>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-90">{label}</p>
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
      className={`group relative overflow-hidden rounded-3xl border bg-white shadow-sm shadow-zinc-900/5 transition-all hover:shadow-md ${
        isClosed ? "border-zinc-200" : "border-zinc-200"
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
      <div
        className={`h-1.5 w-full ${
          isClosed
            ? "bg-zinc-300"
            : token.status === "Ready"
              ? "bg-emerald-500"
              : token.status === "Preparing"
                ? "bg-zinc-500"
                : "bg-amber-500"
        }`}
      />

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
          <span className={isClosed ? "text-zinc-400" : "text-zinc-700"}>
            #{token._id?.slice(-6)}
          </span>
        </div>
      </div>
    </div>
  );
}
