import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { getPlans, createPaymentIntent, recordSubscriptionPayment } from "../api/restaurantApi";
import toast from "react-hot-toast";
import {
  CreditCard,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  CalendarDays,
  ArrowRight,
  Lock,
  X,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { motion } from "framer-motion";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Display order + labels for plan.features (mirrors backend PLAN_FEATURE_KEYS + inventory).
 * Keep in sync with backend-res/constants/subscriptionFeatureFlags.js and Restaurant.features.
 */
const PLAN_FEATURES = [
  ["hr", "HR Management"],
  ["reports", "Reports & analytics"],
  ["qrMenu", "QR Menu Suite"],
  ["onlineOrders", "Online Store"],
  ["kitchenPanel", "Kitchen Display"],
  ["waiterPanel", "Waiter Panel"],
  ["waiterCall", "Waiter call alerts"],
  ["billRequest", "Guest bill request"],
  ["accounting", "Accounting"],
  ["hrStaff", "HR staff directory"],
  ["hrAttendance", "HR attendance"],
  ["hrLeaves", "HR leave management"],
  ["reservations", "Table reservations"],
  ["inventory", "Inventory"],
];

function CheckoutForm({ plan, onSucceed, onCancel, primaryColor, restaurantId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const { data } = await createPaymentIntent({
        amount: plan.price,
        currency: "inr",
        orderId: `SUB-${restaurantId}-${Date.now()}`,
        customerDetails: { restaurantId },
      });

      const { clientSecret } = data;

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        setErrorMessage(result.error.message);
        setIsProcessing(false);
      } else {
        if (result.paymentIntent.status === "succeeded") {
          const { data: serverResult } = await recordSubscriptionPayment(restaurantId, {
            planId: plan._id,
            amount: plan.price,
            method: "Stripe",
            transactionId: result.paymentIntent.id,
          });
          onSucceed({
            plan,
            expiry: serverResult.expiry,
            status: serverResult.status,
          });
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Payment processing failed");
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-zinc-200/90 bg-white shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)]"
      >
        <div
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${primaryColor || "#18181b"}, color-mix(in srgb, ${primaryColor || "#18181b"} 70%, white))`,
          }}
        />
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-5 rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>

        <div className="p-7 pt-8">
          <div className="mb-6 flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ring-1 ring-black/5"
              style={{ backgroundColor: primaryColor || "#18181b" }}
            >
              <Lock className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-zinc-900">Secure checkout</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                256-bit encrypted · Stripe
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-zinc-100 bg-gradient-to-br from-zinc-50 to-white p-4 ring-1 ring-zinc-100/80">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Plan</span>
              <span className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-zinc-900">
                {plan.name}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-zinc-100 pt-3">
              <span className="text-sm text-zinc-500">Due today</span>
              <span className="text-3xl font-black tabular-nums tracking-tight text-zinc-900">₹{plan.price}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Card details
              </label>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 transition focus-within:border-zinc-900/20 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/10">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "16px",
                        color: "#18181b",
                        "::placeholder": { color: "#a1a1aa" },
                      },
                      invalid: { color: "#e11d48" },
                    },
                  }}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="flex-[1.35] flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition disabled:opacity-50"
                style={{
                  backgroundColor: primaryColor || "#18181b",
                  boxShadow: `0 12px 28px -8px color-mix(in srgb, ${primaryColor || "#18181b"} 55%, transparent)`,
                }}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 opacity-90" />
                )}
                {isProcessing ? "Processing…" : `Pay ₹${plan.price}`}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SubscriptionPage() {
  const { branding, loadBranding } = useTheme();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    getPlans()
      .then(({ data }) => setPlans(data))
      .finally(() => setLoading(false));
  }, []);

  const handlePaymentSuccess = async (serverData) => {
    setSelectedPlan(null);
    setPaymentResult(serverData);
    await loadBranding(branding.restaurantId);
    setIsRenewing(false);
    toast.success("Payment verified! Your account is now active.", {
      duration: 6000,
      icon: "🚀",
      style: { borderRadius: "16px", background: "#18181b", color: "#fff" },
    });
  };

  const currentPlan = branding.subscriptionPlan;
  const daysLeft = branding.subscriptionExpiry
    ? Math.ceil((new Date(branding.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const planDurationDays = Number(currentPlan?.duration) > 0 ? Number(currentPlan.duration) : 30;
  const renewalAddsDays = planDurationDays + Math.max(0, daysLeft ?? 0);
  const showRenewButton =
    !!currentPlan &&
    daysLeft !== null &&
    daysLeft >= 0 &&
    daysLeft <= 5 &&
    branding.subscriptionStatus !== "suspended";

  const primary = branding.primaryColor || "#18181b";

  const handleQuickRenew = async () => {
    // Renewal must be paid: open Stripe modal for the CURRENT plan.
    if (!currentPlan?._id) {
      toast.error("No plan assigned. Please choose a plan below.");
      return;
    }
    setIsRenewing(true);
    setSelectedPlan(currentPlan);
  };

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* ambient */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(24,24,27,0.06),transparent)]"
        aria-hidden
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {selectedPlan && (
          <Elements stripe={stripePromise}>
            <CheckoutForm
              plan={selectedPlan}
              restaurantId={branding.restaurantId}
              primaryColor={branding.primaryColor}
              onSucceed={(serverData) => handlePaymentSuccess(serverData)}
              onCancel={() => {
                setSelectedPlan(null);
                setIsRenewing(false);
              }}
            />
          </Elements>
        )}

        {paymentResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-zinc-950/85 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-emerald-200/60 bg-white p-8 text-center shadow-[0_24px_80px_-12px_rgba(16,185,129,0.35)] sm:p-10"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-9 w-9 text-white" strokeWidth={2.25} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">You&apos;re all set</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Your subscription is{" "}
                <span className="font-bold text-emerald-600">active</span>. New plan features are unlocked.
              </p>

              <div className="mt-8 space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-5 text-left ring-1 ring-zinc-100/80">
                {[
                  ["Status", <span key="s" className="font-bold text-emerald-600">Active</span>],
                  ["Plan", paymentResult.plan?.name || "—"],
                  ["Paid", `₹${paymentResult.plan?.price ?? "—"}`],
                  [
                    "Renews on",
                    paymentResult.expiry
                      ? new Date(paymentResult.expiry).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—",
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">{k}</span>
                    <span className="font-semibold text-zinc-900">{v}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPaymentResult(null)}
                className="mt-8 w-full rounded-2xl bg-zinc-900 py-4 text-sm font-black uppercase tracking-[0.15em] text-white shadow-xl shadow-zinc-900/20 transition hover:bg-zinc-800"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-xl shadow-zinc-900/25 ring-1 ring-white/10">
              <Sparkles className="h-7 w-7" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">Billing</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">Subscription</h1>
              <p className="mt-1.5 max-w-lg text-sm text-zinc-500">
                Compare plans, upgrade securely, and keep your venue running on the right tier.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Current plan */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative mb-10 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.15)] ring-1 ring-zinc-100 sm:p-8"
        >
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{
              background: `linear-gradient(90deg, ${primary}, color-mix(in srgb, ${primary} 40%, white))`,
            }}
          />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Current plan</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900">
                  {currentPlan?.name || "Trial"}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                    branding.subscriptionStatus === "active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : branding.subscriptionStatus === "suspended"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600"
                  }`}
                >
                  {branding.subscriptionStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                {daysLeft !== null
                  ? daysLeft > 0
                    ? `${daysLeft} days until renewal`
                    : "Plan expired — choose a plan to continue"
                  : "Trial active — upgrade when you’re ready for production"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 ring-1 ring-zinc-100/60">
              <CalendarDays className="h-5 w-5 text-zinc-400" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Renewal / end</p>
                <p className="text-sm font-bold text-zinc-800">
                  {branding.subscriptionExpiry
                    ? new Date(branding.subscriptionExpiry).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "Not set"}
                </p>
              </div>
            </div>
          </div>

          {showRenewButton && (
            <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-zinc-600">
                Your plan ends soon. Renew now to avoid the interruption of services.
                {/* <span className="font-black text-zinc-900">{renewalAddsDays} days</span>. */}
              </p>
              <button
                type="button"
                disabled={isRenewing}
                onClick={handleQuickRenew}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-zinc-900/15 transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {isRenewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Renew
              </button>
            </div>
          )}
        </motion.div>

        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-black tracking-tight text-zinc-900">Available plans</h2>
          {!loading && plans.length > 0 && (
            <span className="hidden text-xs font-medium text-zinc-400 sm:inline">{plans.length} options</span>
          )}
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[420px] animate-pulse rounded-3xl bg-gradient-to-b from-zinc-100 to-zinc-50/80 ring-1 ring-zinc-100"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan, index) => {
              const currentPlanId =
                typeof currentPlan === "object" && currentPlan !== null
                  ? currentPlan._id?.toString()
                  : currentPlan?.toString();
              const isCurrent = currentPlanId === plan._id?.toString();
              const isFeatured = plans.length === 3 && index === 1;

              return (
                <motion.article
                  key={plan._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white transition-[box-shadow,transform] duration-300 ${
                    isCurrent
                      ? "border-zinc-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-2 ring-zinc-900/10"
                      : isFeatured
                        ? "border-zinc-300 shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-200/80 md:-translate-y-1 md:scale-[1.02]"
                        : "border-zinc-200/90 shadow-lg shadow-zinc-900/5 hover:border-zinc-300 hover:shadow-xl"
                  }`}
                  style={isCurrent ? { borderColor: primary } : undefined}
                >
                  {isFeatured && !isCurrent && (
                    <div className="absolute right-4 top-4 rounded-full bg-zinc-900 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                      Popular
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200/80">
                      <CheckCircle2 className="h-3 w-3" />
                      Current
                    </div>
                  )}

                  <div className="border-b border-zinc-100 bg-gradient-to-br from-zinc-50/90 to-white px-6 pb-5 pt-6">
                    <h3 className="text-lg font-black tracking-tight text-zinc-900">{plan.name}</h3>
                    <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-zinc-500">
                      {plan.description || "Full-stack tools for your restaurant operations."}
                    </p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-4xl font-black tabular-nums tracking-tight text-zinc-900">₹{plan.price}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">/{plan.duration}d</span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-6 py-5">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Includes</p>
                    <ul className="mb-1 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-x-3">
                      {PLAN_FEATURES.map(([key, label]) => {
                        const on = plan.features?.[key];
                        return (
                          <li key={key} className="flex min-w-0 items-start gap-2.5">
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                                on ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-300"
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </span>
                            <span
                              className={`min-w-0 text-xs leading-snug ${on ? "font-semibold text-zinc-800" : "text-zinc-400 line-through decoration-zinc-300"}`}
                            >
                              {label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <button
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      disabled={isCurrent}
                      className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[11px] font-black uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                      style={
                        !isCurrent
                          ? {
                              backgroundColor: primary,
                              color: "#fff",
                              boxShadow: `0 14px 32px -10px color-mix(in srgb, ${primary} 50%, transparent)`,
                            }
                          : {}
                      }
                    >
                      {isCurrent ? "Your plan" : (
                        <>
                          Upgrade
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-zinc-200 bg-gradient-to-br from-zinc-50/90 to-white px-5 py-8 text-center ring-1 ring-zinc-100/80 sm:px-8"
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </div>
          <h4 className="text-sm font-black tracking-tight text-zinc-900">Secure billing</h4>
          <p className="mt-2 max-w-lg text-xs leading-relaxed text-zinc-500">
            Payments run through Stripe. Subscriptions renew on schedule. If access was suspended manually, contact support
            after upgrading to re-enable your account.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
