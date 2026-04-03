import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfitLoss, getBalanceSheet, getAgingReport, getDailyClosing } from "../../api/accApi";
import { Btn, fmt, fmtDate, Card, Breadcrumb, Stat } from "./AccShared";
import { TrendingUp, TrendingDown, BarChart2, Scale, Clock, Calendar } from "lucide-react";

const TABS = [
  { id: "pl", label: "Profit & Loss", icon: BarChart2 },
  { id: "bs", label: "Balance Sheet", icon: Scale },
  { id: "aging", label: "Aging Report", icon: Clock },
  { id: "daily", label: "Daily Closing", icon: Calendar },
];

// ── Profit & Loss ──────────────────────────────────────────────────────────────
function ProfitLoss() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [drillItem, setDrillItem] = useState(null); // { name, _id, amount }

  const load = async () => {
    setLoading(true);
    try { const { data: d } = await getProfitLoss({ from, to }); setData(d); }
    catch (_) {}
    setLoading(false);
  };

  return (
    <div>
      {drillItem ? (
        <div>
          <Breadcrumb items={[{ label: "Profit & Loss", onClick: () => setDrillItem(null) }, { label: drillItem.name }]} />
          <Card>
            <p className="text-lg font-bold">{drillItem.name}</p>
            <p className="mt-1 text-2xl font-extrabold">{fmt(drillItem.amount)}</p>
            <p className="text-xs text-slate-400 mt-2">Drill-down to account ledger entries via the Ledger page.</p>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-5 items-end">
            <div><label className="text-xs text-slate-500 block mb-1">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
            <div><label className="text-xs text-slate-500 block mb-1">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
            <Btn onClick={load} disabled={loading}>Generate</Btn>
          </div>

          {loading && <p className="text-center py-6 text-slate-400">Loading…</p>}
          {!loading && data && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Total Income" value={fmt(data.totalIncome)} color="green" />
                <Stat label="Total Expenses" value={fmt(data.totalExpenses)} color="red" />
                <Stat label="Net Profit / Loss" value={fmt(data.netProfit)} color={data.netProfit >= 0 ? "indigo" : "red"} />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2"><TrendingUp size={15} /> Income</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {data.incomeRows.map((r) => (
                        <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setDrillItem(r)}>
                          <td className="py-2 text-slate-700">{r.name}</td>
                          <td className="py-2 text-right font-semibold text-green-700">{fmt(r.amount)}</td>
                          <td className="py-2 pl-2 text-slate-400 text-xs">→</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t border-slate-200">
                        <td className="pt-2">Total Income</td>
                        <td className="pt-2 text-right text-green-700">{fmt(data.totalIncome)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </Card>
                <Card>
                  <h3 className="font-bold text-red-600 mb-3 flex items-center gap-2"><TrendingDown size={15} /> Expenses</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {data.expenseRows.map((r) => (
                        <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setDrillItem(r)}>
                          <td className="py-2 text-slate-700">{r.name}</td>
                          <td className="py-2 text-right font-semibold text-red-600">{fmt(r.amount)}</td>
                          <td className="py-2 pl-2 text-slate-400 text-xs">→</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t border-slate-200">
                        <td className="pt-2">Total Expenses</td>
                        <td className="pt-2 text-right text-red-600">{fmt(data.totalExpenses)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </Card>
              </div>

              <Card className={`border-2 ${data.netProfit >= 0 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">{data.netProfit >= 0 ? "Net Profit" : "Net Loss"}</span>
                  <span className={`text-3xl font-extrabold ${data.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(Math.abs(data.netProfit))}</span>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Balance Sheet ──────────────────────────────────────────────────────────────
function BalanceSheetView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drillItem, setDrillItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const { data: d } = await getBalanceSheet(); setData(d); }
    catch (_) {}
    setLoading(false);
  };

  const Section = ({ title, rows, colorClass }) => (
    <div className="mb-4">
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{title}</h4>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setDrillItem(r)}>
              <td className="py-1.5 text-slate-700"><span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}</td>
              <td className={`py-1.5 text-right font-semibold ${colorClass}`}>{fmt(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (drillItem) {
    return (
      <div>
        <Breadcrumb items={[{ label: "Balance Sheet", onClick: () => setDrillItem(null) }, { label: drillItem.name }]} />
        <Card><p className="text-lg font-bold">{drillItem.code} — {drillItem.name}</p><p className="text-2xl font-extrabold mt-1">{fmt(drillItem.balance)}</p><p className="text-xs text-slate-400 mt-2">Use the Ledger page for a full account statement.</p></Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4"><Btn onClick={load} disabled={loading}>Load Balance Sheet</Btn></div>
      {loading && <p className="text-center py-6 text-slate-400">Loading…</p>}
      {data && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-bold text-blue-700 mb-4">Assets</h3>
            <Section title="Assets" rows={data.assets} colorClass="text-blue-700" />
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold"><span>Total Assets</span><span className="text-blue-700">{fmt(data.totalAssets)}</span></div>
          </Card>
          <div className="space-y-6">
            <Card>
              <h3 className="font-bold text-red-600 mb-4">Liabilities</h3>
              <Section title="Liabilities" rows={data.liabilities} colorClass="text-red-600" />
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold"><span>Total Liabilities</span><span className="text-red-600">{fmt(data.totalLiabilities)}</span></div>
            </Card>
            <Card>
              <h3 className="font-bold text-purple-700 mb-4">Equity</h3>
              <Section title="Equity" rows={data.equity} colorClass="text-purple-700" />
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold"><span>Total Equity</span><span className="text-purple-700">{fmt(data.totalEquity)}</span></div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aging Report ───────────────────────────────────────────────────────────────
function AgingReportView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("receivable");

  const load = async () => {
    setLoading(true);
    try { const { data: d } = await getAgingReport({ type }); setData(d); }
    catch (_) {}
    setLoading(false);
  };

  const BucketTable = ({ bucket, rows }) => (
    <Card className="mb-4">
      <h4 className="font-bold text-slate-700 mb-3">{bucket} Days</h4>
      {rows.length === 0 ? <p className="text-slate-400 text-sm italic">No entries.</p> : (
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500"><tr><th className="text-left pb-2">Ref.</th><th className="text-left pb-2">Party</th><th className="text-left pb-2">Date</th><th className="text-right pb-2">Days</th><th className="text-right pb-2">Total</th><th className="text-right pb-2">Balance</th></tr></thead>
          <tbody>{rows.map((r) => (<tr key={r._id} className="border-t border-slate-50"><td className="py-1.5 font-mono text-xs">{r.no}</td><td className="py-1.5">{r.party?.name || "—"}</td><td className="py-1.5">{fmtDate(r.date)}</td><td className="py-1.5 text-right">{r.days}</td><td className="py-1.5 text-right">{fmt(r.totalAmount)}</td><td className="py-1.5 text-right font-bold text-red-600">{fmt(r.balance)}</td></tr>))}</tbody>
        </table>
      )}
    </Card>
  );

  return (
    <div>
      <div className="flex gap-3 mb-5 items-end">
        <div className="flex gap-2">
          {["receivable", "payable"].map((t) => (
            <button key={t} onClick={() => setType(t)} className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${type === t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>{t}</button>
          ))}
        </div>
        <Btn onClick={load} disabled={loading}>Generate</Btn>
      </div>
      {loading && <p className="text-center py-6 text-slate-400">Loading…</p>}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stat label="0–30 Days" value={fmt(data.totals["0-30"])} color="green" />
            <Stat label="31–60 Days" value={fmt(data.totals["31-60"])} color="amber" />
            <Stat label="60+ Days" value={fmt(data.totals["60+"])} color="red" />
          </div>
          <BucketTable bucket="0–30" rows={data.buckets["0-30"]} />
          <BucketTable bucket="31–60" rows={data.buckets["31-60"]} />
          <BucketTable bucket="60+" rows={data.buckets["60+"]} />
        </>
      )}
    </div>
  );
}

// ── Daily Closing ──────────────────────────────────────────────────────────────
function DailyClosingView() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data: d } = await getDailyClosing({ date }); setData(d); }
    catch (_) {}
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-3 mb-5 items-end">
        <div><label className="text-xs text-slate-500 block mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
        <Btn onClick={load} disabled={loading}>Generate</Btn>
      </div>
      {loading && <p className="text-center py-6 text-slate-400">Loading…</p>}
      {data && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800">Daily Closing — {fmtDate(data.date)}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Cash in Hand" value={fmt(data.cashInHand)} color="indigo" />
            <Stat label="Total Sales" value={fmt(data.totalSales)} color="green" />
            <Stat label="Total Expenses" value={fmt(data.totalExpenses)} color="red" />
            <Stat label="Net Cash Flow" value={fmt(data.totalSales - data.totalExpenses)} color={data.totalSales - data.totalExpenses >= 0 ? "green" : "red"} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Card><p className="text-xs text-slate-500">Orders Created</p><p className="text-2xl font-bold mt-1">{data.orders}</p></Card>
            <Card><p className="text-xs text-slate-500">Purchases Created</p><p className="text-2xl font-bold mt-1">{data.purchases}</p></Card>
            <Card><p className="text-xs text-slate-500">Expense Entries</p><p className="text-2xl font-bold mt-1">{data.expenses}</p></Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Reports Page ──────────────────────────────────────────────────────────
export default function AccReports() {
  const [activeTab, setActiveTab] = useState("pl");

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Reports</h1>
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "pl" && <ProfitLoss />}
      {activeTab === "bs" && <BalanceSheetView />}
      {activeTab === "aging" && <AgingReportView />}
      {activeTab === "daily" && <DailyClosingView />}
    </div>
  );
}
