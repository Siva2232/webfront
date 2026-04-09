import { useEffect, useState, useRef } from "react";
import {
  getRestaurants, createRestaurant, updateBranding,
  updateFeatures, assignPlan, updateRestaurant, deleteRestaurant, getPlans,
} from "../api/restaurantApi";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";
import {
  Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp,
  Upload, Eye, Save, X, Check, Ban, RefreshCw, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Quick Action Modal ──────────────────────────────────────────────────────
const ActionModal = ({ open, onClose, title, message, onConfirm, type = "danger", loading = false }) => {
  if (!open) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} 
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              type === "danger" ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
            }`}>
              {type === "danger" ? <Ban size={24} /> : <RefreshCw size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="text-sm text-slate-400">{message}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-sm font-bold">
              Cancel
            </button>
            <button 
              onClick={onConfirm} 
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition flex items-center justify-center gap-2 ${
                type === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Action"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

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
  subscriptionPlan: "", // Selected plan ID
  subscriptionStatus: "trial",
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
const RestaurantDrawer = ({ open, onClose, initial, plans = [], onSaved }) => {
  const [form, setForm] = useState(BLANK_FORM);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // general | branding | features
  const { previewBranding, resetPreview } = useTheme();
  const fileRef = useRef();
  const isEdit = !!initial;

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            ...BLANK_FORM,
            ...initial,
            subscriptionPlan: initial.subscriptionPlan?._id || initial.subscriptionPlan || "",
            logoBase64: "",
          }
        : BLANK_FORM);
      setLogoPreview(initial?.logo || "");
      setPreview(false);
      setActiveTab("general");
    }
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setColor = (k, v) => { set(k, v); if (preview) previewBranding({ [k]: v }); };
  const setFeature = (k, v) => setForm((f) => ({ ...f, features: { ...f.features, [k]: v } }));

  const handlePlanSelect = (planId) => {
    set("subscriptionPlan", planId);
    if (planId) {
      set("subscriptionStatus", "active");
    } else {
      set("subscriptionStatus", "trial");
    }
    const plan = plans.find(p => p._id === planId);
    if (plan && plan.features) {
      setForm(f => ({ ...f, features: { ...f.features, ...plan.features } }));
    }
  };

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
        await updateBranding(initial.restaurantId, {
          primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
          accentColor: form.accentColor, theme: form.theme, fontFamily: form.fontFamily,
          logoBase64: form.logoBase64 || undefined,
        });
        await updateFeatures(initial.restaurantId, form.features);
        await updateRestaurant(initial.restaurantId, {
          name: form.name,
          ownerEmail: form.ownerEmail, ownerPhone: form.ownerPhone,
          address: form.address,
          subscriptionStatus: form.subscriptionStatus,
        });
        if (form.subscriptionPlan && form.subscriptionStatus === "active") {
          await assignPlan(initial.restaurantId, { planId: form.subscriptionPlan });
        }
        toast.success("Restaurant updated");
      } else {
        const { data } = await createRestaurant(form);
        if (data.ownerCreated) {
          toast.success(`Restaurant created!\nOwner login: ${data.ownerEmail}`, { duration: 6000 });
        } else {
          toast.success("Restaurant created!");
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" 
          onClick={onClose} 
        />

        {/* Panel */}
        <motion.div 
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-[#0F172A] border-l border-slate-800 shadow-2xl flex flex-col h-full"
        >
          {/* Header */}
          <div className="px-8 py-8 border-b border-slate-800/50 bg-[#0F172A]/50 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {isEdit ? "Update Infrastructure" : "Initialize New Node"}
                </h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                  Tenant Configuration Protocol
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={toggleLivePreview}
                  className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${
                    preview 
                      ? "bg-pink-600 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]" 
                      : "border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}>
                  <Eye className="w-3.5 h-3.5" />
                  {preview ? "Monitoring Live" : "Boot Live Preview"}
                </button>
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Premium Tabs */}
            <div className="flex gap-2 p-1 bg-slate-900/50 rounded-2xl border border-slate-800/50">
              {[
                { id: "general", label: "Core Data", icon: Check },
                { id: "branding", label: "Visual Identity", icon: Eye },
                { id: "features", label: "Module Access", icon: Save }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab.id 
                    ? "bg-slate-800 text-pink-500 shadow-inner" 
                    : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar">
            {activeTab === "general" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-pink-500 rounded-full" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Administrative Registry</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {!isEdit && (
                      <div className="col-span-2 group">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">System Identifier</label>
                        <input value={form.restaurantId} onChange={(e) => set("restaurantId", e.target.value.toUpperCase())}
                          placeholder="RESTO-X"
                          className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all placeholder:text-slate-700 font-mono" />
                      </div>
                    )}
                    <div className="col-span-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Restaurant Name</label>
                       <input value={form.name} onChange={(e) => set("name", e.target.value)}
                        placeholder="Grand Imperial"
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Owner Name</label>
                       <input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Access Email</label>
                       <input type="email" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" />
                    </div>
                  </div>
                </section>

                <section>
                   <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Subscription Engine</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="relative group">
                      <select
                        value={form.subscriptionPlan}
                        onChange={(e) => handlePlanSelect(e.target.value)}
                        className="w-full appearance-none bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all cursor-pointer"
                      >
                        <option value="">Sandbox (Free Trial)</option>
                        {plans.map(p => (
                          <option key={p._id} value={p._id}>{p.name} — Premium Tier</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={18} />
                    </div>

                    {isEdit && (
                      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3 block">Operational Security Status</label>
                        <div className="grid grid-cols-2 gap-2">
                          {["active", "suspended"].map((st) => (
                            <button
                              key={st}
                              onClick={() => set("subscriptionStatus", st)}
                              className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                form.subscriptionStatus === st
                                ? (st === 'active' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-rose-500/10 border-rose-500 text-rose-500')
                                : 'border-slate-800 text-slate-600 hover:border-slate-700'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "branding" && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Global Asset Control</h3>
                  </div>
                  <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-[2rem] flex flex-col items-center">
                    <div className="relative group mb-6">
                       <div className="w-32 h-32 rounded-[2.5rem] bg-slate-950 border-2 border-slate-800 flex items-center justify-center overflow-hidden shadow-2xl relative">
                          {logoPreview ? (
                            <img src={logoPreview} className="w-full h-full object-contain p-4" alt="preview" />
                          ) : (
                            <Upload className="w-8 h-8 text-slate-700 group-hover:text-pink-500 transition-colors" />
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer" onClick={() => fileRef.current.click()}>
                            <Plus className="text-white w-8 h-8" />
                          </div>
                       </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">SVG / PNG / JPG • Max 2MB</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Color Spectrum</h3>
                  </div>
                  <div className="grid gap-4">
                    <ColorRow label="Primary Drive"   name="primaryColor"   value={form.primaryColor}   onChange={setColor} />
                    <ColorRow label="Secondary Axis" name="secondaryColor" value={form.secondaryColor} onChange={setColor} />
                    <ColorRow label="Accent Pulse"    name="accentColor"    value={form.accentColor}    onChange={setColor} />
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "features" && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                 <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-pink-500 rounded-full" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Functional Authorization</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {FEATURE_KEYS.map(({ key, label }) => (
                      <div key={key} 
                        onClick={() => setFeature(key, !form.features[key])}
                        className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                          form.features[key] 
                          ? "bg-pink-600/5 border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.05)]" 
                          : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                        }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            form.features[key] ? "bg-pink-500/20 text-pink-500" : "bg-slate-800 text-slate-500"
                          }`}>
                            <Check size={18} />
                          </div>
                          <div>
                            <p className={`text-sm font-black tracking-tight transition-all ${form.features[key] ? "text-white" : "text-slate-500"}`}>{label}</p>
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Core Module</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          form.features[key] ? "border-pink-500 bg-pink-500" : "border-slate-700"
                        }`}>
                          {form.features[key] && <Check className="text-white" size={12} strokeWidth={4} />}
                        </div>
                      </div>
                    ))}
                  </div>
                 </section>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-800/50 flex gap-4 bg-[#0F172A]">
            <button onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl border border-slate-700 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all">
              Abort Changes
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_25px_rgba(236,72,153,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-3">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Deploying..." : "Finalize Deployment"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
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
  
  // Quick Action States
  const [actionModal, setActionModal] = useState({ open: false, type: "danger", restaurantId: null, status: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([getRestaurants(), getPlans()]);
      setRestaurants(r.data);
      setPlans(Array.isArray(p.data) ? p.data : []);
    } catch (e) {
      console.error("Load error:", e);
      toast.error("Failed to load data");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleQuickAction = async () => {
    setActionLoading(true);
    try {
      await updateRestaurant(actionModal.restaurantId, { subscriptionStatus: actionModal.status });
      toast.success(`Restaurant ${actionModal.status === "suspended" ? "Suspended" : "Renewed"}`);
      load();
      setActionModal({ open: false, type: "danger", restaurantId: null, status: "" });
    } catch (err) {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete restaurant ${id}? This cannot be undone.`)) return;
    try {
      await deleteRestaurant(id);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error("Delete failed"); }
  };

  return (
    <div className="p-10 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1.5 h-6 bg-pink-500 rounded-full" />
            <h1 className="text-3xl font-black text-white tracking-tight">Restaurant Fleet</h1>
          </div>
          <p className="text-slate-400 font-medium text-sm ml-4">{restaurants.length} total nodes active</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { setEditing(null); setDrawerOpen(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] text-white text-sm font-black px-6 py-3 rounded-2xl transition-all"
        >
          <Plus className="w-4 h-4" /> Deploy New Node
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
          <span className="font-bold uppercase tracking-widest text-xs">Synchronizing Registry...</span>
        </div>
      ) : (
        <div className="overflow-hidden bg-slate-900/40 border border-slate-800 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                {["ID", "Restaurant System", "Health Status", "Assigned Plan", "Expiry Date", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {restaurants.map((r) => (
                <motion.tr 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  key={r.restaurantId} 
                  className="hover:bg-slate-800/20 transition-all border-l-2 border-transparent hover:border-pink-500/50"
                >
                  <td className="px-6 py-5">
                    <span className="px-3 py-1.5 bg-slate-800/50 rounded-lg text-pink-400 text-xs font-black border border-slate-700/50 tracking-wider">
                      {r.restaurantId}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        {r.logo ? (
                          <img src={r.logo} alt={r.name} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-800" />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-lg shadow-pink-500/10"
                            style={{ background: `linear-gradient(135deg, ${r.primaryColor || "#f72585"}, ${r.accentColor || "#7209b7"})` }}>
                            {r.name?.charAt(0)}
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${r.subscriptionStatus === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      </div>
                      <div>
                        <p className="text-white font-black text-base leading-tight">{r.name}</p>
                        <p className="text-slate-400 text-xs font-bold mt-0.5">{r.ownerName || "No Head Assigned"}</p>
                        <p className="text-slate-500 text-[10px] font-medium tracking-tight mt-0.5">{r.ownerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5"><StatusBadge status={r.subscriptionStatus} /></td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-200 font-black text-sm">{r.subscriptionPlan?.name || "VOID"}</span>
                      {r.subscriptionPlan && (
                        <span className="text-[10px] text-pink-500 font-black uppercase tracking-widest italic opacity-70">Paid Node</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-slate-300 font-bold text-sm">
                        {r.subscriptionExpiry ? new Date(r.subscriptionExpiry).toLocaleDateString('en-GB') : "NO EXPIRY"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">System Lockdown</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5">
                      {/* Renewal Button (Emerald) */}
                      {r.subscriptionStatus !== "active" && (
                        <button 
                          onClick={() => setActionModal({ open: true, type: "success", restaurantId: r.restaurantId, status: "active" })}
                          title="Restore Access / Renew"
                          className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Suspend Button (Rose) */}
                      {r.subscriptionStatus === "active" && (
                        <button 
                          onClick={() => setActionModal({ open: true, type: "danger", restaurantId: r.restaurantId, status: "suspended" })}
                          title="Suspend Infrastructure"
                          className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-lg hover:shadow-rose-500/20"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <div className="w-px h-6 bg-slate-800 mx-1" />

                      <button onClick={() => { setEditing(r); setDrawerOpen(true); }}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(r.restaurantId)}
                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {restaurants.length === 0 && (
            <div className="text-center py-24 text-slate-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-black text-xs uppercase tracking-[.3em]">No Infrastructure Detected</p>
            </div>
          )}
        </div>
      )}

      {/* Control Drawer */}
      <RestaurantDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initial={editing}
        plans={plans}
        onSaved={load}
      />

      {/* Quick Status Modal */}
      <ActionModal 
        open={actionModal.open}
        onClose={() => setActionModal({ ...actionModal, open: false })}
        title={actionModal.status === "suspended" ? "Terminate Access?" : "Restore Connectivity?"}
        message={actionModal.status === "suspended" 
          ? "This will immediately block all owner and staff access to this restaurant's dashboard." 
          : "This will re-enable all dashboard features and login access for this restaurant."}
        type={actionModal.type}
        loading={actionLoading}
        onConfirm={handleQuickAction}
      />
    </div>
  );
}
