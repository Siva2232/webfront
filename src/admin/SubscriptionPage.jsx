import { useEffect, useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { getPlans, createPaymentIntent, recordSubscriptionPayment } from "../api/restaurantApi";
import toast from "react-hot-toast";
import { CreditCard, CheckCircle2, Loader2, Zap, ShieldCheck, X } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe once at module level using the env variable — never null on click
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// -- Checkout Form Component --
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
      // 1. Create Payment Intent
      const { data } = await createPaymentIntent({
        amount: plan.price,
        currency: "inr",
        orderId: `SUB-${restaurantId}-${Date.now()}`,
        customerDetails: { restaurantId }
      });

      const { clientSecret } = data;

      // 2. Confirm Payment
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
          // 3. Record in DB
          const { data: serverResult } = await recordSubscriptionPayment(restaurantId, {
            planId: plan._id,
            amount: plan.price,
            method: "Stripe",
            transactionId: result.paymentIntent.id
          });
          onSucceed({ 
            plan, 
            expiry: serverResult.expiry, 
            status: serverResult.status 
          });
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Payment processing failed");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: primaryColor }} />
        
        <h2 className="text-2xl font-black text-slate-900 mb-2">Secure Upgrade</h2>
        <p className="text-slate-500 text-sm mb-6 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> 256-bit Encrypted Transaction
        </p>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
           <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plan Selection</span>
              <span className="text-xs font-black text-slate-900 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">{plan.name}</span>
           </div>
           <div className="flex justify-between items-end">
              <span className="text-slate-500 text-sm">Amount due today</span>
              <span className="text-2xl font-black text-slate-900">₹{plan.price}</span>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-pink-500/20 transition-all">
            <CardElement options={{
              style: {
                base: { fontSize: '16px', color: '#1e293b', '::placeholder': { color: '#94a3b8' } },
                invalid: { color: '#ef4444' }
              }
            }} />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-3">
             <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition disabled:opacity-50"
             >
                Cancel
             </button>
             <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="flex-[2] py-3 text-white rounded-2xl font-bold text-sm shadow-lg shadow-pink-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
             >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {isProcessing ? "Processing..." : `Pay ₹${plan.price}`}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { branding, loadBranding } = useTheme();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null); // holds server data for success UI

  useEffect(() => {
    getPlans().then(({ data }) => setPlans(data)).finally(() => setLoading(false));
  }, []);

  const handlePaymentSuccess = async (serverData) => {
    setSelectedPlan(null);
    setPaymentResult(serverData); // show success UI immediately with server data

    // Re-fetch branding from backend so the status banner + plan card update live
    await loadBranding(branding.restaurantId);

    toast.success("Payment verified! Your account is now active.", {
      duration: 6000,
      icon: '🚀',
      style: { borderRadius: '16px', background: '#333', color: '#fff' }
    });
  };

  const currentPlan = branding.subscriptionPlan;
  const daysLeft = branding.subscriptionExpiry
    ? Math.ceil((new Date(branding.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Stripe Modal Overlay */}
      {selectedPlan && (
        <Elements stripe={stripePromise}>
          <CheckoutForm 
            plan={selectedPlan} 
            restaurantId={branding.restaurantId}
            primaryColor={branding.primaryColor}
            onSucceed={(serverData) => handlePaymentSuccess(serverData)}
            onCancel={() => setSelectedPlan(null)}
          />
        </Elements>
      )}

      {/* Success Celebration Overlay */}
      {paymentResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 overflow-hidden">
           <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full text-center shadow-[0_0_100px_rgba(16,185,129,0.25)] border-4 border-emerald-500/20 relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/40">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-4xl font-black text-slate-900 mb-3 mt-4">Payment Confirmed!</h2>
              <p className="text-slate-500 text-base mb-8">
                Your subscription is now <span className="text-emerald-600 font-black">active</span>. All features from your new plan are unlocked.
              </p>

              <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 flex flex-col gap-3 text-left">
                 <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase text-xs tracking-wide">Status</span>
                    <span className="text-emerald-600 font-black uppercase text-xs bg-emerald-100 px-3 py-1 rounded-full">Active</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase text-xs tracking-wide">Plan</span>
                    <span className="text-slate-900 font-black text-sm">{paymentResult.plan?.name || "—"}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase text-xs tracking-wide">Amount Paid</span>
                    <span className="text-slate-900 font-bold text-sm">₹{paymentResult.plan?.price || "—"}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase text-xs tracking-wide">Next Renewal</span>
                    <span className="text-slate-900 font-bold text-sm">
                      {paymentResult.expiry
                        ? new Date(paymentResult.expiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </span>
                 </div>
              </div>

              <button
                onClick={() => setPaymentResult(null)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition shadow-xl"
              >
                Continue to Dashboard
              </button>
           </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Subscription</h1>
      <p className="text-slate-500 text-sm mb-6">Manage your plan and features</p>

      {/* Current Plan Banner */}
      <div className="rounded-2xl p-5 mb-8 border flex flex-wrap gap-4 items-center justify-between"
        style={{ borderColor: branding.primaryColor + "40", background: branding.primaryColor + "10" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Current Status</p>
          <div className="flex items-center gap-2">
             <h2 className="text-xl font-bold text-slate-900">{currentPlan?.name || "Trial"}</h2>
             <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                branding.subscriptionStatus === 'active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                branding.subscriptionStatus === 'suspended' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                'bg-slate-500/10 text-slate-600 border border-slate-500/20'
             }`}>
                {branding.subscriptionStatus}
             </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 lowercase">
            {daysLeft !== null ? (
               daysLeft > 0 ? `${daysLeft} days remaining until renewal` : "your plan has expired"
            ) : "Trial node active — upgrade to production plan"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 animate-pulse" style={{ color: branding.primaryColor }} />
          <span className="text-sm font-medium text-slate-700">
            {branding.subscriptionExpiry
              ? `End Date: ${new Date(branding.subscriptionExpiry).toLocaleDateString()}`
              : "No Expiry Set"}
          </span>
        </div>
      </div>

      {/* Available Plans */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Available Plans</h2>
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
           {[1,2,3].map(i => <div key={i} className="h-96 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            // currentPlan may be a populated object {_id, name} or a bare ObjectId string
            const currentPlanId = typeof currentPlan === "object" && currentPlan !== null
              ? currentPlan._id?.toString()
              : currentPlan?.toString();
            const isCurrent = currentPlanId === plan._id?.toString();
            return (
              <div key={plan._id}
                className={`rounded-3xl border p-6 flex flex-col transition relative overflow-hidden ${isCurrent ? "border-2 shadow-xl ring-4 ring-pink-500/5" : "border-slate-200 hover:border-slate-300"}`}
                style={isCurrent ? { borderColor: branding.primaryColor } : {}}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0 p-3">
                     <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                )}
                
                <h3 className="text-lg font-bold text-slate-900 mb-0.5">{plan.name}</h3>
                <p className="text-slate-500 text-xs mb-4">{plan.description || 'Premium business suite'}</p>
                
                <div className="mb-6">
                   <p className="text-4xl font-black text-slate-900">₹{plan.price}</p>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">/{plan.duration} days cycle</p>
                </div>

                <div className="space-y-3 flex-1 mb-8">
                  {Object.entries({
                    hr:           "HR Management",
                    accounting:   "Accounting",
                    inventory:    "Inventory",
                    reports:      "Reports",
                    qrMenu:       "QR Menu Suite",
                    onlineOrders: "Online Store",
                    kitchenPanel: "Kitchen Display",
                    waiterPanel:  "Waiter Panel",
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className={`p-0.5 rounded-full ${plan.features?.[key] ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 text-slate-300"}`}>
                         <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-medium ${plan.features?.[key] ? "text-slate-700 font-bold" : "text-slate-400 font-normal line-through opacity-50"}`}>{label}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedPlan(plan)}
                  disabled={isCurrent}
                  className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-3 disabled:bg-slate-100 disabled:text-slate-400"
                  style={!isCurrent ? { backgroundColor: branding.primaryColor, color: "#fff", boxShadow: `0 10px 15px -3px ${branding.primaryColor}30` } : {}}
                >
                  {isCurrent ? "Active Selection" : "Proceed to Upgrade"}
                  {!isCurrent && <Zap className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-12 p-8 border border-dashed border-slate-300 rounded-[2.5rem] bg-slate-50/50 flex flex-col items-center text-center">
         <ShieldCheck className="w-10 h-10 text-slate-400 mb-4" />
         <h4 className="font-bold text-slate-800">Billing Support</h4>
         <p className="text-xs text-slate-500 mt-2 max-w-md">
            All payments are processed securely via Stripe. Your subscription will renew automatically. 
            If your account was manually suspended, please contact support after payment to reactivate access.
         </p>
      </div>
    </div>
  );
}
