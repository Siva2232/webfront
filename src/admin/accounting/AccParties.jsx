import { useEffect, useState } from "react";
import { getParties, createParty, updateParty, deleteParty } from "../../api/accApi";
import { PageHeader, Btn, Table, Modal, Input, Select, StatusBadge, fmt, fmtDate, Card } from "./AccShared";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const EMPTY = { name: "", type: "Customer", phone: "", email: "", address: "", gstin: "", openingBalance: 0, notes: "" };
const TYPES = ["Customer", "Supplier", "Vendor", "Employee", "Both", "Other"];

export default function AccParties() {
  const [parties, setParties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getParties({ search, type: typeFilter });
      setParties(data.parties);
      setTotal(data.total);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, typeFilter]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p, openingBalance: p.openingBalance ?? 0 }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateParty(editing._id, form);
        toast.success("Party updated");
      } else {
        await createParty(form);
        toast.success("Party created");
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this party?")) return;
    try {
      await deleteParty(id);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const columns = [
    { label: "Name", render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { label: "Type", render: (r) => <span className="text-xs bg-slate-100 rounded px-2 py-0.5">{r.type}</span> },
    { label: "Phone", key: "phone" },
    { label: "Email", key: "email" },
    { label: "Balance", render: (r) => (
      <span className={r.balance >= 0 ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
        {fmt(r.balance)}
      </span>
    )},
    { label: "Actions", render: (r) => (
      <div className="flex gap-1">
        <Btn variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil size={13} /></Btn>
        <Btn variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }}><Trash2 size={13} /></Btn>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title={`Parties (${total})`}>
        <Btn onClick={openCreate}><Plus size={15} /> Add Party</Btn>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email…"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
        >
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {loading ? <p className="text-center py-10 text-slate-400">Loading…</p> : (
        <Table columns={columns} data={parties} />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Party" : "Add Party"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="col-span-2" />
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            <Input label="Opening Balance (₹)" type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: +e.target.value })} />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="col-span-2" />
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-2" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary">{editing ? "Update" : "Create"}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}
