import { useTheme } from "../context/ThemeContext";
import { CreditCard, TrendingUp, AlertTriangle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * SubscriptionWidget
 * Shows current plan, expiry, and an upgrade prompt inside the sidebar.
 */
export default function SubscriptionWidget({ subscriptionStatus, subscriptionExpiry, planName }) {
  const { branding } = useTheme();
  const navigate = useNavigate();

  // planName may be a string (legacy) or a populated plan object
  const resolvedPlanName = (typeof planName === "object" && planName !== null)
    ? planName.name
    : (planName || null);

  const resolvedStatus = subscriptionStatus || branding.subscriptionStatus || "trial";
  const resolvedExpiry = subscriptionExpiry || branding.subscriptionExpiry || null;
  const resolvedPlan   = resolvedPlanName   || (typeof branding.subscriptionPlan === "object" ? branding.subscriptionPlan?.name : null);

  const daysLeft = resolvedExpiry
    ? Math.ceil((new Date(resolvedExpiry) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const effectiveStatus = resolvedStatus;

  const isExpired   = effectiveStatus === "expired";
  const isExpiring  = daysLeft !== null && daysLeft <= 7 && !isExpired;
  const isTrial     = effectiveStatus === "trial";

  const colorClass = isExpired

  return (
    <div className={`mx-3 mb-3 p-3 rounded-xl border ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="w-4 h-4 text-black-400" />
        <p className="text-xs font-semibold  truncate">{resolvedPlan || "No Plan"}</p>
        <span
          className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
            effectiveStatus === "active"    ? "bg-emerald-500/20 text-emerald-400" :
            effectiveStatus === "trial"     ? "bg-amber-500/20   text-amber-400"   :
            effectiveStatus === "expired"   ? "bg-red-500/20     text-red-400"     :
            "bg-slate-600/30 text-slate-400"
          }`}
        >
          {effectiveStatus}
        </span>
      </div>

      {daysLeft !== null && (
        <div className="flex items-center gap-1.5 text-xs text-black-400 mb-2">
          {(isExpired || isExpiring) && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          <span>
            {isExpired
              ? "Subscription expired"
              : `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
          </span>
        </div>
      )}

      {(isExpired || isExpiring || isTrial) && (
        <button
          onClick={() => navigate("/admin/subscription")}
          style={{ backgroundColor: branding.primaryColor }}
          className="w-full text-white text-xs py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Upgrade Plan
        </button>
      )}
    </div>
  );
}
