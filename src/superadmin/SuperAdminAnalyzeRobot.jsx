import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  Loader2,
  Activity,
  Building2,
  DollarSign,
  AlertTriangle,
  Zap,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getAnalyticsRobotSnapshot,
  askAnalyticsRobot,
} from "../api/restaurantApi";

function formatRelativeTime(dateInput) {
  if (!dateInput) return "—";
  const then = new Date(dateInput).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateInput).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function renderAnswer(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-white font-black">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const QUICK_STATS = [
  { key: "mrr", label: "MRR", icon: DollarSign, get: (s) => `₹${(s?.revenue?.mrr || 0).toLocaleString("en-IN")}` },
  { key: "active", label: "Active", icon: Building2, get: (s) => s?.fleet?.active ?? "—" },
  { key: "trial", label: "Trials", icon: Sparkles, get: (s) => s?.fleet?.trial ?? "—" },
  { key: "expiring", label: "Expiring ≤7d", icon: AlertTriangle, get: (s) => s?.tenants?.expiringSoon?.length ?? 0 },
];

export default function SuperAdminAnalyzeRobot() {
  const [snapshot, setSnapshot] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [categories, setCategories] = useState([]);
  const [questionFilter, setQuestionFilter] = useState("");
  const [expandedCategory, setExpandedCategory] = useState("overview");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "robot",
      text:
        "I'm your platform analytics robot. I study live tenant, revenue, payment, and activity data every 30 seconds. Ask me anything about your SaaS fleet.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadSnapshot = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const { data } = await getAnalyticsRobotSnapshot({ skipCoalesce: true });
      setSnapshot(data.snapshot);
      setSuggested(data.suggestedQuestions || []);
      setCategories(data.questionCategories || []);
      setLastSync(new Date());
    } catch {
      if (!silent) toast.error("Failed to sync platform data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    const pollId = setInterval(() => loadSnapshot(true), 30000);
    return () => clearInterval(pollId);
  }, [loadSnapshot]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, asking]);

  const sendQuestion = async (questionText) => {
    const q = String(questionText || input).trim();
    if (!q || asking) return;

    setInput("");
    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAsking(true);

    try {
      const { data } = await askAnalyticsRobot({ question: q });
      setSnapshot(data.snapshot);
      setLastSync(new Date(data.generatedAt));
      setMessages((prev) => [
        ...prev,
        {
          id: `r-${Date.now()}`,
          role: "robot",
          text: data.answer,
          intent: data.intent,
          createdAt: data.generatedAt,
        },
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Robot could not analyze right now");
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "robot",
          text: "Sorry — I couldn't reach the analytics engine. Check your connection and try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setAsking(false);
      inputRef.current?.focus();
    }
  };

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      questions: cat.questions.filter((q) =>
        q.toLowerCase().includes(questionFilter.trim().toLowerCase())
      ),
    }))
    .filter((cat) => cat.questions.length > 0);

  const totalQuestionCount = suggested.length || categories.reduce((n, c) => n + c.questions.length, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion();
  };

  return (
    <div className="max-w-[1600px] mx-auto p-8 pb-16 min-h-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-600 to-pink-600 flex items-center justify-center shadow-xl shadow-pink-500/20 ring-1 ring-white/10">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">AI Analyzer</p>
            <h1 className="text-3xl font-black text-white tracking-tight">Analytics Robot</h1>
            <p className="mt-1 text-sm text-slate-400">
              Real-time platform intelligence — studies your entire fleet before every answer.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Grid</span>
            {lastSync && (
              <span className="text-[9px] font-bold text-slate-600">· {formatRelativeTime(lastSync)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => loadSnapshot()}
            disabled={refreshing}
            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-pink-500/40 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Live metrics sidebar */}
        <div className="xl:col-span-1 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-pink-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-white">Live Snapshot</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {QUICK_STATS.map(({ key, label, icon: Icon, get }) => (
                  <div key={key} className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                    <Icon className="w-4 h-4 text-slate-500 mb-2" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                    <p className="text-lg font-black text-white mt-1">{get(snapshot)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col max-h-[calc(100vh-12rem)]">
            <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Quick Ask</h2>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                {totalQuestionCount}+
              </span>
            </div>
            <input
              type="text"
              value={questionFilter}
              onChange={(e) => setQuestionFilter(e.target.value)}
              placeholder="Search questions…"
              className="mb-3 shrink-0 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-pink-500/40"
            />
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {filteredCategories.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-4">No matching questions</p>
              ) : (
                filteredCategories.map((cat) => (
                  <div key={cat.id} className="rounded-2xl border border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(expandedCategory === cat.id ? "" : cat.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-950 text-left hover:bg-slate-900 transition-colors"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        {cat.label}
                      </span>
                      <span className="text-[9px] font-bold text-slate-600">{cat.questions.length}</span>
                    </button>
                    {(expandedCategory === cat.id || questionFilter.trim()) && (
                      <div className="flex flex-col gap-1.5 p-2 bg-slate-950/50">
                        {cat.questions.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => sendQuestion(q)}
                            disabled={asking}
                            className="text-left text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 transition-all disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div className="xl:col-span-3 flex flex-col rounded-[2.5rem] border border-slate-800 bg-slate-900/40 overflow-hidden min-h-[70vh]">
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${
                      msg.role === "user"
                        ? "bg-pink-600 text-white"
                        : "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                    }`}
                  >
                    {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                      msg.role === "user"
                        ? "bg-pink-600/20 border border-pink-500/20 text-pink-50"
                        : "bg-slate-950/80 border border-slate-800 text-slate-300"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderAnswer(msg.text)}</p>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                      {formatRelativeTime(msg.createdAt)}
                      {msg.intent && msg.role === "robot" ? ` · ${msg.intent}` : ""}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {asking && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="rounded-3xl px-5 py-4 bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                    Studying live platform data…
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/50">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about MRR, tenants, payments, expiring subscriptions…"
                disabled={asking}
                className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-sm font-medium text-white placeholder:text-slate-600 outline-none focus:border-pink-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={asking || !input.trim()}
                className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-pink-500 disabled:opacity-50 transition-all"
              >
                {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Analyze
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
