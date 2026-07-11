import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Truck, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAggregatorOverview,
  getAggregatorRestaurants,
} from "../api/superAdminAggregatorApi";
import AggregatorOverviewCards from "./aggregator/AggregatorOverviewCards";
import PlatformAggregatorSettings from "./aggregator/PlatformAggregatorSettings";
import AggregatorRestaurantTable from "./aggregator/AggregatorRestaurantTable";
import AggregatorWebhookLogs from "./aggregator/AggregatorWebhookLogs";
import AggregatorDocsPanel from "./aggregator/AggregatorDocsPanel";

export default function SuperAdminAggregatorMonitor() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState(null);
  const [restaurants, setRestaurants] = useState([]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [overviewRes, restaurantsRes] = await Promise.all([
        getAggregatorOverview(),
        getAggregatorRestaurants(),
      ]);
      setOverview(overviewRes.data);
      setRestaurants(restaurantsRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load aggregator monitor data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
            <Truck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
              Platform Monitor
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Swiggy / Zomato
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Configure third-party middleware credentials and monitor restaurant integration status.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300 hover:text-white hover:border-pink-500/40 transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </motion.div>

      <AggregatorOverviewCards overview={overview} />

      <PlatformAggregatorSettings />

      <AggregatorRestaurantTable restaurants={restaurants} />

      <div className="grid lg:grid-cols-2 gap-6">
        <AggregatorWebhookLogs restaurants={restaurants} />
        <AggregatorDocsPanel />
      </div>
    </div>
  );
}
