import { useEffect, useState } from "react";
import { getAccounts, createAccount, updateAccount, deleteAccount, seedChartOfAccounts } from "../../api/accApi";
import { PageHeader, Btn, Table, Modal, Input, Select, fmt, Card } from "./AccShared";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

const EMPTY = { code: "", name: "", type: "Asset", subType: "", description: "" };
const TYPES = ["Asset", "Liability", "Equity", "Income", "Expense"];

const SUB_TYPES = {
  Asset: ["Cash", "Bank", "Inventory", "Accounts Receivable", "Advances", "Other Asset"],
  Liability: ["Accounts Payable", "Loans Payable", "Customer Advances", "Other Liability"],
  Equity: ["Capital", "Retained Earnings"],
  Income: ["Sales", "Beverage Sales", "Other Income"],
  Expense: ["Purchase Cost", "Salary", "Rent", "Utilities", "Other Expenses", "Taxes"],
};

const TYPE_COLORS = {
  Asset: "bg-blue-50 text-blue-700",
  Liability: "bg-red-50 text-red-700",
  Equity: "bg-purple-50 text-purple-700",
  Income: "bg-green-50 text-green-700",
  Expense: "bg-amber-50 text-amber-800",
};

export default function AccAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [typeFilter, setTypeFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getAccounts({ type: typeFilter });
      setAccounts(data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleSeed = async () => {
    try {
      await seedChartOfAccounts();
      toast.success("Chart of Accounts seeded");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Seed failed");
    }
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (a) => { setEditing(a); setForm({ code: a.code, name: a.name, type: a.type, subType: a.subType || "", description: a.description || "" }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await updateAccount(editing._id, form); toast.success("Account updated"); }
      else { await createAccount(form); toast.success("Account created"); }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this account?")) return;
    try { await deleteAccount(id); toast.success("Deleted"); load(); }
    catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  const grouped = TYPES.reduce((acc, t) => {
    acc[t] = accounts.filter((a) => a.type === t);
    return acc;
  }, {});

  const filtered = typeFilter ? { [typeFilter]: grouped[typeFilter] } : grouped;

  return (
    <div>
      <PageHeader title="Chart of Accounts">
        <Btn variant="ghost" onClick={handleSeed}><RefreshCw size={14} /> Seed Defaults</Btn>
        <Btn onClick={openCreate}><Plus size={14} /> Add Account</Btn>
      </PageHeader>

      <div className="flex gap-2 mb-4">
        {["", ...TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${typeFilter === t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {t || "All"}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center py-10 text-slate-400">Loading…</p> : (
        <div className="space-y-6">
          {Object.entries(filtered).map(([type, accs]) => accs.length === 0 ? null : (
            <div key={type}>
              <h3 className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-lg mb-2 w-fit ${TYPE_COLORS[type]}`}>{type}</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Sub-Type</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-left">System</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accs.map((acc) => (
                      <tr key={acc._id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-slate-500">{acc.code}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{acc.name}</td>
                        <td className="px-4 py-2 text-slate-500">{acc.subType || "—"}</td>
                        <td className="px-4 py-2 text-right font-semibold">{fmt(acc.balance)}</td>
                        <td className="px-4 py-2">{acc.isSystem ? <span className="text-xs bg-slate-200 rounded px-2 py-0.5">System</span> : null}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 justify-end">
                            <Btn variant="ghost" onClick={() => openEdit(acc)}><Pencil size={12} /></Btn>
                            {!acc.isSystem && <Btn variant="danger" onClick={() => handleDelete(acc._id)}><Trash2 size={12} /></Btn>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Account" : "New Account"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. 1010" />
            <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="col-span-2" />
            <Select label="Type *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, subType: "" })} required>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
            <Select label="Sub-Type" value={form.subType} onChange={(e) => setForm({ ...form, subType: e.target.value })}>
              <option value="">Select…</option>
              {(SUB_TYPES[form.type] || []).map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-2" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn type="submit">{editing ? "Update" : "Create"}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}
