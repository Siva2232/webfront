import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
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
  PieChart,
  Pie,
  Cell,
  BarChart,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Wallet,
  Search,
  ShieldCheck,
  Layers,
  Crown,
  ShoppingBag,
  Award,
  Sparkles,
  BookOpen,
  Users,
  Banknote,
  Clock,
  Calendar,
  ArrowRight,
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
import { useSalesMetrics } from "./analytics/useSalesMetrics";
import { parseLocalYMD, getOrderGross, getOrderTax } from "./analytics/salesMetrics";

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

  const [dishSearch, setDishSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    };
  });

  const applyDatePreset = (preset) => {
    const end = new Date();
    const endStr = format(end, "yyyy-MM-dd");
    if (preset === "7d") {
      setDateRange({ start: format(subDays(end, 6), "yyyy-MM-dd"), end: endStr });
    } else if (preset === "30d") {
      setDateRange({ start: format(subDays(end, 29), "yyyy-MM-dd"), end: endStr });
    } else if (preset === "mtd") {
      setDateRange({ start: format(startOfMonth(end), "yyyy-MM-dd"), end: endStr });
    }
  };

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

  const sales = useSalesMetrics({ orders, products, dateRange, dishSearch });

  const catalogSnapshot = useMemo(() => {
    const filtered = products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchStatus =
        statusFilter === "All" ? true : statusFilter === "Live" ? p.isAvailable : !p.isAvailable;
      return matchSearch && matchStatus;
    });
    const inventoryValue = filtered.reduce(
      (acc, p) => acc + (Number(p.price) || 0) * (p.stock || 1),
      0,
    );
    const liveCount = filtered.filter((p) => p.isAvailable).length;
    const outCount = Math.max(0, filtered.length - liveCount);
    const pieData = [
      { name: "Live listings", value: liveCount },
      { name: "Out of stock", value: outCount },
    ];
    return { filtered, inventoryValue, pieData };
  }, [products, catalogSearch, statusFilter]);

  const {
    ordersInRange,
    dailySales,
    topByRevenue,
    categoryRevenue,
    bestSellersByVolume,
    currentSummary,
    previousSummary,
    previousRange,
  } = sales;

  const handleExport = (format) => {
    const totalGross = currentSummary.totalGross;
    const fileBase = `Sales_summary_${dateRange.start}_${dateRange.end}`;

    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const summaryRows = [
        {
          "Date range": `${dateRange.start} to ${dateRange.end}`,
          Orders: currentSummary.orderCount,
          "Gross sales (₹)": Math.round(totalGross),
          [`${currentSummary.taxLabel} (₹)`]: Number(currentSummary.totalTax.toFixed(2)),
          "Avg order (₹)":
            currentSummary.orderCount > 0 ? Math.round(currentSummary.avgOrderValue) : "",
        },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");

      const dailyRows = dailySales.map((d) => ({
        Date: d.dateKey,
        "Gross sales (₹)": d.sales,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), "Daily_sales");

      const topRows = topByRevenue.map((row) => ({
        Item: row.name,
        Units: row.count,
        "Line revenue (₹)": Math.round(row.revenue),
        "Share %":
          totalGross > 0
            ? Math.min(100, Number(((row.revenue / totalGross) * 100).toFixed(1)))
            : "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topRows), "Top_items");

      const orderRows = ordersInRange.map((o) => {
        const g = getOrderGross(o);
        const { tax, estimated } = getOrderTax(o);
        return {
          "Order ID": o._id != null ? String(o._id) : "",
          Created: o.createdAt ? format(new Date(o.createdAt), "yyyy-MM-dd HH:mm") : "",
          "Gross (₹)": Math.round(g),
          [`Tax (${estimated ? "est." : "ledger"}, ₹)`]: Number(tax.toFixed(2)),
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Orders_in_range");

      XLSX.writeFile(wb, `${fileBase}.xlsx`);
      return;
    }

    const doc = new jsPDF();
    let y = 16;
    doc.setFontSize(14);
    doc.text("Sales summary (orders in range)", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(
      `${dateRange.start} to ${dateRange.end} · ${currentSummary.orderCount} orders · Gross ${fmtINR(totalGross)}`,
      14,
      y,
    );
    y += 10;
    doc.autoTable({
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Gross sales", fmtINR(totalGross)],
        [currentSummary.taxLabel, fmtINR(currentSummary.totalTax)],
        [
          "Avg order value",
          currentSummary.orderCount > 0 ? fmtINR(currentSummary.avgOrderValue) : "—",
        ],
      ],
    });
    y = doc.lastAutoTable.finalY + 10;
    doc.text("Daily sales", 14, y);
    y += 6;
    doc.autoTable({
      startY: y,
      head: [["Date", "Gross (₹)"]],
      body: dailySales.map((d) => [d.dateKey, String(d.sales)]),
    });
    doc.save(`${fileBase}.pdf`);
  };

  const rangeStartFmt =
    parseLocalYMD(dateRange.start) && format(parseLocalYMD(dateRange.start), "d MMM yyyy");
  const rangeEndFmt =
    parseLocalYMD(dateRange.end) && format(parseLocalYMD(dateRange.end), "d MMM yyyy");

  const salesKpis = [
    {
      label: "Orders",
      val: String(currentSummary.orderCount),
      icon: ShoppingBag,
      key: "emerald",
      suffix: "",
    },
    {
      label: "Gross sales",
      val: fmtINR(currentSummary.totalGross),
      icon: Banknote,
      key: "zinc",
      suffix: "",
    },
    {
      label: currentSummary.taxLabel,
      val: fmtINR(currentSummary.totalTax),
      icon: ShieldCheck,
      key: "rose",
      suffix: "",
    },
    {
      label: "Avg order value",
      val: currentSummary.orderCount > 0 ? fmtINR(currentSummary.avgOrderValue) : "—",
      icon: Wallet,
      key: "amber",
      suffix: "",
    },
  ];

  const cmpRows = [
    { title: "Orders", cur: currentSummary.orderCount, prev: previousSummary.orderCount, unit: "count" },
    { title: "Gross sales", cur: currentSummary.totalGross, prev: previousSummary.totalGross, unit: "₹" },
    { title: "GST / tax", cur: currentSummary.totalTax, prev: previousSummary.totalTax, unit: "₹" },
  ];

  const formatCmpVal = (unit, v) => {
    if (unit === "count") return String(Math.round(v));
    return fmtINR(v);
  };

  const cmpDeltaDisplay = (cur, prev) => {
    if (prev <= 0) return cur > 0 ? "New" : "—";
    const pct = ((cur - prev) / prev) * 100;
    return `${pct >= 0 ? "↑" : "↓"}${Math.abs(pct).toFixed(1)}%`;
  };

  const prevRangeLabel =
    previousRange.startYmd && previousRange.endYmd
      ? `${format(parseLocalYMD(previousRange.startYmd), "d MMM")} – ${format(parseLocalYMD(previousRange.endYmd), "d MMM yyyy")}`
      : "";

  const catTotal = categoryRevenue.reduce((s, c) => s + c.value, 0) || 1;

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
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-[11px] outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-900/30 focus:bg-white focus:ring-2 sm:w-52"
                placeholder="Filter dishes in lists…"
                value={dishSearch}
                onChange={(e) => setDishSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="hidden text-[9px] font-bold uppercase tracking-wider text-zinc-400 sm:inline">
                Range
              </span>
              {[
                { id: "7d", label: "7d" },
                { id: "30d", label: "30d" },
                { id: "mtd", label: "MTD" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyDatePreset(p.id)}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] font-black uppercase tracking-wide text-zinc-700 shadow-sm hover:bg-zinc-50"
                >
                  {p.label}
                </button>
              ))}
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 pt-8 md:space-y-14 md:px-8">
        {/* ── Sales performance (order-based) ── */}
        <section className="space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-3 text-xl font-black tracking-tight text-zinc-900 md:text-2xl">
                <Activity className="text-zinc-700" size={26} />
                Sales performance
              </h2>
              <p className="mt-1 max-w-xl text-sm text-zinc-500">
                Based on orders between {rangeStartFmt || dateRange.start} and {rangeEndFmt || dateRange.end}.
                {dishSearch.trim() ? (
                  <span className="ml-1 font-medium text-zinc-600">
                    Lists filtered by dish search; KPIs and chart use all orders in range.
                  </span>
                ) : null}
              </p>
              {showAccounting ? (
                <p className="mt-2 text-xs text-zinc-400">Profit and loss: use Accounting reports.</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {salesKpis.map((k) => {
              const style = KPI_STYLE[k.key];
              return (
                <Motion.div
                  key={k.label}
                  whileHover={{ y: -4 }}
                  className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80"
                >
                  <div className={`absolute -right-4 -top-4 opacity-[0.07] ${style.iconGlow}`}>
                    <k.icon size={88} strokeWidth={1} />
                  </div>
                  <div
                    className={`relative z-10 mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${style.iconWrap}`}
                  >
                    <k.icon size={22} />
                  </div>
                  <p className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{k.label}</p>
                  <p className="relative z-10 mt-1 text-2xl font-black tabular-nums text-zinc-900">
                    {k.val}
                    {k.suffix}
                  </p>
                </Motion.div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100/80 md:p-8">
              <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-zinc-900">
                <Activity className="text-zinc-500" size={18} />
                Daily sales
              </h3>
              <div className="h-[300px] md:h-[340px]">
                {dailySales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis
                        dataKey="dateLabel"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip
                        cursor={{ fill: "#fafafa" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
                        }}
                        formatter={(v) => [fmtINR(v), "Gross"]}
                      />
                      <Bar dataKey="sales" fill="#18181b" radius={[6, 6, 0, 0]} name="Gross sales" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-zinc-400">
                    Pick a valid date range to see daily totals.
                  </p>
                )}
              </div>

              <div className="mt-8 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-5">
                <h4 className="mb-1 flex items-center gap-2 text-sm font-black text-zinc-800">
                  <ArrowLeftRight className="text-zinc-500" size={16} />
                  Period comparison
                </h4>
                {prevRangeLabel ? (
                  <p className="mb-4 text-[11px] text-zinc-500">Previous window: {prevRangeLabel}</p>
                ) : (
                  <p className="mb-4 text-[11px] text-zinc-500">Previous period unavailable for this range.</p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {cmpRows.map((item) => {
                    const d = cmpDeltaDisplay(item.cur, item.prev);
                    const up = item.cur >= item.prev;
                    return (
                      <div
                        key={item.title}
                        className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-zinc-100/80"
                      >
                        <p className="text-[10px] text-zinc-500">{item.title}</p>
                        <p className="text-sm font-bold tabular-nums text-zinc-900">
                          {formatCmpVal(item.unit, item.cur)}
                        </p>
                        <p
                          className={`mt-1 text-[10px] font-semibold ${
                            d === "—" || d === "New" ? "text-zinc-500" : up ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {d}
                        </p>
                      </div>
                    );
                  })}
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
                            style={{ width: `${Math.min(100, (cat.value / catTotal) * 100)}%` }}
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
                {topByRevenue.map((item, i) => {
                  const sharePct =
                    currentSummary.totalGross > 0
                      ? Math.min(100, (item.revenue / currentSummary.totalGross) * 100).toFixed(1)
                      : null;
                  return (
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
                            {item.count} sold · {fmtINR(item.price)} list price
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums text-zinc-900">{fmtINR(item.revenue)}</p>
                        <p className="text-[10px] font-semibold text-emerald-600">
                          {sharePct != null ? `${sharePct}% share` : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {topByRevenue.length === 0 && (
                  <p className="py-10 text-center text-sm text-zinc-400">No matching line items in this range.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            <Motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100/80 lg:col-span-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-zinc-800">
                  <ShoppingBag className="h-5 w-5 text-zinc-600" />
                  Volume leaders
                </h3>
                <span className="rounded-full border border-zinc-100 bg-zinc-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Units in range
                </span>
              </div>
              <div className="space-y-5 py-2">
                {bestSellersByVolume.length > 0 ? (
                  bestSellersByVolume.map((item, idx) => {
                    const maxQ = bestSellersByVolume[0]?.qty || 1;
                    return (
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
                            <Motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(item.qty / maxQ) * 100}%`,
                              }}
                              transition={{ duration: 1.2, ease: "circOut" }}
                              className={`h-full rounded-full ${idx === 0 ? "bg-zinc-900" : "bg-zinc-400"}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    No unit volume for the current filters.
                  </p>
                )}
              </div>
            </Motion.div>

            <Motion.div
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
            </Motion.div>
          </div>
        </section>

        {/* ── Catalog snapshot (not sales) ── */}
        <section className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/40 p-5 md:p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-zinc-800">
                <Layers className="text-zinc-500" size={18} />
                Catalog 
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Listed inventory value and availability — independent of the order date range above.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-[140px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Filter catalog…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-800 outline-none"
              >
                <option value="All">All</option>
                <option value="Live">Live</option>
                <option value="Stocked">Out of stock</option>
              </select>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-12 md:items-center">
            <div className="md:col-span-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Listed catalog value</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-zinc-900">{fmtINR(catalogSnapshot.inventoryValue)}</p>
              <p className="mt-2 text-[11px] text-zinc-500">{catalogSnapshot.filtered.length} SKUs in view</p>
            </div>
            <div className="md:col-span-8">
              {catalogSnapshot.pieData.some((d) => d.value > 0) ? (
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
                  <div className="h-[140px] w-[140px] shrink-0 sm:h-[160px] sm:w-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={catalogSnapshot.pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={58}
                          paddingAngle={2}
                        >
                          {catalogSnapshot.pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-full max-w-xs space-y-2">
                    {catalogSnapshot.pieData.map((row, i) => (
                      <li key={row.name} className="flex justify-between text-[11px]">
                        <span className="flex items-center gap-2 font-medium text-zinc-700">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          {row.name}
                        </span>
                        <span className="font-bold tabular-nums text-zinc-900">{row.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-zinc-400">No catalog rows match these filters.</p>
              )}
            </div>
          </div>
        </section>

        {/* ── HR analytics (Accounting section follows below when enabled) ── */}
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

        {/* ── Accounting (after HR) — ledgers, charts, activity (no top KPI tile row) ── */}
        {showAccounting && (
          <section className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-zinc-900 md:text-xl">Accounting</h2>
                  <p className="text-xs text-zinc-500">
                    {accDateBounds.label} · {accDateBounds.start} → {accDateBounds.end}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5">
                  {[
                    { id: "mtd", label: "MTD" },
                    { id: "30d", label: "30d" },
                    { id: "90d", label: "90d" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAccRange(r.id)}
                      className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                        accRange === r.id ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <Link
                  to="/admin/accounting"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[11px] font-bold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                >
                  Full ledger
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {accLoading && !accData ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80 lg:col-span-7">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                          Income vs expense
                        </p>
                        <p className="text-xs text-zinc-500">Daily movement in selected range</p>
                      </div>
                      <Link
                        to="/admin/accounting/reports"
                        className="text-[11px] font-bold text-zinc-700 hover:underline"
                      >
                        Reports
                      </Link>
                    </div>
                    {accChartSorted.length === 0 ? (
                      <p className="py-16 text-center text-sm text-zinc-400">No journal activity in this period.</p>
                    ) : (
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={accChartSorted}>
                            <defs>
                              <linearGradient id="accIncomeFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={primary} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={primary} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                            <XAxis
                              dataKey="dateLabel"
                              tick={{ fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                            />
                            <Tooltip
                              formatter={(v) => fmtINR(v)}
                              contentStyle={{
                                borderRadius: "12px",
                                border: "1px solid #e4e4e7",
                                fontSize: "11px",
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            <Area
                              type="monotone"
                              dataKey="income"
                              name="Income"
                              stroke={primary}
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#accIncomeFill)"
                            />
                            <Area
                              type="monotone"
                              dataKey="expense"
                              name="Expense"
                              stroke="#be123c"
                              strokeWidth={2}
                              fillOpacity={0}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 lg:col-span-5">
                    <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-900 to-zinc-800 p-5 text-white shadow-lg ring-1 ring-zinc-700/50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Liquidity</p>
                      <p className="mt-1 text-2xl font-black tabular-nums">{fmtINR(accLiquidity.total)}</p>
                      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-300">
                        <span>Cash {fmtINR(accLiquidity.cash)}</span>
                        <span className="text-zinc-600">·</span>
                        <span>Bank {fmtINR(accLiquidity.bank)}</span>
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                        Expense mix
                      </p>
                      {expensePieData.length === 0 ? (
                        <p className="py-6 text-center text-xs text-zinc-400">No expenses in range</p>
                      ) : (
                        <>
                          <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={expensePieData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={52}
                                  outerRadius={72}
                                  paddingAngle={2}
                                >
                                  {expensePieData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v) => fmtINR(v)} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                            {expensePieData.map((row, i) => (
                              <li key={row.name} className="flex justify-between text-[11px]">
                                <span className="flex items-center gap-2 truncate font-medium text-zinc-700">
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                                  />
                                  {row.name}
                                </span>
                                <span className="shrink-0 font-bold tabular-nums text-zinc-900">
                                  {fmtINR(row.value)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80 lg:col-span-6">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                          Income by ledger
                        </p>
                        <p className="text-xs text-zinc-500">Top categories · credits</p>
                      </div>
                      <Link
                        to="/admin/accounting/ledgers"
                        className="text-[11px] font-bold text-zinc-700 hover:underline"
                      >
                        Ledgers
                      </Link>
                    </div>
                    {incomeBarData.length === 0 ? (
                      <p className="py-12 text-center text-xs text-zinc-400">No income in this period</p>
                    ) : (
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={incomeBarData} layout="vertical" margin={{ left: 4, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={88}
                              tick={{ fontSize: 9 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip formatter={(v) => fmtINR(v)} cursor={{ fill: "#fafafa" }} />
                            <Bar dataKey="value" fill="#059669" radius={[0, 6, 6, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/80 lg:col-span-6">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                          Recent journal entries
                        </p>
                        <p className="text-xs text-zinc-500">Latest in range</p>
                      </div>
                      <Link
                        to="/admin/accounting/transactions"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700 hover:underline"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        All activity
                      </Link>
                    </div>
                    <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                      {(accData?.recentTransactions || []).length === 0 ? (
                        <p className="py-10 text-center text-xs text-zinc-400">No transactions yet</p>
                      ) : (
                        (accData.recentTransactions || []).slice(0, 8).map((tx) => (
                          <div
                            key={tx._id}
                            className="flex flex-col gap-1 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-zinc-900">
                                {tx.description || "Entry"}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                {tx.date ? format(new Date(tx.date), "dd MMM yyyy, HH:mm") : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="hidden max-w-[100px] truncate text-[10px] text-zinc-500 sm:inline">
                                {tx.entries?.[0]?.ledger?.name || "—"}
                                <span className="mx-1 text-zinc-300">→</span>
                                {tx.entries?.[1]?.ledger?.name || "—"}
                              </span>
                              <span className="rounded-lg bg-zinc-900 px-2 py-1 text-[11px] font-bold tabular-nums text-white">
                                {fmtINR(tx.entries?.[0]?.amount ?? 0)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}