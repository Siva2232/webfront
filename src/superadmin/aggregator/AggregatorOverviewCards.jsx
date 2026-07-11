import {
  Building2,
  Plug,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  ShoppingBag,
  Truck,
} from "lucide-react";

const CARDS = [
  { key: "totalRestaurants", label: "Total Restaurants", icon: Building2, color: "text-slate-300" },
  { key: "featureEnabledCount", label: "Module Enabled", icon: ShoppingBag, color: "text-violet-400" },
  { key: "integrationEnabledCount", label: "Integration Active", icon: Plug, color: "text-pink-400" },
  { key: "connectedCount", label: "Connected", icon: CheckCircle2, color: "text-emerald-400" },
  { key: "errorCount", label: "Errors", icon: AlertTriangle, color: "text-rose-400" },
  { key: "disconnectedCount", label: "Disconnected", icon: WifiOff, color: "text-slate-400" },
  { key: "swiggyEnabledCount", label: "Swiggy On", icon: Truck, color: "text-orange-400" },
  { key: "zomatoEnabledCount", label: "Zomato On", icon: Truck, color: "text-red-400" },
  { key: "ordersIngestedLast24h", label: "Orders (24h)", icon: ShoppingBag, color: "text-emerald-400" },
  { key: "webhookErrorsLast24h", label: "Webhook Errors (24h)", icon: AlertTriangle, color: "text-amber-400" },
];

export default function AggregatorOverviewCards({ overview }) {
  if (!overview) return null;

  const swiggy = overview.platformSplit?.swiggy || 0;
  const zomato = overview.platformSplit?.zomato || 0;
  const total = swiggy + zomato || 1;
  const swiggyPct = Math.round((swiggy / total) * 100);
  const zomatoPct = 100 - swiggyPct;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
        <span className="text-slate-400">Platform middleware: </span>
        <span className={overview.platformConfigured ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
          {overview.platformConfigured
            ? `Configured${overview.platformProviderName ? ` (${overview.platformProviderName})` : ""}`
            : "Not configured — add API keys below"}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CARDS.map(({ key, label, icon: Icon, color }) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black text-white">{overview[key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
          Platform split (webhooks 24h)
        </p>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
          <div
            className="bg-orange-500 transition-all"
            style={{ width: `${swiggyPct}%` }}
            title={`Swiggy ${swiggy}`}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${zomatoPct}%` }}
            title={`Zomato ${zomato}`}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>Swiggy {swiggy} ({swiggyPct}%)</span>
          <span>Zomato {zomato} ({zomatoPct}%)</span>
        </div>
      </div>
    </div>
  );
}
