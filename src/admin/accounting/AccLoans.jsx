import { useEffect, useState } from "react";
import { getLoans, createLoan, deleteLoan, getLoan } from "../../api/accApi";
import { getParties } from "../../api/accApi";
import { PageHeader, Btn, Table, Modal, Input, Select, fmt, fmtDate, Breadcrumb, Card } from "./AccShared";
import { Plus, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";

const LOAN_TYPES = ["LoanTaken", "LoanRepayment", "CapitalInjection", "VendorAdvance", "EmployeeAdvance", "CustomerAdvance"];
const TYPE_LABELS = { LoanTaken: "Loan Taken", LoanRepayment: "Loan Repayment", CapitalInjection: "Capital Injection", VendorAdvance: "Vendor Advance", EmployeeAdvance: "Employee Advance", CustomerAdvance: "Customer Advance" };
const EMPTY_FORM = { date: new Date().toISOString().split("T")[0], type: "LoanTaken", party: "", amount: 0, description: "", paymentMode: "Cash", notes: "" };

export default function AccLoans() {
  const [loans, setLoans] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detail, setDetail] = useState(null);
  const [typeF, setTypeF] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [res, partyRes] = await Promise.all([getLoans({ type: typeF }), getParties({ limit: 200 })]);
      setLoans(res.data.loans); setTotal(res.data.total);
      setParties(partyRes.data.parties);
    } catch (_) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [typeF]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await createLoan(form); toast.success("Transaction recorded"); setModal(false); setForm(EMPTY_FORM); load(); }
    catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete and reverse ledger?")) return;
    try { await deleteLoan(id); toast.success("Deleted"); load(); }
    catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  const openDetail = async (doc) => {
    try { const { data } = await getLoan(doc._id); setDetail(data); } catch (_) {}
  };

  const columns = [
    { label: "LN #", render: (r) => <span className="font-mono text-xs">{r.loanNo}</span> },
    { label: "Date", render: (r) => fmtDate(r.date) },
    { label: "Type", render: (r) => <span className="text-xs bg-purple-50 text-purple-700 rounded px-2 py-0.5">{TYPE_LABELS[r.type] || r.type}</span> },
    { label: "Party", render: (r) => r.party?.name || "—" },
    { label: "Amount", render: (r) => <span className="font-semibold">{fmt(r.amount)}</span> },
    { label: "", render: (r) => (
      <div className="flex gap-1">
        <Btn variant="ghost" onClick={(e) => { e.stopPropagation(); openDetail(r); }}><Eye size={13} /></Btn>
        <Btn variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }}><Trash2 size={13} /></Btn>
      </div>
    )},
  ];

  if (detail) {
    return (
      <div>
        <Breadcrumb items={[{ label: "Loans & Advances", onClick: () => setDetail(null) }, { label: detail.loanNo }]} />
        <Card className="mb-4">
          <h2 className="text-lg font-bold">{TYPE_LABELS[detail.type]} — {detail.loanNo}</h2>
          <p className="text-sm text-slate-500 mt-1">{fmtDate(detail.date)} · {detail.party?.name || "No party"}</p>
          {detail.description && <p className="text-sm text-slate-600 mt-1">{detail.description}</p>}
          <p className="mt-3 font-semibold text-xl">{fmt(detail.amount)}</p>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Double-Entry Ledger</h3>
          <table className="w-full text-sm"><thead className="text-xs text-slate-500"><tr><th className="text-left pb-2">Account</th><th className="text-right pb-2">Debit</th><th className="text-right pb-2">Credit</th></tr></thead>
            <tbody>{(detail.ledgerEntries || []).map((e) => (<tr key={e._id} className="border-t border-slate-50"><td className="py-1.5">{e.account?.name || "—"} <span className="text-xs text-slate-400">({e.account?.code})</span></td><td className="py-1.5 text-right">{e.debit > 0 ? fmt(e.debit) : "—"}</td><td className="py-1.5 text-right">{e.credit > 0 ? fmt(e.credit) : "—"}</td></tr>))}</tbody>
          </table>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Loans & Advances (${total})`}>
        <Btn onClick={() => { setForm(EMPTY_FORM); setModal(true); }}><Plus size={15} /> New Txn</Btn>
      </PageHeader>
      <div className="flex gap-2 mb-4 flex-wrap">
        {["", ...LOAN_TYPES].map((t) => (
          <button key={t} onClick={() => setTypeF(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${typeF === t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t ? TYPE_LABELS[t] : "All"}</button>
        ))}
      </div>
      {loading ? <p className="text-center py-10 text-slate-400">Loading…</p> : <Table columns={columns} data={loans} />}
      <Modal open={modal} onClose={() => setModal(false)} title="New Loan / Advance">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <Select label="Type *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>{LOAN_TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</Select>
            <Select label="Party" value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} className="col-span-2">
              <option value="">— None —</option>
              {parties.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
            <Input label="Amount (₹) *" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} required className="col-span-2" />
            <Select label="Mode" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>{["Cash","UPI","Card","Split"].map(m=><option key={m}>{m}</option>)}</Select>
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-2" />
          </div>
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn><Btn type="submit">Save</Btn></div>
        </form>
      </Modal>
    </div>
  );
}
