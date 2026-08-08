import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Save,
  ShieldCheck,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import { isAggregatorOrdersEnabled } from "../utils/aggregatorFeature";
import { useTheme } from "../context/ThemeContext";
import { getCurrentRestaurantId } from "../utils/tenantCache";
import {
  getAggregatorConfig,
  updateAggregatorConfig,
  testAggregatorConfig,
  syncAggregatorMenu,
  getAggregatorMenuStatus,
  getAggregatorLogs,
} from "../api/aggregatorApi";

function buildWebhookUrl(restaurantId) {
  const isProd = import.meta.env.PROD;
  const apiBase = isProd
    ? import.meta.env.VITE_API_BASE_URL || "https://backend-res-sln4.onrender.com/api"
    : import.meta.env.VITE_API_BASE_URL_DEV || "http://localhost:5000/api";
  return `${String(apiBase).replace(/\/$/, "")}/aggregator/webhook?restaurantId=${encodeURIComponent(restaurantId)}`;
}

const CANONICAL_WEBHOOK_EXAMPLE = `{
  "event": "order.created",
  "platform": "swiggy",
  "externalOrderId": "SW123456",
  "customer": {
    "name": "Customer Name",
    "phone": "+919876543210",
    "address": "Delivery address"
  },
  "items": [
    {
      "name": "Margherita Pizza",
      "qty": 1,
      "price": 299,
      "externalItemId": "PRODUCT_MONGO_ID"
    }
  ],
  "totalAmount": 299,
  "paymentMethod": "prepaid",
  "notes": "Extra napkins"
}`;

