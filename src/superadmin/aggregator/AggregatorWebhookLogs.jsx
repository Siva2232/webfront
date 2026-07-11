import { useEffect, useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { getAggregatorLogs } from "../../api/superAdminAggregatorApi";

const STATUS_STYLES = {
  success: "text-emerald-400",
  error: "text-rose-400",
  ignored: "text-slate-400",
};

export default function AggregatorWebhookLogs({ restaurants = [] }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    restaurantId: "",
    status: "",
    platform: "",
    event: "",
  });

  const loadLogs = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 30 };
      if (filters.restaurantId) params.restaurantId = filters.restaurantId;
      if (filters.status) params.status = filters.status;
      if (filters.platform) params.platform = filters.platform;
      if (filters.event) params.event = filters.event;

      const { data } = await getAggregatorLogs(params);
      setLogs(data.logs || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [filters]);

  const restaurantName = (id) => {
    const r = restaurants.find((x) => x.restaurantId === id);
    return r ? r.name : id;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-black uppercase tracking-wider text-white mb-3">
          Webhook Logs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select
            value={filters.restaurantId}
            onChange={(e) => setFilters((f) => ({ ...f, restaurantId: e.target.value }))}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
          >
            <option value="">All restaurants</option>
            {restaurants.map((r) => (
              <option key={r.restaurantId} value={r.restaurantId}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="ignored">Ignored</option>
          </select>
          <select
            value={filters.platform}
            onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
          >
            <option value="">All platforms</option>
            <option value="swiggy">Swiggy</option>
            <option value="zomato">Zomato</option>
          </select>
          <select
            value={filters.event}
            onChange={(e) => setFilters((f) => ({ ...f, event: e.target.value }))}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
          >
            <option value="">All events</option>
            <option value="order.created">order.created</option>
            <option value="order.cancelled">order.cancelled</option>
            <option value="order.updated">order.updated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      ) : logs.length === 0 ? (
        <p className="py-12 text-center text-slate-500 text-sm">No webhook logs found.</p>
      ) : (
        <div className="divide-y divide-slate-800">
          {logs.map((log) => (
            <div key={log._id} className="p-4 hover:bg-slate-800/20">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500">
                    {new Date(log.createdAt).toLocaleString("en-IN")}
                  </span>
                  <span className="font-mono text-slate-400">{log.restaurantId}</span>
                  <span className="text-white font-semibold">{restaurantName(log.restaurantId)}</span>
                  <span className={`font-bold uppercase ${STATUS_STYLES[log.status] || "text-slate-400"}`}>
                    {log.status}
                  </span>
                  {log.event && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{log.event}</span>
                  )}
                  {log.platform && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{log.platform}</span>
                  )}
                  {log.externalOrderId && (
                    <span className="text-violet-400 font-mono">#{log.externalOrderId}</span>
                  )}
                  <span className="ml-auto">
                    {expandedId === log._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </div>
                {log.errorMessage && (
                  <p className="mt-1 text-xs text-rose-400 truncate">{log.errorMessage}</p>
                )}
              </button>

              {expandedId === log._id && log.rawPayload && (
                <pre className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(log.rawPayload, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-800">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => loadLogs(page - 1)}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-slate-500">
            Page {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => loadLogs(page + 1)}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
