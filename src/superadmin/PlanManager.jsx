import { useEffect, useState } from "react";
import { getPlans, createPlan, updatePlan, deletePlan } from "../api/restaurantApi";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Loader2, Check, X, Save } from "lucide-react";

const FEATURE_KEYS = [
  { key: "hr",           label: "HR Management" },
  { key: "inventory",    label: "Inventory" },
  { key: "reports",      label: "Reports" },
  { key: "qrMenu",       label: "QR Menu" },
  { key: "onlineOrders", label: "Online Orders" },
  { key: "kitchenPanel", label: "Kitchen Panel" },
  { key: "waiterPanel",  label: "Waiter Panel" },
  { key: "waiterCall",   label: "Waiter Call" },
  { key: "billRequest",  label: "Bill Request" },
];

const BLANK = {
  name: "", price: "", duration: 30, description: "",
  features: { hr: false, inventory: false, reports: true, qrMenu: true, onlineOrders: false, kitchenPanel: true, waiterPanel: true, waiterCall: true, billRequest: true },
  maxTables: 20, maxProducts: 100, maxStaff: 10,
};

export default function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getPlans().then(({ data }) => setPlans(data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setFeat = (k, v) => setForm((f) => ({ ...f, features: { ...f.features, [k]: v } }));

  const startEdit = (plan) => {
    setForm({ ...BLANK, ...plan });
    setEditId(plan._id);
    setShowForm(true);
  };
  const startNew = () => {
    setForm(BLANK);
    setEditId(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || form.price === "") return toast.error("Name and price required");
    setSaving(true);
    try {
      if (editId) {
        await updatePlan(editId, form);
        toast.success("Plan updated");
      } else {
        await createPlan(form);
        toast.success("Plan created");
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;
    try {
      await deletePlan(id);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
          <p className="text-slate-400 text-sm mt-0.5">Configure pricing tiers for restaurants</p>
        </div>
        <button onClick={startNew}
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {/* Plan Cards */}
      {loading ? (
        <p className="text-slate-400 animate-pulse">Loading plans…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {plans.map((plan) => (
            <div key={plan._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(plan)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(plan._id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-3xl font-bold text-pink-400 mb-1">₹{plan.price}<span className="text-sm text-slate-400 font-normal">/{plan.duration}d</span></p>
              <div className="mt-3 space-y-1.5">
                {FEATURE_KEYS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {plan.features?.[key]
                      ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <X    className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                    <span className={plan.features?.[key] ? "text-slate-300" : "text-slate-600"}>{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs text-center text-slate-400">
                <div><p className="text-white font-medium">{plan.maxTables}</p><p>Tables</p></div>
                <div><p className="text-white font-medium">{plan.maxProducts}</p><p>Products</p></div>
                <div><p className="text-white font-medium">{plan.maxStaff}</p><p>Staff</p></div>
              </div>
            </div>
          ))}
          {plans.length === 0 && <p className="text-slate-500 col-span-3 text-center py-12">No plans yet.</p>}
        </div>
      )}

      {/* Form Panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">{editId ? "Edit Plan" : "New Plan"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-4">
              {[["Plan Name", "name", "text"], ["Price (₹)", "price", "number"], ["Duration (days)", "duration", "number"], ["Description", "description", "text"], ["Max Tables", "maxTables", "number"], ["Max Products", "maxProducts", "number"], ["Max Staff", "maxStaff", "number"]].map(([lbl, k, type]) => (
                <div key={k}>
                  <label className="text-xs text-slate-400 block mb-1">{lbl}</label>
                  <input type={type} value={form[k]} onChange={(e) => set(k, type === "number" ? Number(e.target.value) : e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
              ))}

              <div>
                <label className="text-xs text-slate-400 block mb-2">Included Features</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURE_KEYS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!form.features[key]} onChange={(e) => setFeat(key, e.target.checked)}
                        className="rounded accent-pink-500" />
                      <span className="text-sm text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : "Save Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
