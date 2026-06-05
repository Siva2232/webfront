import React from "react";
import { motion as Motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Calendar,
  Clock,
  Users,
  Timer,
  Crown,
  TrendingDown,
  Activity,
} from "lucide-react";
import { formatDurationMinutes } from "./operationsMetrics";

const KPI_STYLE = {
  emerald: { iconWrap: "bg-emerald-100 text-emerald-600", iconGlow: "text-emerald-600/10" },
  zinc: { iconWrap: "bg-zinc-100 text-zinc-700", iconGlow: "text-zinc-400/10" },
  rose: { iconWrap: "bg-rose-100 text-rose-600", iconGlow: "text-rose-400/10" },
  amber: { iconWrap: "bg-amber-100 text-amber-700", iconGlow: "text-amber-400/10" },
  violet: { iconWrap: "bg-violet-100 text-violet-700", iconGlow: "text-violet-400/10" },
  sky: { iconWrap: "bg-sky-100 text-sky-700", iconGlow: "text-sky-400/10" },
};

function fmtINR(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;
}

function InsightCard({ label, value, sub, icon: Icon, styleKey }) {
  const style = KPI_STYLE[styleKey] || KPI_STYLE.zinc;
  return (
    <Motion.div
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80"
    >
      <div className={`absolute -right-4 -top-4 opacity-[0.07] ${style.iconGlow}`}>
        <Icon size={88} strokeWidth={1} />
      </div>
      <div
        className={`relative z-10 mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${style.iconWrap}`}
      >
        <Icon size={22} />
      </div>
      <p className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="relative z-10 mt-1 text-xl font-black tabular-nums text-zinc-900">{value}</p>
      {sub ? <p className="relative z-10 mt-1 text-[11px] text-zinc-500">{sub}</p> : null}
    </Motion.div>
  );
}

export default function OperationsInsightsSection({ summary, hourlyBreakdown, loading, primary = "#18181b" }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    );
  }

  const peakHour = summary?.busiestHour?.hour;

  const cards = [
    {
      label: "Busiest day",
      value: summary?.busiestDay?.label || "—",
      sub: summary?.busiestDay
        ? `${summary.busiestDay.orders} orders · ${fmtINR(summary.busiestDay.revenue)}`
        : "No orders in range",
      icon: Calendar,
      styleKey: "emerald",
    },
    {
      label: "Busiest hour",
      value: summary?.busiestHour?.label || "—",
      sub: summary?.busiestHour
        ? `${summary.busiestHour.orders} orders · ${fmtINR(summary.busiestHour.revenue)}`
        : "No hourly data",
      icon: Clock,
      styleKey: "zinc",
    },
    {
      label: "Avg customer spend",
      value: summary?.uniqueCustomers > 0 ? fmtINR(summary.avgCustomerSpend) : "—",
      sub:
        summary?.uniqueCustomers > 0
          ? `${summary.uniqueCustomers} unique customers`
          : "No paying customers",
      icon: Users,
      styleKey: "amber",
    },
    {
      label: "Avg dining duration",
      value: formatDurationMinutes(summary?.avgDiningDurationMinutes),
      sub:
        summary?.diningSampleSize > 0
          ? `From ${summary.diningSampleSize} dine-in orders`
          : "No dine-in completions",
      icon: Timer,
      styleKey: "sky",
    },
    {
      label: "Highest order customer",
      value: summary?.topCustomer?.name || "—",
      sub: summary?.topCustomer
        ? `${summary.topCustomer.orders} orders · ${fmtINR(summary.topCustomer.totalSpend)}`
        : "No customer data",
      icon: Crown,
      styleKey: "violet",
    },
    {
      label: "Quietest day",
      value: summary?.quietestDay?.label || "—",
      sub: summary?.quietestDay
        ? `${summary.quietestDay.orders} orders · ${fmtINR(summary.quietestDay.revenue)}`
        : "No orders in range",
      icon: TrendingDown,
      styleKey: "rose",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <InsightCard key={c.label} {...c} />
        ))}
      </div>

      <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100/80 md:p-8">
        <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-zinc-900">
          <Activity className="text-zinc-500" size={18} />
          Orders by hour
        </h3>
        <div className="h-[260px]">
          {hourlyBreakdown?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9 }}
                  interval={2}
                />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: "#fafafa" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
                  }}
                  formatter={(v, name) => [name === "orders" ? v : fmtINR(v), name === "orders" ? "Orders" : "Revenue"]}
                />
                <Bar dataKey="orders" name="orders" radius={[4, 4, 0, 0]}>
                  {hourlyBreakdown.map((entry) => (
                    <Cell
                      key={entry.hour}
                      fill={entry.hour === peakHour ? primary : "#d4d4d8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-zinc-400">
              No hourly breakdown for this range.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
