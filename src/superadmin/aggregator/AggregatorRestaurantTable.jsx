import { useMemo, useState } from "react";
import { Search, Copy, CheckCircle2, X, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "feature_off", label: "Module off" },
  { id: "integration_off", label: "Integration off" },
  { id: "connected", label: "Connected" },
  { id: "error", label: "Error" },
];

function StatusBadge({ status }) {
  const styles = {
    connected: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    error: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    disconnected: "bg-slate-500/10 text-slate-400 border-slate-700",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
        styles[status] || styles.disconnected
      }`}
    >
      {status || "disconnected"}
    </span>
  );
}

function BoolBadge({ on, labelOn = "On", labelOff = "Off" }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
        on ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700/50 text-slate-500"
      }`}
    >
      {on ? labelOn : labelOff}
    </span>
  );
}

export default function AggregatorRestaurantTable({ restaurants = [] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return restaurants.filter((r) => {
      const matchSearch =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.restaurantId?.toLowerCase().includes(q);

      let matchFilter = true;
      if (filter === "feature_off") matchFilter = !r.featureEnabled;
      else if (filter === "integration_off") matchFilter = !r.enabled;
      else if (filter === "connected") matchFilter = r.connectionStatus === "connected";
      else if (filter === "error") matchFilter = r.connectionStatus === "error";

      return matchSearch && matchFilter;
    });
  }, [restaurants, search, filter]);

  const handleCopy = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Webhook URL copied");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-white">Restaurant Status</h2>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                filter === f.id
                  ? "bg-pink-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-slate-800">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or restaurant ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Integration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Swiggy</th>
              <th className="px-4 py-3">Zomato</th>
              <th className="px-4 py-3">Menu Sync</th>
              <th className="px-4 py-3">Webhook</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No restaurants match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.restaurantId}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30 cursor-pointer transition"
                  onClick={() => setSelected(r)}
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-white">{r.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{r.restaurantId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <BoolBadge on={r.featureEnabled} labelOn="Enabled" labelOff="Disabled" />
                  </td>
                  <td className="px-4 py-3">
                    <BoolBadge on={r.enabled} labelOn="Active" labelOff="Inactive" />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.connectionStatus} />
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {r.providerName || r.providerType || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <BoolBadge on={r.swiggyEnabled} />
                  </td>
                  <td className="px-4 py-3">
                    <BoolBadge on={r.zomatoEnabled} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {r.lastMenuSyncAt
                      ? new Date(r.lastMenuSyncAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.webhookUrl ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(r.webhookUrl, r.restaurantId);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white"
                      >
                        {copiedId === r.restaurantId ? (
                          <CheckCircle2 size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                        Copy
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={16} className="text-slate-600" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</p>
                  <h3 className="text-lg font-black text-white">{selected.name}</h3>
                  <p className="text-xs font-mono text-slate-500">{selected.restaurantId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4 text-sm">
                <DetailRow label="Subscription" value={selected.subscriptionStatus} />
                <DetailRow label="Module access" value={selected.featureEnabled ? "Enabled" : "Disabled"} />
                <DetailRow label="Integration" value={selected.enabled ? "Active" : "Inactive"} />
                <DetailRow label="Connection" value={selected.connectionStatus} />
                <DetailRow label="Provider" value={selected.providerName || selected.platformProviderName || "—"} />
                <DetailRow
                  label="Platform credentials"
                  value={selected.platformConfigured ? "Configured" : "Not configured"}
                />
                <DetailRow label="Swiggy store ID" value={selected.swiggyStoreId || "—"} />
                <DetailRow label="Zomato store ID" value={selected.zomatoStoreId || "—"} />
                <DetailRow
                  label="Last menu sync"
                  value={
                    selected.lastMenuSyncAt
                      ? new Date(selected.lastMenuSyncAt).toLocaleString()
                      : "Never"
                  }
                />

                {selected.webhookUrl && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Webhook URL
                    </p>
                    <code className="block p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 break-all">
                      {selected.webhookUrl}
                    </code>
                  </div>
                )}

                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4 text-xs text-slate-400">
                  Restaurant admins configure their store IDs at{" "}
                  <span className="text-pink-400 font-semibold">Profile → Swiggy / Zomato</span>.
                  Middleware API keys are managed here in Super Admin.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-800/60">
      <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">{label}</span>
      <span className="text-white font-medium text-right">{value}</span>
    </div>
  );
}
