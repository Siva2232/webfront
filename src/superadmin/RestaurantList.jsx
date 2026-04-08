import { useEffect, useState, useRef } from "react";
import {
  getRestaurants, createRestaurant, updateBranding,
  updateFeatures, assignPlan, deleteRestaurant, getPlans,
} from "../api/restaurantApi";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";
import {
  Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp,
  Upload, Eye, Save, X, Check,
} from "lucide-react";

// ── Feature keys with labels ────────────────────────────────────────────────
const FEATURE_KEYS = [
  { key: "hr",           label: "HR Management" },
  { key: "accounting",   label: "Accounting" },
  { key: "inventory",    label: "Inventory" },
  { key: "reports",      label: "Reports" },
  { key: "qrMenu",       label: "QR Menu" },
  { key: "onlineOrders", label: "Online Orders" },
  { key: "kitchenPanel", label: "Kitchen Panel" },
  { key: "waiterPanel",  label: "Waiter Panel" },
];

const BLANK_FORM = {
  restaurantId: "", name: "", ownerName: "", ownerEmail: "", ownerPassword: "", ownerPhone: "", address: "",
  primaryColor: "#f72585", secondaryColor: "#0f172a", accentColor: "#7209b7",
  theme: "light", fontFamily: "Inter",
  features: { hr: true, accounting: true, inventory: false, reports: true, qrMenu: true, onlineOrders: false, kitchenPanel: true, waiterPanel: true },
  logoBase64: "",
};

