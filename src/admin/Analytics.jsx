import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Legend,
} from "recharts";
import {
  TrendingUp,
  IndianRupee,
  Activity,
  Wallet,
  Search,
  Zap,
  ShieldCheck,
  ArrowUpRight,
  Layers,
  Calendar,
  Percent,
  Crown,
  ShoppingBag,
  Award,
  Sparkles,
  BookOpen,
  Users,
  Banknote,
  Clock,
  ArrowRight,
  TrendingDown,
  ArrowLeftRight,
} from "lucide-react";
import { format, startOfMonth, subDays, eachDayOfInterval } from "date-fns";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrderContext";
import { useTheme } from "../context/ThemeContext";
import accApi from "../api/accApi";
import { getAllStaff, getAttendance, getLeaves, getPayrolls } from "../api/hrApi";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const PIE_COLORS = ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8"];

/** Tailwind requires full class names — no dynamic `bg-${color}-100` */
const KPI_STYLE = {
  emerald: { iconWrap: "bg-emerald-100 text-emerald-600", iconGlow: "text-emerald-600/10" },
  zinc: { iconWrap: "bg-zinc-100 text-zinc-700", iconGlow: "text-zinc-400/10" },
  rose: { iconWrap: "bg-rose-100 text-rose-600", iconGlow: "text-rose-400/10" },
  amber: { iconWrap: "bg-amber-100 text-amber-700", iconGlow: "text-amber-400/10" },
};

function fmtINR(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;
}

