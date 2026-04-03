import { useEffect, useState } from "react";
import { getLedgerEntries, getAccountStatement } from "../../api/accApi";
import { getAccounts } from "../../api/accApi";
import { PageHeader, Btn, Table, fmt, fmtDate, Input, Select, Card, Breadcrumb } from "./AccShared";
import { Eye } from "lucide-react";

export default function AccLedger() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [accountF, setAccountF] = useState("");
  const [fromF, setFromF] = useState("");
  const [toF, setToF] = useState("");
  const [statement, setStatement] = useState(null); // drill-down

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getLedgerEntries({ account: accountF, from: fromF, to: toF });
      setEntries(data.entries); setTotal(data.total);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    getAccounts().then(({ data }) => setAccounts(data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [accountF, fromF, toF]);

  const openStatement = async (accId) => {
    try {
      const { data } = await getAccountStatement(accId, { from: fromF, to: toF });
      setStatement(data);
    } catch (_) {}
  };

  const columns = [
    { label: "Date", render: (r) => fmtDate(r.date) },
    { label: "Account", render: (r) => <span>{r.account?.name} <span className="text-xs text-slate-400">({r.account?.code})</span></span> },
    { label: "Party", render: (r) => r.party?.name || "—" },
    { label: "Description", render: (r) => <span className="text-slate-600 text-xs">{r.description}</span> },
    { label: "Ref. Type", render: (r) => r.refModel ? <span className="text-xs bg-slate-100 rounded px-1.5 py-0.5">{r.refModel}</span> : "—" },
    { label: "Debit (Dr)", render: (r) => r.debit > 0 ? <span className="text-blue-700 font-semibold">{fmt(r.debit)}</span> : <span className="text-slate-300">—</span> },
    { label: "Credit (Cr)", render: (r) => r.credit > 0 ? <span className="text-green-700 font-semibold">{fmt(r.credit)}</span> : <span className="text-slate-300">—</span> },
  ];

  // Account statement columns
  const stmtColumns = [
    { label: "Date", render: (r) => fmtDate(r.date) },
    { label: "Description", render: (r) => r.description || "—" },
    { label: "Txn Group", render: (r) => <span className="font-mono text-xs text-slate-400">{r.txnId}</span> },
    { label: "Debit", render: (r) => r.debit > 0 ? <span className="text-blue-700 font-semibold">{fmt(r.debit)}</span> : "—" },
    { label: "Credit", render: (r) => r.credit > 0 ? <span className="text-green-700 font-semibold">{fmt(r.credit)}</span> : "—" },
    { label: "Balance", render: (r) => <span className={r.runningBalance >= 0 ? "text-slate-800 font-semibold" : "text-red-600 font-semibold"}>{fmt(r.runningBalance)}</span> },
  ];

  if (statement) {
    const acc = statement.account;
    return (
      <div>
        <Breadcrumb items={[{ label: "Ledger", onClick: () => setStatement(null) }, { label: `${acc?.code} - ${acc?.name}` }]} />
        <Card className="mb-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-500">Account:</span> <strong>{acc?.name}</strong></div>
            <div><span className="text-slate-500">Code:</span> <strong>{acc?.code}</strong></div>
            <div><span className="text-slate-500">Balance:</span> <strong>{fmt(acc?.balance)}</strong></div>
            <div><span className="text-slate-500">Type:</span> <strong>{acc?.type}</strong></div>
            <div><span className="text-slate-500">Sub-Type:</span> <strong>{acc?.subType || "—"}</strong></div>
          </div>
        </Card>
        <Table columns={stmtColumns} data={statement.entries} emptyMsg="No entries for this account." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`General Ledger (${total})`} />
      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={accountF} onChange={(e) => setAccountF(e.target.value)} className="min-w-[200px]">
          <option value="">All Accounts</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
        </Select>
        <Input type="date" value={fromF} onChange={(e) => setFromF(e.target.value)} placeholder="From" />
        <Input type="date" value={toF} onChange={(e) => setToF(e.target.value)} placeholder="To" />
      </div>

      {/* Account-wise cards */}
      {accountF && (
        <div className="mb-4">
          <Btn variant="outline" onClick={() => openStatement(accountF)}><Eye size={13} /> View Account Statement</Btn>
        </div>
      )}

      {!accountF && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {accounts.slice(0, 16).map((a) => (
            <button key={a._id} onClick={() => openStatement(a._id)}
              className="bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-indigo-300 hover:shadow-sm transition">
              <p className="font-mono text-xs text-slate-400">{a.code}</p>
              <p className="font-semibold text-sm text-slate-800 mt-0.5">{a.name}</p>
              <p className={`text-lg font-bold mt-1 ${a.balance >= 0 ? "text-slate-800" : "text-red-600"}`}>{fmt(a.balance)}</p>
            </button>
          ))}
        </div>
      )}

      {loading ? <p className="text-center py-10 text-slate-400">Loading…</p> : (
        <Table columns={columns} data={entries} />
      )}
    </div>
  );
}