// ── Color Picker Row ─────────────────────────────────────────────────────────
const ColorRow = ({ label, name, value, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <label className="text-sm text-slate-300 w-36">{label}</label>
    <div className="flex items-center gap-2 flex-1">
      <input type="color" value={value} onChange={(e) => onChange(name, e.target.value)}
        className="w-10 h-9 rounded-lg border border-slate-600 bg-transparent cursor-pointer" />
      <input type="text" value={value} onChange={(e) => onChange(name, e.target.value)}
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
    </div>
  </div>
);

// ── Create / Edit Drawer ─────────────────────────────────────────────────────
const RestaurantDrawer = ({ open, onClose, initial, plans, onSaved }) => {
  const [form, setForm] = useState(BLANK_FORM);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const { previewBranding, resetPreview } = useTheme();
  const fileRef = useRef();
  const isEdit = !!initial;

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...BLANK_FORM, ...initial, logoBase64: "" } : BLANK_FORM);
      setLogoPreview(initial?.logo || "");
      setPreview(false);
    }
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setColor = (k, v) => { set(k, v); if (preview) previewBranding({ [k]: v }); };
  const setFeature = (k, v) => setForm((f) => ({ ...f, features: { ...f.features, [k]: v } }));

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      set("logoBase64", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleLivePreview = () => {
    if (!preview) {
      previewBranding({ primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, accentColor: form.accentColor, theme: form.theme, fontFamily: form.fontFamily });
      setPreview(true);
    } else {
      resetPreview();
      setPreview(false);
    }
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Restaurant name is required");
    setSaving(true);
    try {
      if (isEdit) {
        // Update branding
        await updateBranding(initial.restaurantId, {
          primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
          accentColor: form.accentColor, theme: form.theme, fontFamily: form.fontFamily,
          logoBase64: form.logoBase64 || undefined,
        });
        // Update features
        await updateFeatures(initial.restaurantId, form.features);
        toast.success("Restaurant updated");
      } else {
        const { data } = await createRestaurant(form);
        if (data.ownerCreated) {
          toast.success(
            `Restaurant created!\nOwner login: ${data.ownerEmail}`,
            { duration: 6000 }
          );
        } else {
          toast.success("Restaurant created! (No owner account — email/password not provided)");
        }
      }
      resetPreview();
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-semibold text-white">{isEdit ? "Edit Restaurant" : "New Restaurant"}</h2>
          <div className="flex items-center gap-2">
            <button onClick={toggleLivePreview}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${preview ? "bg-pink-600 border-pink-600 text-white" : "border-slate-600 text-slate-400 hover:text-white"}`}>
              <Eye className="w-3.5 h-3.5" />
              {preview ? "Previewing" : "Live Preview"}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="space-y-3">
              {!isEdit && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Restaurant ID (auto if blank)</label>
                  <input value={form.restaurantId} onChange={(e) => set("restaurantId", e.target.value.toUpperCase())}
                    placeholder="RESTO001"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
              )}
              {[["Restaurant Name *", "name", "text"], ["Owner Name", "ownerName", "text"], ["Owner Email", "ownerEmail", "email"], ["Owner Phone", "ownerPhone", "tel"], ["Address", "address", "text"]].map(([lbl, key, type]) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1">{lbl}</label>
                  <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
              ))}
              {!isEdit && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Owner Password <span className="text-pink-400">(required to create login)</span>
                  </label>
                  <input
                    type="password"
                    value={form.ownerPassword}
                    onChange={(e) => set("ownerPassword", e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">The restaurant owner will use their email + this password to log in to the admin panel.</p>
                </div>
              )}
            </div>
          </section>

          {/* Logo */}
          <section>
            <h3 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3">Logo</h3>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="w-16 h-16 rounded-xl object-contain bg-slate-800 border border-slate-700" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 border-dashed flex items-center justify-center text-slate-500">
                  <Upload className="w-6 h-6" />
                </div>
              )}
              <button onClick={() => fileRef.current.click()}
                className="text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Logo
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            </div>
          </section>

          {/* Branding Colors */}
          <section>
            <h3 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3">Branding Colors</h3>
            <div className="space-y-3">
              <ColorRow label="Primary Color"   name="primaryColor"   value={form.primaryColor}   onChange={setColor} />
              <ColorRow label="Secondary Color" name="secondaryColor" value={form.secondaryColor} onChange={setColor} />
              <ColorRow label="Accent Color"    name="accentColor"    value={form.accentColor}    onChange={setColor} />
            </div>
            <div className="mt-3 flex gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Theme</label>
                <select value={form.theme} onChange={(e) => setColor("theme", e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">Font Family</label>
                <select value={form.fontFamily} onChange={(e) => setColor("fontFamily", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
                  {["Inter", "Poppins", "Roboto", "Nunito", "Lato", "Montserrat"].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Features */}
          <section>
            <h3 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3">Feature Flags</h3>
            <div className="grid grid-cols-2 gap-2">
              {FEATURE_KEYS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => setFeature(key, !form.features[key])}
                    className={`w-9 h-5 rounded-full transition-colors relative ${form.features[key] ? "bg-pink-600" : "bg-slate-700"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.features[key] ? "translate-x-4" : ""}`} />
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white">{label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 sticky bottom-0 bg-slate-900 flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white text-sm font-medium transition flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    trial:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
    expired:   "bg-red-500/10 text-red-400 border-red-500/20",
    suspended: "bg-slate-600/30 text-slate-400 border-slate-600/30",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${map[status] || map.expired}`}>
      {status}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function RestaurantList() {
  const [restaurants, setRestaurants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([getRestaurants(), getPlans()]);
      setRestaurants(r.data);
      setPlans(p.data);
    } catch (e) { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete restaurant ${id}? This cannot be undone.`)) return;
    try {
      await deleteRestaurant(id);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error("Delete failed"); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurants</h1>
          <p className="text-slate-400 text-sm mt-0.5">{restaurants.length} tenants registered</p>
        </div>
        <button onClick={() => { setEditing(null); setDrawerOpen(true); }}
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
          <Plus className="w-4 h-4" /> New Restaurant
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                {["ID", "Restaurant", "Status", "Plan", "Expiry", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {restaurants.map((r) => (
                <tr key={r.restaurantId} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3 font-mono text-pink-400 text-xs">{r.restaurantId}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.logo ? (
                        <img src={r.logo} alt={r.name} className="w-8 h-8 rounded-lg object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: r.primaryColor || "#f72585" }}>
                          {r.name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{r.name}</p>
                        <p className="text-slate-400 text-xs">{r.ownerName || "—"}</p>
                        <p className="text-slate-500 text-xs">{r.ownerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.subscriptionStatus} /></td>
                  <td className="px-4 py-3 text-slate-300">{r.subscriptionPlan?.name || <span className="text-slate-500">None</span>}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {r.subscriptionExpiry ? new Date(r.subscriptionExpiry).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditing(r); setDrawerOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(r.restaurantId)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {restaurants.length === 0 && (
            <div className="text-center py-16 text-slate-500">No restaurants yet. Create one to get started.</div>
          )}
        </div>
      )}

      <RestaurantDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initial={editing}
        plans={plans}
        onSaved={load}
      />
    </div>
  );
}
