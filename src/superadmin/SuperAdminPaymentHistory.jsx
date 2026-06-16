import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, Loader2, RefreshCw, IndianRupee, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { getPlatformPaymentHistory } from "../api/restaurantApi";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SuperAdminPaymentHistory() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getPlatformPaymentHistory();
      setHistory(data.history || []);
      setTotalRevenue(data.totalRevenue || 0);
    } catch {
      toast.error("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/20 border border-emerald-500/30">
              <History className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Revenue ledger</p>
              <h1 className="mt-1 text-3xl font-black text-white tracking-tight">Payment History</h1>
              <p className="mt-1.5 text-sm text-slate-400">
                All subscription payments from restaurant owners to your platform Razorpay account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Total collected</p>
          <p className="mt-1 text-3xl font-black text-white tabular-nums">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-500">{history.length} payment{history.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 py-16 text-center">
            <IndianRupee className="mx-auto h-10 w-10 text-slate-700" />
            <p className="mt-4 text-sm font-bold text-slate-500">No subscription payments yet</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Restaurant</th>
                    <th className="px-5 py-4">Plan</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Method</th>
                    <th className="px-5 py-4">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, idx) => (
                    <tr
                      key={`${row.restaurantId}-${row.reference}-${idx}`}
                      className="border-b border-slate-800/50 hover:bg-slate-900/40"
                    >
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-600 shrink-0" />
                          <div>
                            <p className="font-bold text-white">{row.restaurantName}</p>
                            <p className="text-[10px] text-slate-500">{row.restaurantId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-300">{row.planName || "—"}</td>
                      <td className="px-5 py-4 font-black text-emerald-400 tabular-nums">
                        ₹{Number(row.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-4 text-slate-400 capitalize">{row.method || "—"}</td>
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-500 max-w-[140px] truncate" title={row.razorpayPaymentId || row.reference}>
                        {row.razorpayPaymentId || row.reference || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
