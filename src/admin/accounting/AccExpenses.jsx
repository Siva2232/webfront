import { useEffect, useState } from "react";
import { getExpenses, createExpense, deleteExpense, getExpense, getPayments, createPayment } from "../../api/accApi";
import { getParties } from "../../api/accApi";
import { PageHeader, Btn, Table, Modal, Input, Select, StatusBadge, fmt, fmtDate, Breadcrumb, Card } from "./AccShared";
import { Plus, Trash2, Eye, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["Salary", "Rent", "Utilities", "Purchase Cost", "Other Expenses", "Taxes"];
const EMPTY_FORM = { date: new Date().toISOString().split("T")[0], party: "", category: "Other Expenses", description: "", totalAmount: 0, paidAmount: 0, paymentMode: "Cash", notes: "" };

export default function AccExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detail, setDetail] = useState(null);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: 0, mode: "Cash", notes: "" });
  const [statusF, setStatusF] = useState("");
  const [catF, setCatF] = useState("");
  const [payments, setPayments] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [res, partyRes] = await Promise.all([getExpenses({ status: statusF, category: catF }), getParties({ limit: 200 })]);
      setExpenses(res.data.expenses); setTotal(res.data.total);
      setParties(partyRes.data.parties);
    } catch (_) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [statusF, catF]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await createExpense(form); toast.success("Expense created"); setModal(false); setForm(EMPTY_FORM); load(); }
    catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete and reverse ledger?")) return;
    try { await deleteExpense(id); toast.success("Deleted"); load(); }
    catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  const openDetail = async (doc) => {
    try {
      const [detailRes, payRes] = await Promise.all([getExpense(doc._id), getPayments({ refModel: "AccExpense", refId: doc._id })]);
      setDetail(detailRes.data); setPayments(payRes.data.payments);
    } catch (_) {}
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try { await createPayment({ refModel: "AccExpense", refId: detail._id, ...payForm, party: detail.party?._id }); toast.success("Payment recorded"); setPayModal(false); openDetail(detail); load(); }
    catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  const columns = [
    { label: "EX #", render: (r) => <span className="font-mono text-xs">{r.expenseNo}</span> },
    { label: "Date", render: (r) => fmtDate(r.date) },
    { label: "Category", render: (r) => <span className="text-xs bg-amber-50 text-amber-700 rounded px-2 py-0.5">{r.category}</span> },
    { label: "Party", render: (r) => r.party?.name || "—" },
    { label: "Total", render: (r) => fmt(r.totalAmount) },
    { label: "Paid", render: (r) => <span className="text-green-700 font-semibold">{fmt(r.paidAmount)}</span> },
    { label: "Balance", render: (r) => <span className="text-red-600 font-semibold">{fmt(r.balance)}</span> },
    { label: "Status", render: (r) => <StatusBadge status={r.status} /> },
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
        <Breadcrumb items={[{ label: "Expenses", onClick: () => setDetail(null) }, { label: detail.expenseNo }]} />
        <Card className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{detail.expenseNo} — {detail.category}</h2>
              <p className="text-sm text-slate-500">{fmtDate(detail.date)} · {detail.party?.name || "No party"}</p>
              {detail.description && <p className="text-sm text-slate-600 mt-1">{detail.description}</p>}
            </div>
            <div className="flex gap-2">
              <StatusBadge status={detail.status} />
              {detail.status !== "Paid" && <Btn onClick={() => { setPayForm({ amount: detail.balance, mode: "Cash", notes: "" }); setPayModal(true); }}><CreditCard size={13} /> Pay</Btn>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div><span className="text-slate-500">Total:</span> <strong>{fmt(detail.totalAmount)}</strong></div>
            <div><span className="text-slate-500">Paid:</span> <strong className="text-green-700">{fmt(detail.paidAmount)}</strong></div>
            <div><span className="text-slate-500">Balance:</span> <strong className="text-red-600">{fmt(detail.balance)}</strong></div>
          </div>
        </Card>
        <Card className="mb-4">
          <h3 className="font-semibold mb-3">Payment History</h3>
          {payments.length === 0 ? <p className="text-slate-400 text-sm italic">No payments yet.</p> : (
            <table className="w-full text-sm"><thead className="text-xs text-slate-500"><tr><th className="text-left pb-2">Date</th><th className="text-left pb-2">Mode</th><th className="text-right pb-2">Amount</th></tr></thead>
              <tbody>{payments.map((p) => (<tr key={p._id} className="border-t border-slate-50"><td className="py-1.5">{fmtDate(p.date)}</td><td className="py-1.5">{p.mode}</td><td className="py-1.5 text-right font-semibold text-green-700">{fmt(p.amount)}</td></tr>))}</tbody>
            </table>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Double-Entry Ledger</h3>
          <table className="w-full text-sm"><thead className="text-xs text-slate-500"><tr><th className="text-left pb-2">Account</th><th className="text-right pb-2">Debit</th><th className="text-right pb-2">Credit</th></tr></thead>
            <tbody>{(detail.ledgerEntries || []).map((e) => (<tr key={e._id} className="border-t border-slate-50"><td className="py-1.5">{e.account?.name || "—"} <span className="text-xs text-slate-400">({e.account?.code})</span></td><td className="py-1.5 text-right">{e.debit > 0 ? fmt(e.debit) : "—"}</td><td className="py-1.5 text-right">{e.credit > 0 ? fmt(e.credit) : "—"}</td></tr>))}</tbody>
          </table>
        </Card>
        <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment">
          <form onSubmit={handlePayment} className="space-y-3">
            <Input label="Amount (₹)" type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: +e.target.value })} required />
            <Select label="Mode" value={payForm.mode} onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })}>{["Cash","UPI","Card","Split"].map(m=><option key={m}>{m}</option>)}</Select>
            <Input label="Notes" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
            <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setPayModal(false)}>Cancel</Btn><Btn type="submit">Save</Btn></div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Expenses (${total})`}>
        <Btn onClick={() => { setForm(EMPTY_FORM); setModal(true); }}><Plus size={15} /> New Expense</Btn>
      </PageHeader>
      <div className="flex gap-2 mb-4 flex-wrap">
        {["", "Paid", "Partial", "Unpaid"].map((s) => (
          <button key={s} onClick={() => setStatusF(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusF === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s || "All Status"}</button>
        ))}
        <span className="w-px bg-slate-200" />
        {["", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCatF(c)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${catF === c ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{c || "All Categories"}</button>
        ))}
      </div>
      {loading ? <p className="text-center py-10 text-slate-400">Loading…</p> : <Table columns={columns} data={expenses} />}
      <Modal open={modal} onClose={() => setModal(false)} title="New Expense">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <Select label="Category *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</Select>
            <Select label="Party/Vendor" value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} className="col-span-2">
              <option value="">— None —</option>
              {parties.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-2" />
            <Input label="Total Amount (₹) *" type="number" step="0.01" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: +e.target.value })} required />
            <Input label="Amount Paid (₹)" type="number" step="0.01" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: +e.target.value })} />
            <Select label="Mode" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>{["Cash","UPI","Card","Split"].map(m=><option key={m}>{m}</option>)}</Select>
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn><Btn type="submit">Create</Btn></div>
        </form>
      </Modal>
    </div>
  );
}