export default function Analytics() {
  const { products = [] } = useProducts();
  const { orders = [] } = useOrders();
  const { features, featuresReady, branding } = useTheme();
  const primary = branding?.primaryColor || "#18181b";

  const [timeframe, setTimeframe] = useState("Weekly");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  /* ── Feature gates (match AdminLayout / subscription flags) ── */
  const showAccounting = featuresReady && features.accounting !== false;
  const showHr =
    featuresReady &&
    (features.hr !== false ||
      features.hrStaff !== false ||
      features.hrAttendance !== false ||
      features.hrLeaves !== false);

  const showHrStaff = features.hrStaff !== false;
  const showHrAttendance = features.hrAttendance !== false;
  const showHrLeaves = features.hrLeaves !== false;
  const showHrPayroll = features.hr !== false;

  /* ── Accounting API (ledger-backed, range-aware) ── */
  const [accData, setAccData] = useState(null);
  const [accLoading, setAccLoading] = useState(false);
  const [accRange, setAccRange] = useState("mtd"); // mtd | 30d | 90d

  const accDateBounds = useMemo(() => {
    const end = new Date();
    const endStr = format(end, "yyyy-MM-dd");
    if (accRange === "30d") {
      return { start: format(subDays(end, 29), "yyyy-MM-dd"), end: endStr, label: "Last 30 days" };
    }
    if (accRange === "90d") {
      return { start: format(subDays(end, 89), "yyyy-MM-dd"), end: endStr, label: "Last 90 days" };
    }
    return {
      start: format(startOfMonth(end), "yyyy-MM-dd"),
      end: endStr,
      label: "Month to date",
    };
  }, [accRange]);

  useEffect(() => {
    if (!showAccounting) {
      setAccData(null);
      return;
    }
    let cancelled = false;
    setAccLoading(true);
    const { start, end } = accDateBounds;
    accApi
      .getReports({ startDate: start, endDate: end })
      .then((res) => {
        const reportData = res.data?.status === "success" ? res.data.data : res.data;
        if (!cancelled) setAccData(reportData);
      })
      .catch(() => {
        if (!cancelled) setAccData(null);
      })
      .finally(() => {
        if (!cancelled) setAccLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showAccounting, accDateBounds.start, accDateBounds.end]);

  const accSummary = accData?.summary || {};
  const expensePieData = useMemo(() => {
    if (!accData?.expenseByLedger) return [];
    return Object.entries(accData.expenseByLedger)
      .map(([name, value]) => ({ name, value: Number(value) || 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [accData]);

  const incomeBarData = useMemo(() => {
    if (!accData?.incomeByLedger) return [];
    return Object.entries(accData.incomeByLedger)
      .map(([name, value]) => ({ name, value: Number(value) || 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [accData]);

  const accChartSorted = useMemo(() => {
    const arr = accData?.chartData || [];
    return [...arr]
      .filter((d) => d && d.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((d) => ({
        ...d,
        dateLabel: format(new Date(d.date), "d MMM"),
        income: Number(d.income) || 0,
        expense: Number(d.expense) || 0,
      }));
  }, [accData]);

  const accLiquidity = useMemo(() => {
    const c = Number(accSummary.cashInHand) || 0;
    const b = Number(accSummary.bankBalance) || 0;
    return { total: c + b, cash: c, bank: b };
  }, [accSummary.cashInHand, accSummary.bankBalance]);

  /* ── HR insights (time-aware; no KPI tiles) ── */
  const [hrPeriod, setHrPeriod] = useState("week"); // "week" | "month"
  const [hrLoading, setHrLoading] = useState(false);
  const [hrRecentStaff, setHrRecentStaff] = useState([]);
  const [hrInsight, setHrInsight] = useState({
    headcount: 0,
    deptBreakdown: [],
    attendanceTrend: [],
    leavePending: [],
    leaveByStatus: { pending: 0, approved: 0, rejected: 0 },
    payrollPaid: 0,
    payrollPending: 0,
  });

  useEffect(() => {
    if (!showHr) {
      setHrRecentStaff([]);
      setHrInsight({
        headcount: 0,
        deptBreakdown: [],
        attendanceTrend: [],
        leavePending: [],
        leaveByStatus: { pending: 0, approved: 0, rejected: 0 },
        payrollPaid: 0,
        payrollPending: 0,
      });
      return;
    }

    let cancelled = false;
    setHrLoading(true);

    const parseAttendanceRecords = (payload) => {
      const d = payload?.data;
      return Array.isArray(d) ? d : d?.records || d?.attendance || [];
    };

    (async () => {
      try {
        let staffList = [];
        if (showHrStaff) {
          const r = await getAllStaff({ limit: 300 });
          const d = r.data;
          staffList = Array.isArray(d) ? d : d?.staff || [];
        }

        const deptMap = {};
        staffList.forEach((s) => {
          const dep = (s.department || "General").trim() || "General";
          deptMap[dep] = (deptMap[dep] || 0) + 1;
        });
        const deptBreakdown = Object.entries(deptMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);

        let attendanceTrend = [];
        if (showHrAttendance) {
          if (hrPeriod === "month") {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            const r = await getAttendance({ month, year, limit: 4000 });
            const records = parseAttendanceRecords(r);
            const byDay = {};
            records.forEach((rec) => {
              const dk = format(new Date(rec.date), "yyyy-MM-dd");
              if (!byDay[dk]) byDay[dk] = { present: 0, absent: 0 };
              if (rec.status === "present") byDay[dk].present += 1;
              else if (rec.status === "absent") byDay[dk].absent += 1;
            });
            attendanceTrend = Object.keys(byDay)
              .sort()
              .map((dk) => ({
                label: format(new Date(dk + "T12:00:00"), "d MMM"),
                present: byDay[dk].present,
                absent: byDay[dk].absent,
              }));
          } else {
            const end = new Date();
            const start = subDays(end, 6);
            const days = eachDayOfInterval({ start, end });
            const results = await Promise.all(
              days.map((d) => getAttendance({ date: format(d, "yyyy-MM-dd"), limit: 600 })),
            );
            attendanceTrend = days.map((d, i) => {
              const raw = parseAttendanceRecords(results[i]);
              const present = raw.filter((x) => x.status === "present").length;
              const absent = raw.filter((x) => x.status === "absent").length;
              return {
                label: format(d, "EEE d"),
                present,
                absent,
              };
            });
          }
        }

        let leavePending = [];
        let leaveByStatus = { pending: 0, approved: 0, rejected: 0 };
        if (showHrLeaves) {
          const r = await getLeaves({ limit: 120 });
          const leaves = r.data?.leaves || [];
          leaves.forEach((lv) => {
            const st = (lv.status || "").toLowerCase();
            if (st === "pending") leaveByStatus.pending += 1;
            else if (st === "approved") leaveByStatus.approved += 1;
            else if (st === "rejected") leaveByStatus.rejected += 1;
          });
          leavePending = leaves.filter((l) => (l.status || "").toLowerCase() === "pending").slice(0, 6);
        }

        let payrollPaid = 0;
        let payrollPending = 0;
        if (showHrPayroll) {
          const now = new Date();
          const r = await getPayrolls({ month: now.getMonth() + 1, year: now.getFullYear() });
          const payrolls = Array.isArray(r.data) ? r.data : r.data?.payrolls || [];
          payrollPaid = payrolls.filter((p) => p.status === "paid").length;
          payrollPending = payrolls.filter((p) => p.status === "pending").length;
        }

        if (cancelled) return;
        setHrInsight({
          headcount: staffList.length,
          deptBreakdown,
          attendanceTrend,
          leavePending,
          leaveByStatus,
          payrollPaid,
          payrollPending,
        });
        setHrRecentStaff(staffList.slice(0, 10));
      } catch {
        if (!cancelled) {
          setHrInsight({
            headcount: 0,
            deptBreakdown: [],
            attendanceTrend: [],
            leavePending: [],
            leaveByStatus: { pending: 0, approved: 0, rejected: 0 },
            payrollPaid: 0,
            payrollPending: 0,
          });
        }
      } finally {
        if (!cancelled) setHrLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showHr, showHrStaff, showHrAttendance, showHrLeaves, showHrPayroll, hrPeriod]);

  const topByRevenue = useMemo(() => {
    const map = {};
    orders.forEach((order) => {
      order.items?.forEach((it) => {
        if (!map[it.name]) {
          map[it.name] = { name: it.name, count: 0, revenue: 0, price: it.price || 0 };
        }
        map[it.name].count += it.qty;
        map[it.name].revenue += (it.price || 0) * it.qty;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [orders]);

  const bestSellersByVolume = useMemo(() => {
    const map = {};
    orders.forEach((order) => {
      order.items?.forEach((it) => {
        if (!map[it.name]) {
          map[it.name] = { name: it.name, qty: 0 };
        }
        map[it.name].qty += it.qty;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  const categoryRevenue = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      o.items?.forEach((item) => {
        const cat = item.category || "Uncategorized";
        map[cat] = (map[cat] || 0) + (item.price || 0) * item.qty;
      });
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [orders]);

  const engine = useMemo(() => {
    const filtered = products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === "All" ? true : statusFilter === "Live" ? p.isAvailable : !p.isAvailable;
      return matchSearch && matchStatus;
    });

    const inventoryValue = filtered.reduce(
      (acc, p) => acc + (Number(p.price) || 0) * (p.stock || 1),
      0,
    );
    const multiplier = { Daily: 0.2, Weekly: 1, Monthly: 4.3, Yearly: 52 }[timeframe];
    const estRevenue = inventoryValue * multiplier;
    const taxLiability = estRevenue * 0.18;
    const opsCosts = estRevenue * 0.12;
    const netProfit = estRevenue - taxLiability - opsCosts;
    const profitMargin = estRevenue > 0 ? (netProfit / estRevenue) * 100 : 0;

    const liveCount = filtered.filter((p) => p.isAvailable).length;
    const outCount = filtered.length - liveCount;
    const pieData = [
      { name: "Active Stock", value: liveCount, color: "#18181b" },
      { name: "Out of Stock", value: outCount, color: "#f43f5e" },
    ];

    const timeLabels = {
      Daily: ["Morning", "Noon", "Evening", "Night"],
      Weekly: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      Monthly: ["Week 1", "Week 2", "Week 3", "Week 4"],
      Yearly: ["Q1", "Q2", "Q3", "Q4"],
    }[timeframe];

    const salesProjectionData = timeLabels.map((label, idx) => {
      const isFuture = idx > timeLabels.length / 2;
      const baseVal = estRevenue / timeLabels.length;
      return {
        name: label,
        totalSales: isFuture ? null : Math.floor(baseVal * (0.8 + Math.random() * 0.4)),
        futureSales: !isFuture ? null : Math.floor(baseVal * (1.1 + Math.random() * 0.5)),
      };
    });

    return {
      filtered,
      inventoryValue,
      estRevenue,
      taxLiability,
      netProfit,
      opsCosts,
      profitMargin,
      salesProjectionData,
      pieData,
    };
  }, [products, timeframe, searchTerm, statusFilter, dateRange]);

  const handleExport = (format) => {
    const data = engine.filtered.map((p) => ({
      Name: p.name,
      Price: p.price,
      GST: (p.price * 0.18).toFixed(2),
      Status: p.isAvailable ? "Live" : "Stocked",
    }));
    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Financial_Audit");
      XLSX.writeFile(wb, `Audit_${timeframe}.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.text("Fiscal Audit Report", 14, 20);
      doc.autoTable({
        head: [["Product", "Price", "Tax"]],
        body: data.map((o) => [o.Name, o.Price, o.GST]),
      });
      doc.save("Report.pdf");
    }
  };

  const financeKpis = [
    { label: "Net Profit", val: engine.netProfit, icon: Wallet, key: "emerald", suffix: null },
    { label: "Gross Forecast", val: engine.estRevenue, icon: Zap, key: "zinc", suffix: null },
    { label: "Tax Liability", val: engine.taxLiability, icon: ShieldCheck, key: "rose", suffix: null },
    { label: "Profit Margin", val: engine.profitMargin, icon: Percent, key: "amber", suffix: "%" },
  ];

  return (
    <div className="min-h-full bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-12 font-sans text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/20">
              <TrendingUp size={22} strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Insights</p>
              <h1 className="text-xl font-black tracking-tight text-zinc-900 md:text-2xl">Analytics</h1>
              <p className="text-[11px] text-zinc-500">Operations, sales, and module KPIs in one view</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-[11px] outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-900/30 focus:bg-white focus:ring-2 sm:w-48"
                placeholder="Search catalog…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5">
              <Calendar size={12} className="text-zinc-500" />
              <input
                type="date"
                className="w-[108px] bg-transparent text-[10px] font-bold outline-none"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <span className="text-zinc-300">–</span>
              <input
                type="date"
                className="w-[108px] bg-transparent text-[10px] font-bold outline-none"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="min-w-[100px] cursor-pointer rounded-xl border border-zinc-200 bg-zinc-900 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-white outline-none"
            >
              {["Daily", "Weekly", "Monthly", "Yearly"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 pt-8 md:space-y-14 md:px-8">
        {/* ── Operations / inventory snapshot ── */}
        <section>
          <h2 className="mb-6 flex items-center gap-3 text-xl font-black tracking-tight text-zinc-900 md:text-2xl">
            <Wallet className="text-zinc-700" size={26} />
            Financial snapshot
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {financeKpis.map((k, i) => {
              const style = KPI_STYLE[k.key];
              return (
                <motion.div
                  key={k.label}
                  whileHover={{ y: -4 }}
                  className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80"
                >
                  <div className={`absolute -right-4 -top-4 opacity-[0.07] ${style.iconGlow}`}>
                    <k.icon size={88} strokeWidth={1} />
                  </div>
                  <div className={`relative z-10 mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${style.iconWrap}`}>
                    <k.icon size={22} />
                  </div>
                  <p className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{k.label}</p>
                  <p className="relative z-10 mt-1 text-2xl font-black tabular-nums text-zinc-900">
                    {k.suffix === "%" ? k.val.toFixed(1) : fmtINR(k.val)}
                    {k.suffix || ""}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Sales & revenue ── */}
        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-3 text-xl font-black tracking-tight text-zinc-900 md:text-2xl">
              <Activity className="text-zinc-700" size={26} />
              Sales &amp; revenue
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExport("xlsx")}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white shadow-md hover:bg-zinc-800"
              >
                PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100/80 md:p-8">
              <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-zinc-900">
                <Activity className="text-zinc-500" size={18} />
                Revenue projection · {timeframe}
              </h3>
              <div className="h-[300px] md:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={engine.salesProjectionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip
                      cursor={{ fill: "#fafafa" }}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.08)" }}
                    />
                    <Bar dataKey="totalSales" fill="#18181b" radius={[8, 8, 0, 0]} barSize={28} />
                    <Line
                      type="monotone"
                      dataKey="futureSales"
                      stroke={primary}
                      strokeWidth={3}
                      dot={{ r: 4, fill: primary }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-5">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-800">
                  <ArrowUpRight className="text-zinc-500" size={16} />
                  Period comparison
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { title: "Revenue", current: engine.estRevenue, prev: engine.estRevenue * 0.92, unit: "₹" },
                    { title: "Profit", current: engine.netProfit, prev: engine.netProfit * 1.05, unit: "₹" },
                    { title: "Margin", current: engine.profitMargin, prev: engine.profitMargin - 2.4, unit: "%" },
                    { title: "Orders", current: orders.length, prev: orders.length * 0.88, unit: "" },
                  ].map((item) => (
                    <div key={item.title} className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-zinc-100/80">
                      <p className="text-[10px] text-zinc-500">{item.title}</p>
                      <p className="text-sm font-bold tabular-nums">
                        {item.unit === "%"
                          ? `${item.current.toFixed(1)}%`
                          : `${item.unit}${Math.round(item.current).toLocaleString()}`}
                      </p>
                      <p
                        className={`mt-1 text-[10px] font-semibold ${
                          item.current >= item.prev ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {item.current >= item.prev ? "↑" : "↓"}
                        {Math.abs(((item.current - item.prev) / (item.prev || 1)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {categoryRevenue.length > 0 && (
                <div className="mt-8">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-800">
                    <Layers className="text-zinc-500" size={16} />
                    Revenue by category
                  </h4>
                  <div className="space-y-3">
                    {categoryRevenue.map((cat) => (
                      <div key={cat.name}>
                        <div className="mb-1 flex justify-between text-xs font-medium">
                          <span>{cat.name}</span>
                          <span>{fmtINR(cat.value)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-zinc-900 transition-all"
                            style={{ width: `${(cat.value / categoryRevenue[0].value) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100/80 md:p-8">
              <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-zinc-900">
                <Crown className="text-amber-500" size={18} />
                Top performers
              </h3>
              <div className="space-y-3">
                {topByRevenue.map((item, i) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl border border-zinc-50 bg-zinc-50/50 p-4 transition hover:bg-zinc-100/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-white">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900">{item.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {item.count} × {fmtINR(item.price)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums text-zinc-900">{fmtINR(item.revenue)}</p>
                      <p className="text-[10px] font-semibold text-emerald-600">
                        {engine.estRevenue > 0
                          ? `${((item.revenue / engine.estRevenue) * 100).toFixed(1)}% share`
                          : "—"}
                      </p>
                    </div>
                  </div>
                ))}
                {topByRevenue.length === 0 && (
                  <p className="py-10 text-center text-sm text-zinc-400">No sales data yet</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Volume leaders ── */}
        <section>
          <h2 className="mb-6 flex items-center gap-3 text-xl font-black tracking-tight text-zinc-900 md:text-2xl">
            <ShoppingBag className="text-zinc-700" size={26} />
            Volume leaders
          </h2>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100/80 lg:col-span-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-zinc-800">
                  <span className="h-6 w-1 rounded-full bg-zinc-900" />
                  Units sold
                </h3>
                <span className="rounded-full border border-zinc-100 bg-zinc-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Top items
                </span>
              </div>
              <div className="space-y-5 py-2">
                {bestSellersByVolume.length > 0 ? (
                  bestSellersByVolume.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                          idx === 0 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-zinc-800">{item.name}</span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                              idx === 0 ? "bg-zinc-900/10 text-zinc-800" : "bg-zinc-50 text-zinc-500"
                            }`}
                          >
                            {item.qty} units
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full border border-zinc-100 bg-zinc-50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(item.qty / bestSellersByVolume[0].qty) * 100}%`,
                            }}
                            transition={{ duration: 1.2, ease: "circOut" }}
                            className={`h-full rounded-full ${idx === 0 ? "bg-zinc-900" : "bg-zinc-400"}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Waiting for sales…
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-xl lg:col-span-2"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 opacity-[0.08]">
                <Award size={220} />
              </div>
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
                  <Sparkles size={24} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Fan favorite</p>
                {bestSellersByVolume[0] ? (
                  <>
                    <p className="mt-2 text-3xl font-black leading-tight tracking-tight">
                      {bestSellersByVolume[0].name}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                      <TrendingUp size={12} />
                      {bestSellersByVolume[0].qty} units
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-lg text-zinc-400">Collecting data…</p>
                )}
              </div>
              <div className="relative z-10 mt-8 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
                <Crown size={14} /> Top performer
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── HR analytics: time-range insights (after Volume leaders) ── */}
        {showHr && (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md"
                  style={{ backgroundColor: primary }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-zinc-900 md:text-xl">HR analytics</h2>
                  <p className="text-xs text-zinc-500">
                    Attendance trends, roster mix, and leave activity — pick a time window.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Period</span>
                <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5">
                  {[
                    { id: "week", label: "Last 7 days" },
                    { id: "month", label: "This month" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setHrPeriod(p.id)}
                      className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                        hrPeriod === p.id ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {hrLoading ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-56 animate-pulse rounded-2xl bg-zinc-100" />
                ))}
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-12">
                {showHrAttendance && hrInsight.attendanceTrend.length > 0 && (
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80 lg:col-span-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                          Attendance over time
                        </p>
                        <p className="text-xs text-zinc-500">
                          {hrPeriod === "week" ? "Rolling 7 days" : "Current calendar month"}
                        </p>
                      </div>
                      <Link
                        to="/admin/hr/attendance"
                        className="text-[11px] font-bold text-zinc-700 hover:underline"
                      >
                        Records
                      </Link>
                    </div>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={hrInsight.attendanceTrend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid #e4e4e7",
                              fontSize: "11px",
                            }}
                          />
                          <Bar dataKey="present" name="Present" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="absent" name="Absent" fill="#be123c" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {showHrStaff && hrInsight.deptBreakdown.length > 0 && (
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80 lg:col-span-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                          Team by department
                        </p>
                        <p className="text-xs text-zinc-500">{hrInsight.headcount} active profiles</p>
                      </div>
                      <Link to="/admin/hr/staff" className="text-[11px] font-bold text-zinc-700 hover:underline">
                        Roster
                      </Link>
                    </div>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hrInsight.deptBreakdown} layout="vertical" margin={{ left: 8, right: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={72}
                            tick={{ fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip cursor={{ fill: "#fafafa" }} />
                          <Bar dataKey="value" fill="#18181b" radius={[0, 6, 6, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {showHrLeaves && (
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80 lg:col-span-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Leave pipeline</p>
                        <p className="mt-1 flex flex-wrap gap-2 text-[11px] text-zinc-600">
                          <span>Pending {hrInsight.leaveByStatus.pending}</span>
                          <span className="text-zinc-300">·</span>
                          <span>Approved {hrInsight.leaveByStatus.approved}</span>
                          <span className="text-zinc-300">·</span>
                          <span>Rejected {hrInsight.leaveByStatus.rejected}</span>
                        </p>
                      </div>
                      <Link to="/admin/hr/leaves" className="text-[11px] font-bold text-zinc-700 hover:underline">
                        Queue
                      </Link>
                    </div>
                    <ul className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
                      {hrInsight.leavePending.length === 0 ? (
                        <li className="py-6 text-center text-xs text-zinc-400">No pending requests</li>
                      ) : (
                        hrInsight.leavePending.map((lv) => (
                          <li
                            key={lv._id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-amber-100/80 bg-amber-50/40 px-3 py-2 text-xs"
                          >
                            <span className="truncate font-semibold text-zinc-800">
                              {lv.staff?.name || "Staff"}
                            </span>
                            <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                              {lv.type || "Leave"}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {showHrPayroll && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-5 py-4 ring-1 ring-zinc-100/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100">
                    <Banknote className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                      Payroll · this month
                    </p>
                    <p className="text-sm font-bold text-zinc-900">
                      <span className="text-emerald-700">{hrInsight.payrollPaid} paid</span>
                      <span className="mx-2 text-zinc-300">·</span>
                      <span className="text-amber-800">{hrInsight.payrollPending} pending runs</span>
                    </p>
                  </div>
                </div>
                <Link
                  to="/admin/hr/payroll"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-[11px] font-bold text-white shadow-md hover:bg-zinc-800"
                >
                  Open payroll
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {showHrStaff && hrRecentStaff.length > 0 && (
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-zinc-400" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">People snapshot</p>
                  </div>
                  <Link to="/admin/hr/staff" className="text-[11px] font-bold text-zinc-700 hover:underline">
                    Manage staff
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hrRecentStaff.map((s) => (
                    <span
                      key={s._id}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">
                        {s.name?.charAt(0)?.toUpperCase()}
                      </span>
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {showHrAttendance && !hrLoading && hrInsight.attendanceTrend.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-center text-sm text-zinc-500">
                No attendance rows in this period yet — mark attendance in HR to see trends.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
