import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Loader2,
  Save,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getPlatformPaymentSettings,
  updatePlatformPaymentSettings,
  testPlatformPaymentSettings,
} from "../api/restaurantApi";

export default function SuperAdminPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [credentialSource, setCredentialSource] = useState("none");

  const [form, setForm] = useState({
    razorpayEnabled: false,
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayWebhookSecret: "",
  });
  const [hasKeySecret, setHasKeySecret] = useState(false);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getPlatformPaymentSettings();
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          razorpayEnabled: Boolean(data.razorpayEnabled),
          razorpayKeyId: data.razorpayKeyId || "",
        }));
        setHasKeySecret(Boolean(data.hasKeySecret));
        setHasWebhookSecret(Boolean(data.hasWebhookSecret));
        setCredentialSource(data.credentialSource || "none");
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || "Failed to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.razorpayEnabled && !form.razorpayKeyId.trim()) {
      toast.error("Razorpay Key ID is required");
      return;
    }
    if (form.razorpayEnabled && !hasKeySecret && !form.razorpayKeySecret.trim()) {
      toast.error("Razorpay Key Secret is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        razorpayEnabled: form.razorpayEnabled,
        razorpayKeyId: form.razorpayKeyId.trim(),
      };
      if (form.razorpayKeySecret.trim()) payload.razorpayKeySecret = form.razorpayKeySecret.trim();
      if (form.razorpayWebhookSecret.trim()) payload.razorpayWebhookSecret = form.razorpayWebhookSecret.trim();

      const { data } = await updatePlatformPaymentSettings(payload);
      const config = data.config || data;
      setHasKeySecret(Boolean(config.hasKeySecret));
      setHasWebhookSecret(Boolean(config.hasWebhookSecret));
      setCredentialSource(config.credentialSource || "database");
      setForm((prev) => ({ ...prev, razorpayKeySecret: "", razorpayWebhookSecret: "" }));
      toast.success("Platform Razorpay settings saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await testPlatformPaymentSettings();
      if (data.success) toast.success(data.message || "Connection successful");
      else toast.error(data.message || "Test failed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pink-600/20 border border-pink-500/30">
            <Wallet className="h-7 w-7 text-pink-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Platform billing</p>
            <h1 className="mt-1 text-3xl font-black text-white tracking-tight">Payment Settings</h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Restaurant owners pay subscriptions to this Razorpay account. Funds are credited to your platform wallet.
            </p>
          </div>
        </div>

        {credentialSource === "env" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <p className="text-xs text-amber-200/90">
              Currently using <strong>.env</strong> credentials. Save settings here to store keys in the database instead.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8"
        >
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div>
              <p className="font-bold text-white">Enable platform Razorpay</p>
              <p className="text-xs text-slate-500">Required for restaurant subscription payments</p>
            </div>
            <input
              type="checkbox"
              checked={form.razorpayEnabled}
              onChange={(e) => setForm({ ...form, razorpayEnabled: e.target.checked })}
              className="h-5 w-5 rounded accent-pink-500"
            />
          </label>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Razorpay Key ID
            </label>
            <input
              type="text"
              value={form.razorpayKeyId}
              onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })}
              placeholder="rzp_live_xxxxx"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-white outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Razorpay Key Secret
              {hasKeySecret && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-400 normal-case tracking-normal">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
            </label>
            <input
              type="password"
              value={form.razorpayKeySecret}
              onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })}
              placeholder={hasKeySecret ? "Leave blank to keep existing" : "Enter key secret"}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-white outline-none focus:border-pink-500/50"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Webhook Secret (optional)
              {hasWebhookSecret && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-400 normal-case tracking-normal">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
            </label>
            <input
              type="password"
              value={form.razorpayWebhookSecret}
              onChange={(e) => setForm({ ...form, razorpayWebhookSecret: e.target.value })}
              placeholder="For subscription webhook verification"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-white outline-none focus:border-pink-500/50"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 py-3.5 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Test connection
            </button>
            <button
              type="submit"
              disabled={saving || testing}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-pink-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 hover:bg-pink-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <CreditCard className="h-5 w-5 text-slate-500" />
          <p className="text-xs text-slate-500">
            Each restaurant admin pays via <strong className="text-slate-400">Subscription</strong> in their panel — payments route to this account.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