export default function AggregatorSettingsPage() {
  const { branding, features, featuresReady } = useTheme();
  const restaurantId = getCurrentRestaurantId() || branding?.restaurantId || "";
  const primary = branding?.primaryColor || "#18181b";
  const aggregatorEnabled = isAggregatorOrdersEnabled(
    features,
    branding.subscriptionPlan,
    { featuresReady }
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuStatus, setMenuStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  const [form, setForm] = useState({
    enabled: false,
    swiggyEnabled: false,
    zomatoEnabled: false,
    swiggyStoreId: "",
    zomatoStoreId: "",
    menuSyncEnabled: false,
  });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  const loadMenuStatus = async () => {
    try {
      const { data } = await getAggregatorMenuStatus();
      setMenuStatus(data);
    } catch {
      /* optional */
    }
  };

  const loadLogs = async () => {
    try {
      const { data } = await getAggregatorLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      /* optional */
    }
  };

  useEffect(() => {
    if (!aggregatorEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getAggregatorConfig();
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          enabled: Boolean(data.enabled),
          swiggyEnabled: Boolean(data.swiggyEnabled),
          zomatoEnabled: Boolean(data.zomatoEnabled),
          swiggyStoreId: data.swiggyStoreId || "",
          zomatoStoreId: data.zomatoStoreId || "",
          menuSyncEnabled: Boolean(data.menuSyncEnabled),
        }));
        setWebhookUrl(data.webhookUrl || (restaurantId ? buildWebhookUrl(restaurantId) : ""));
        setConnectionStatus(data.connectionStatus || "disconnected");
        await Promise.all([loadMenuStatus(), loadLogs()]);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.message || "Failed to load aggregator settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aggregatorEnabled, restaurantId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.enabled && !form.swiggyEnabled && !form.zomatoEnabled) {
      toast.error("Enable at least one platform (Swiggy or Zomato)");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        enabled: form.enabled,
        swiggyEnabled: form.swiggyEnabled,
        zomatoEnabled: form.zomatoEnabled,
        swiggyStoreId: form.swiggyStoreId.trim(),
        zomatoStoreId: form.zomatoStoreId.trim(),
        menuSyncEnabled: form.menuSyncEnabled,
      };

      const { data } = await updateAggregatorConfig(payload);
      const config = data.config || data;
      if (config.webhookUrl) setWebhookUrl(config.webhookUrl);
      setConnectionStatus(config.connectionStatus || "disconnected");
      toast.success("Restaurant settings saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save aggregator settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await testAggregatorConfig();
      if (data.success) {
        setConnectionStatus("connected");
        toast.success(data.message || "Connection test successful");
      } else {
        setConnectionStatus("error");
        toast.error(data.message || "Connection test failed");
      }
    } catch (err) {
      setConnectionStatus("error");
      toast.error(err.response?.data?.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSyncMenu = async () => {
    setSyncing(true);
    try {
      const { data } = await syncAggregatorMenu();
      if (data.success) {
        toast.success(data.message || `Synced ${data.synced} products`);
        await loadMenuStatus();
      } else {
        toast.error(data.message || "Menu sync failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Menu sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyWebhook = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success("Webhook URL copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  if (!aggregatorEnabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-black text-zinc-900">Aggregator orders not enabled</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Turn on <span className="font-semibold">Swiggy / Zomato orders</span> in your subscription plan
          or contact support to enable it.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const statusColor =
    connectionStatus === "connected"
      ? "text-emerald-600"
      : connectionStatus === "error"
        ? "text-red-600"
        : "text-zinc-500";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ backgroundColor: primary }}
          >
            <Truck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">Settings</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-900">Swiggy / Zomato</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Connect your Swiggy and Zomato stores to receive delivery orders in your POS.
            </p>
            <p className={`mt-2 text-xs font-semibold uppercase tracking-wider ${statusColor}`}>
              Status: {connectionStatus}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100 sm:p-8"
        >
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
            <div>
              <p className="font-bold text-zinc-900">Enable integration</p>
              <p className="text-xs text-zinc-500">Receive orders from Swiggy and Zomato via webhook</p>
            </div>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-5 w-5 rounded accent-zinc-900"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
              <span className="font-bold text-orange-800">Swiggy</span>
              <input
                type="checkbox"
                checked={form.swiggyEnabled}
                onChange={(e) => setForm({ ...form, swiggyEnabled: e.target.checked })}
                className="h-5 w-5 rounded accent-orange-600"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-4">
              <span className="font-bold text-red-800">Zomato</span>
              <input
                type="checkbox"
                checked={form.zomatoEnabled}
                onChange={(e) => setForm({ ...form, zomatoEnabled: e.target.checked })}
                className="h-5 w-5 rounded accent-red-600"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Swiggy store ID
              </label>
              <input
                type="text"
                value={form.swiggyStoreId}
                onChange={(e) => setForm({ ...form, swiggyStoreId: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Zomato store ID
              </label>
              <input
                type="text"
                value={form.zomatoStoreId}
                onChange={(e) => setForm({ ...form, zomatoStoreId: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          {webhookUrl && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Webhook URL
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 break-all rounded-xl bg-white px-3 py-2 text-xs text-zinc-700 ring-1 ring-zinc-100">
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Send header <code className="text-zinc-700">X-Aggregator-Signature</code> as HMAC-SHA256 of the raw body.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="font-bold text-zinc-900">Menu sync</p>
                <p className="text-xs text-zinc-500">Push your menu to Swiggy and Zomato</p>
              </div>
              <input
                type="checkbox"
                checked={form.menuSyncEnabled}
                onChange={(e) => setForm({ ...form, menuSyncEnabled: e.target.checked })}
                className="h-5 w-5 rounded accent-zinc-900"
              />
            </label>

            {menuStatus && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-100">
                  <p className="font-black text-lg text-emerald-600">{menuStatus.synced || 0}</p>
                  <p className="text-zinc-400 uppercase tracking-wider text-[9px]">Synced</p>
                </div>
                <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-100">
                  <p className="font-black text-lg text-red-600">{menuStatus.failed || 0}</p>
                  <p className="text-zinc-400 uppercase tracking-wider text-[9px]">Failed</p>
                </div>
                <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-100">
                  <p className="font-black text-lg text-zinc-600">{menuStatus.totalMappings || 0}</p>
                  <p className="text-zinc-400 uppercase tracking-wider text-[9px]">Total</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSyncMenu}
              disabled={syncing || saving || !form.menuSyncEnabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync menu now
            </button>
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Canonical webhook payload (order.created)
            </p>
            <pre className="overflow-x-auto rounded-xl bg-white p-3 text-[11px] text-zinc-700 ring-1 ring-zinc-100">
              {CANONICAL_WEBHOOK_EXAMPLE}
            </pre>
            <p className="mt-2 text-xs text-zinc-500">
              Use <code className="text-zinc-700">externalItemId</code> matching your product MongoDB ID.
              Cancellation: set <code className="text-zinc-700">event</code> to <code className="text-zinc-700">order.cancelled</code>.
            </p>
          </div>

          {logs.length > 0 && (
            <div className="rounded-2xl border border-zinc-100 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Recent webhook logs
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {logs.slice(0, 8).map((log) => (
                  <div key={log._id} className="rounded-xl bg-zinc-50 px-3 py-2 text-xs">
                    <span className={`font-bold ${log.status === "error" ? "text-red-600" : log.status === "success" ? "text-emerald-600" : "text-zinc-500"}`}>
                      {log.status}
                    </span>
                    {" · "}
                    {log.event || "—"} {log.platform && `· ${log.platform}`}
                    {log.errorMessage && (
                      <p className="mt-0.5 text-red-500 truncate">{log.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Test connection
            </button>
            <button
              type="submit"
              disabled={saving || testing}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Your Swiggy and Zomato store settings are saved for this restaurant.
        </p>
      </motion.div>
    </div>
  );
}
