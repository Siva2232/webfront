import { useEffect, useState } from "react";
import { Loader2, Save, ShieldCheck, CheckCircle2, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import {
  getPlatformAggregatorSettings,
  updatePlatformAggregatorSettings,
  testPlatformAggregatorSettings,
} from "../../api/superAdminAggregatorApi";

export default function PlatformAggregatorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [credentialSource, setCredentialSource] = useState("none");

  const [form, setForm] = useState({
    enabled: false,
    providerType: "third_party",
    providerName: "",
    apiKey: "",
    apiSecret: "",
    webhookSecret: "",
    menuPushUrl: "",
    statusPushUrl: "",
  });
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasApiSecret, setHasApiSecret] = useState(false);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getPlatformAggregatorSettings();
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          enabled: Boolean(data.enabled),
          providerType: data.providerType || "third_party",
          providerName: data.providerName || "",
          menuPushUrl: data.menuPushUrl || "",
          statusPushUrl: data.statusPushUrl || "",
        }));
        setHasApiKey(Boolean(data.hasApiKey));
        setHasApiSecret(Boolean(data.hasApiSecret));
        setHasWebhookSecret(Boolean(data.hasWebhookSecret));
        setCredentialSource(data.credentialSource || "none");
        setConfigured(Boolean(data.configured));
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || "Failed to load platform settings");
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
    if (form.enabled && !hasApiSecret && !form.apiSecret.trim()) {
      toast.error("API secret is required when platform integration is enabled");
      return;
    }
    if (form.enabled && !hasApiKey && !form.apiKey.trim()) {
      toast.error("API key is required when platform integration is enabled");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        enabled: form.enabled,
        providerType: form.providerType,
        providerName: form.providerName.trim(),
        menuPushUrl: form.menuPushUrl.trim(),
        statusPushUrl: form.statusPushUrl.trim(),
      };
      if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();
      if (form.apiSecret.trim()) payload.apiSecret = form.apiSecret.trim();
      if (form.webhookSecret.trim()) payload.webhookSecret = form.webhookSecret.trim();

      const { data } = await updatePlatformAggregatorSettings(payload);
      const config = data.config || data;
      setHasApiKey(Boolean(config.hasApiKey));
      setHasApiSecret(Boolean(config.hasApiSecret));
      setHasWebhookSecret(Boolean(config.hasWebhookSecret));
      setCredentialSource(config.credentialSource || "database");
      setConfigured(Boolean(config.configured));
      setForm((prev) => ({
        ...prev,
        apiKey: "",
        apiSecret: "",
        webhookSecret: "",
      }));
      toast.success("Platform middleware credentials saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save platform settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await testPlatformAggregatorSettings();
      if (data.success) toast.success(data.message || "Connection test successful");
      else toast.error(data.message || "Connection test failed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
          <KeyRound size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            Third-Party Middleware Credentials
          </h2>
          <p className="text-xs text-slate-400">
            API keys from UrbanPiper, PetPooja, DotPe, etc. Restaurants only fill their store IDs.
          </p>
        </div>
        {configured ? (
          <span className="ml-auto text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
            Configured
          </span>
        ) : (
          <span className="ml-auto text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
            Not configured
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="p-4 space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div>
            <p className="font-bold text-white text-sm">Enable platform integration</p>
            <p className="text-xs text-slate-500">Allow restaurants to connect Swiggy / Zomato</p>
          </div>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="h-5 w-5 accent-pink-500"
          />
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Provider name
            </label>
            <input
              type="text"
              value={form.providerName}
              onChange={(e) => setForm({ ...form, providerName: e.target.value })}
              placeholder="UrbanPiper, PetPooja, DotPe..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Provider type
            </label>
            <select
              value={form.providerType}
              disabled
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-slate-400"
            >
              <option value="third_party">Third-party middleware</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            API key {hasApiKey && <span className="text-emerald-400 normal-case">(saved)</span>}
          </label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder={hasApiKey ? "Leave blank to keep existing" : "From middleware provider"}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            API secret {hasApiSecret && <span className="text-emerald-400 normal-case">(saved)</span>}
          </label>
          <input
            type="password"
            value={form.apiSecret}
            onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
            placeholder={hasApiSecret ? "Leave blank to keep existing" : "From middleware provider"}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Webhook secret {hasWebhookSecret && <span className="text-emerald-400 normal-case">(saved)</span>}
          </label>
          <input
            type="password"
            value={form.webhookSecret}
            onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
            placeholder={hasWebhookSecret ? "Leave blank to keep existing" : "HMAC verification secret"}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white"
            autoComplete="off"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Menu push URL (optional)
            </label>
            <input
              type="url"
              value={form.menuPushUrl}
              onChange={(e) => setForm({ ...form, menuPushUrl: e.target.value })}
              placeholder="https://api.provider.com/menu/push"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Status push URL (optional)
            </label>
            <input
              type="url"
              value={form.statusPushUrl}
              onChange={(e) => setForm({ ...form, statusPushUrl: e.target.value })}
              placeholder="https://api.provider.com/order/status"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Credential source: <span className="text-slate-300 font-semibold">{credentialSource}</span>.
          Secrets are encrypted and never shown again after saving.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Test connection
          </button>
          <button
            type="submit"
            disabled={saving || testing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-pink-600 py-3 text-sm font-bold text-white hover:bg-pink-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save credentials
          </button>
        </div>
      </form>
    </div>
  );
}
