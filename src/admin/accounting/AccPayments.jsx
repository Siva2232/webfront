import { useEffect, useState } from "react";
import { getPayments, deletePayment } from "../../api/accApi";
import { PageHeader, Btn, Table, fmt, fmtDate, StatusBadge } from "./AccShared";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const MODEL_LABELS = { AccOrder: "Sales Order", AccPurchase: "Purchase", AccExpense: "Expense", AccLoan: "Loan/Advance" };

export default function AccPayments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modelF, setModelF] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getPayments({ refModel: modelF });
      setPayments(data.payments); setTotal(data.total);
    } catch (_) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [modelF]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment and reverse ledger entries?")) return;
    try { await deletePayment(id); toast.success("Deleted & reversed"); load(); }
    catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  const columns = [
    { label: "PAY #", render: (r) => <span className="font-mono text-xs">{r.paymentNo}</span> },
    { label: "Date", render: (r) => fmtDate(r.date) },
    { label: "Type", render: (r) => <span className="text-xs bg-slate-100 rounded px-2 py-0.5">{MODEL_LABELS[r.refModel]}</span> },
    { label: "Party", render: (r) => r.party?.name || "—" },
    { label: "Mode", render: (r) => r.mode },
    { label: "Amount", render: (r) => <span className="font-semibold text-green-700">{fmt(r.amount)}</span> },
    { label: "", render: (r) => <Btn variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }}><Trash2 size={13} /></Btn> },
  ];

  return (
    <div>
      <PageHeader title={`Payments (${total})`} />
      <div className="flex gap-2 mb-4">
        {["", "AccOrder", "AccPurchase", "AccExpense", "AccLoan"].map((m) => (
          <button key={m} onClick={() => setModelF(m)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${modelF === m ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {m ? MODEL_LABELS[m] : "All"}
          </button>
        ))}
      </div>
      {loading ? <p className="text-center py-10 text-slate-400">Loading…</p> : <Table columns={columns} data={payments} />}
    </div>
  );
}
