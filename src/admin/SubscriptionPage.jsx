import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { getPlans, assignPlan } from "../api/restaurantApi";
import toast from "react-hot-toast";
import { CreditCard, CheckCircle2, Loader2, Zap } from "lucide-react";

export default function SubscriptionPage() {
  const { branding } = useTheme();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    getPlans().then(({ data }) => setPlans(data)).finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan) => {
    if (!branding.restaurantId) return toast.error("Restaurant not identified");
    setAssigning(plan._id);
    try {
      await assignPlan(branding.restaurantId, { planId: plan._id });
      toast.success(`Upgraded to ${plan.name}! Contact admin to confirm payment.`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Upgrade request failed");
    } finally {
      setAssigning(null);
    }
  };

  const currentPlan = branding.subscriptionPlan;
  const daysLeft = branding.subscriptionExpiry
    ? Math.ceil((new Date(branding.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Subscription</h1>
      <p className="text-slate-500 text-sm mb-6">Manage your plan and features</p>

      {/* Current Plan Banner */}
      <div className="rounded-2xl p-5 mb-8 border flex flex-wrap gap-4 items-center justify-between"
        style={{ borderColor: branding.primaryColor + "40", background: branding.primaryColor + "10" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Current Plan</p>
          <h2 className="text-xl font-bold text-slate-900">{currentPlan?.name || "Trial"}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Status: <span className="font-medium capitalize">{branding.subscriptionStatus}</span>
            {daysLeft !== null && ` · ${daysLeft > 0 ? `${daysLeft} days remaining` : "Expired"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5" style={{ color: branding.primaryColor }} />
          <span className="text-sm font-medium text-slate-700">
            {branding.subscriptionExpiry
              ? `Renews: ${new Date(branding.subscriptionExpiry).toLocaleDateString()}`
              : "Lifetime access (trial)"}
          </span>
        </div>
      </div>

      {/* Available Plans */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Available Plans</h2>
      {loading ? (
        <p className="text-slate-400 animate-pulse">Loading plans…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan?._id === plan._id || currentPlan === plan._id;
            return (
              <div key={plan._id}
                className={`rounded-2xl border p-5 flex flex-col transition ${isCurrent ? "border-2 shadow-lg" : "border-slate-200 hover:border-slate-300"}`}
                style={isCurrent ? { borderColor: branding.primaryColor } : {}}
              >
                {isCurrent && (
                  <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full mb-3 self-start"
                    style={{ backgroundColor: branding.primaryColor + "20", color: branding.primaryColor }}>
                    Current Plan
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900 mb-0.5">{plan.name}</h3>
                <p className="text-slate-500 text-sm mb-3">{plan.description}</p>
                <p className="text-3xl font-black text-slate-900 mb-4">
                  ₹{plan.price}
                  <span className="text-sm font-normal text-slate-400">/{plan.duration}d</span>
                </p>
                <ul className="space-y-1.5 flex-1 mb-5">
                  {Object.entries({
                    hr:           "HR Management",
                    accounting:   "Accounting",
                    inventory:    "Inventory",
                    reports:      "Reports",
                    qrMenu:       "QR Menu",
                    onlineOrders: "Online Orders",
                    kitchenPanel: "Kitchen Panel",
                    waiterPanel:  "Waiter Panel",
                  }).map(([key, label]) => (
                    <li key={key} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${plan.features?.[key] ? "text-emerald-500" : "text-slate-300"}`} />
                      <span className={plan.features?.[key] ? "text-slate-700" : "text-slate-400 line-through"}>{label}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrent || !!assigning}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                  style={!isCurrent ? { backgroundColor: branding.primaryColor, color: "#fff" } : {}}
                >
                  {assigning === plan._id && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCurrent ? "Active" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
