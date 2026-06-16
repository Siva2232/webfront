import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Loader2,
  Save,
  ShieldCheck,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { isCustomerOnlinePaymentEnabled } from "../utils/paymentFeature";
import { useTheme } from "../context/ThemeContext";
import { getCurrentRestaurantId } from "../utils/tenantCache";
import {
  getPaymentConfigAdmin,
  updatePaymentConfig,
  testPaymentConfig,
} from "../api/restaurantApi";

function buildWebhookUrl(restaurantId) {
  const isProd = import.meta.env.PROD;
  const apiBase = isProd
    ? import.meta.env.VITE_API_BASE_URL || "https://backend-res-ikeb.onrender.com/api"
    : import.meta.env.VITE_API_BASE_URL_DEV || "http://localhost:5000/api";
  return `${String(apiBase).replace(/\/$/, "")}/payments/webhook?restaurantId=${encodeURIComponent(restaurantId)}`;
}

export default function PaymentSettingsPage() {
  const { branding, features, featuresReady } = useTheme();
  const restaurantId = getCurrentRestaurantId() || branding?.restaurantId || "";
  const primary = branding?.primaryColor || "#18181b";
  const onlinePaymentEnabled = isCustomerOnlinePaymentEnabled(
    features,
    branding.subscriptionPlan,
    { featuresReady },
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    razorpayEnabled: false,
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayWebhookSecret: "",
  });
  const [hasKeySecret, setHasKeySecret] = useState(false);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    if (!onlinePaymentEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getPaymentConfigAdmin();
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          razorpayEnabled: Boolean(data.razorpayEnabled),
          razorpayKeyId: data.razorpayKeyId || "",
        }));
        setHasKeySecret(Boolean(data.hasKeySecret));
        setHasWebhookSecret(Boolean(data.hasWebhookSecret));
        setWebhookUrl(data.webhookUrl || (restaurantId ? buildWebhookUrl(restaurantId) : ""));
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.message || "Failed to load payment settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onlinePaymentEnabled]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.razorpayEnabled && !form.razorpayKeyId.trim()) {
      toast.error("Razorpay Key ID is required when payments are enabled");
      return;
    }
    if (form.razorpayEnabled && !hasKeySecret && !form.razorpayKeySecret.trim()) {
      toast.error("Razorpay Key Secret is required when payments are enabled");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        razorpayEnabled: form.razorpayEnabled,
        razorpayKeyId: form.razorpayKeyId.trim(),
      };
      if (form.razorpayKeySecret.trim()) {
        payload.razorpayKeySecret = form.razorpayKeySecret.trim();
      }
      if (form.razorpayWebhookSecret.trim()) {
        payload.razorpayWebhookSecret = form.razorpayWebhookSecret.trim();
      }

      const { data } = await updatePaymentConfig(payload);
      const config = data.config || data;
      setHasKeySecret(Boolean(config.hasKeySecret));
      setHasWebhookSecret(Boolean(config.hasWebhookSecret));
      if (config.webhookUrl) setWebhookUrl(config.webhookUrl);
      setForm((prev) => ({
        ...prev,
        razorpayKeySecret: "",
        razorpayWebhookSecret: "",
      }));
      toast.success("Payment settings saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await testPaymentConfig();
      if (data.success) {
        toast.success(data.message || "Razorpay connection successful");
      } else {
        toast.error(data.message || "Connection test failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Connection test failed");
    } finally {
      setTesting(false);
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

  if (!onlinePaymentEnabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-black text-zinc-900">Online payments not enabled</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Turn on <span className="font-semibold">Customer — Pay online</span> in your subscription plan
          or ask your platform admin to enable it under Module Access.
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ backgroundColor: primary }}
          >
            <CreditCard className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">Settings</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-900">Payment Settings</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Connect your Razorpay account so customers can pay online at checkout.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100 sm:p-8"
        >
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
            <div>
              <p className="font-bold text-zinc-900">Enable Razorpay</p>
              <p className="text-xs text-zinc-500">Allow customers to pay online via your Razorpay account</p>
            </div>
            <input
              type="checkbox"
              checked={form.razorpayEnabled}
              onChange={(e) => setForm({ ...form, razorpayEnabled: e.target.checked })}
              className="h-5 w-5 rounded accent-zinc-900"
            />
          </label>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Razorpay Key ID
            </label>
            <input
              type="text"
              value={form.razorpayKeyId}
              onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })}
              placeholder="rzp_live_xxxxx or rzp_test_xxxxx"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Razorpay Key Secret
              {hasKeySecret && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 normal-case tracking-normal">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
            </label>
            <input
              type="password"
              value={form.razorpayKeySecret}
              onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })}
              placeholder={hasKeySecret ? "Leave blank to keep existing secret" : "Enter key secret"}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Webhook Secret
              {hasWebhookSecret && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 normal-case tracking-normal">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
            </label>
            <input
              type="password"
              value={form.razorpayWebhookSecret}
              onChange={(e) => setForm({ ...form, razorpayWebhookSecret: e.target.value })}
              placeholder={hasWebhookSecret ? "Leave blank to keep existing secret" : "From Razorpay dashboard webhook settings"}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
              autoComplete="off"
            />
          </div>

          {webhookUrl && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Webhook URL (add in Razorpay dashboard)
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
              <a
                href="https://dashboard.razorpay.com/app/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Open Razorpay webhooks <ExternalLink className="h-3 w-3" />
              </a>
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
          Secrets are encrypted on the server and never shown again after saving.
        </p>
      </motion.div>
    </div>
  );
}
