import { useEffect, useState } from "react";
import { getProfitLoss, getBalanceSheet, getAgingReport, getDailyClosing } from "../../api/accApi";
import { fmt, fmtDate, Card, Stat, Btn } from "./AccShared";
import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";

export default function AccDashboard() {
  const today = new Date().toISOString().split("T")[0];
  const [pl, setPl] = useState(null);
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [plRes, dayRes] = await Promise.all([
          getProfitLoss(),
          getDailyClosing({ date: today }),
        ]);
        setPl(plRes.data);
        setDaily(dayRes.data);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, [today]);

  if (loading) return <div className="text-center py-16 text-slate-400">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Accounting Dashboard</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Net Profit (All Time)" value={fmt(pl?.netProfit ?? 0)} color={pl?.netProfit >= 0 ? "green" : "red"} />
        <Stat label="Total Income" value={fmt(pl?.totalIncome ?? 0)} color="indigo" />
        <Stat label="Total Expenses" value={fmt(pl?.totalExpenses ?? 0)} color="red" />
        <Stat label="Cash in Hand" value={fmt(daily?.cashInHand ?? 0)} color="amber" />
      </div>

      {/* Today's summary */}
      <Card>
        <h2 className="font-bold text-slate-700 mb-4">Today's Summary — {fmtDate(today)}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{fmt(daily?.totalSales ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Sales</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{fmt(daily?.totalExpenses ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Expenses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-700">{daily?.orders ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-700">{daily?.expenses ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">Expense Txns</p>
          </div>
        </div>
      </Card>

      {/* P&L summary */}
      {pl && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-500" /> Income Breakdown
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {pl.incomeRows.map((r) => (
                  <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-1.5 text-slate-600">{r.name}</td>
                    <td className="py-1.5 text-right font-semibold text-green-700">{fmt(r.amount)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right text-green-700">{fmt(pl.totalIncome)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
          <Card>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingDown size={16} className="text-red-500" /> Expense Breakdown
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {pl.expenseRows.map((r) => (
                  <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-1.5 text-slate-600">{r.name}</td>
                    <td className="py-1.5 text-right font-semibold text-red-600">{fmt(r.amount)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right text-red-600">{fmt(pl.totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
