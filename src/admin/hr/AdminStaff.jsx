import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Search, Edit2, Trash2, Eye, Phone, Mail,
  Building2, BadgeCheck, Loader2, X, ChevronDown, Filter,
  Calendar, IndianRupee, UserCheck, UserX, Save, AlertTriangle
} from "lucide-react";
import {
  getAllStaff, createStaff, updateStaff, deleteStaff
} from "../../api/hrApi";
import toast from "react-hot-toast";

const ROLES = ["admin", "manager", "staff"];
const DEPARTMENTS = ["Kitchen", "Waiter", "Service", "Management", "Accounts", "Housekeeping", "Security", "Other"];
const STATUSES = ["active", "inactive", "on_leave"];
const EMPTY_FORM = {
  name: "", email: "", phone: "", role: "staff", department: "Kitchen",
  designation: "", baseSalary: "", joiningDate: "", status: "active", notes: ""
};

function Badge({ value }) {
  const map = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    on_leave: "bg-amber-50 text-amber-700 border-amber-100",
    admin: "bg-purple-50 text-purple-700 border-purple-100",
    manager: "bg-blue-50 text-blue-700 border-blue-100",
    staff: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[value] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {value?.replace("_", " ")}
    </span>
  );
}

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [viewStaff, setViewStaff] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllStaff({ limit: 200 });
      setStaff(Array.isArray(res.data) ? res.data : res.data?.staff || []);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.phone?.includes(q);
    const matchRole = !roleFilter || s.role === roleFilter;
    const matchDept = !deptFilter || s.department === deptFilter;
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchRole && matchDept && matchStatus;
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || "", email: s.email || "", phone: s.phone || "",
      role: s.role || "staff", department: s.department || "",
      designation: s.designation || "", baseSalary: s.baseSalary || "",
      joiningDate: s.joiningDate ? s.joiningDate.split("T")[0] : "",
      status: s.status || "active", notes: s.notes || ""
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateStaff(editing._id, form);
        toast.success("Staff updated");
      } else {
        if (!form.password) { toast.error("Password is required for new staff"); setSaving(false); return; }
        await createStaff(form);
        toast.success("Staff created");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save staff");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this staff member? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteStaff(id);
      toast.success("Staff deleted");
      setStaff(prev => prev.filter(s => s._id !== id));
    } catch {
      toast.error("Failed to delete staff");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{staff.length} total staff members</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" />Add Staff
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400" />
        </div>
        {[{v: roleFilter, set: setRoleFilter, opts: ROLES, placeholder: "All Roles"},
          {v: deptFilter, set: setDeptFilter, opts: DEPARTMENTS, placeholder: "All Depts"},
          {v: statusFilter, set: setStatusFilter, opts: STATUSES, placeholder: "All Status"}
        ].map(({ v, set, opts, placeholder }, i) => (
          <div key={i} className="relative">
            <select value={v} onChange={e => set(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 outline-none cursor-pointer">
              <option value="">{placeholder}</option>
              {opts.map(o => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ))}
        {(search || roleFilter || deptFilter || statusFilter) && (
          <button onClick={() => { setSearch(""); setRoleFilter(""); setDeptFilter(""); setStatusFilter(""); }}
            className="flex items-center gap-1 px-3 py-2 text-rose-600 text-sm hover:bg-rose-50 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" />Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No staff found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Staff", "Contact", "Role", "Department", "Salary", "Joined", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {s.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.designation || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-600">{s.email}</p>
                      <p className="text-xs text-slate-400">{s.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3"><Badge value={s.role} /></td>
                    <td className="px-4 py-3 text-slate-600">{s.department || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {s.baseSalary ? `₹${Number(s.baseSalary).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-3"><Badge value={s.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewStaff(s)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s._id)}
                          disabled={deleting === s._id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50">
                          {deleting === s._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">{editing ? "Edit Staff" : "Add New Staff"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Full Name *", key: "name", type: "text" },
                  { label: "Email *", key: "email", type: "email" },
                  { label: "Phone", key: "phone", type: "tel" },
                  { label: "Designation", key: "designation", type: "text" },
                  { label: "Base Salary (₹)", key: "baseSalary", type: "number" },
                  { label: "Joining Date", key: "joiningDate", type: "date" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input type={type} value={form[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-slate-700" />
                  </div>
                ))}
                {!editing && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                    <input type="password" value={form.password || ""}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-slate-700" />
                  </div>
                )}
                {[
                  { label: "Role", key: "role", opts: ROLES },
                  { label: "Department", key: "department", opts: DEPARTMENTS },
                  { label: "Status", key: "status", opts: STATUSES },
                ].map(({ label, key, opts }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-slate-700 bg-white">
                      {opts.map(o => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-slate-700 resize-none" />
              </div>
            </form>
            <div className="flex gap-3 p-6 border-t border-slate-200">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing ? "Save Changes" : "Create Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Staff Profile</h2>
              <button onClick={() => setViewStaff(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                  {viewStaff.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{viewStaff.name}</p>
                  <p className="text-sm text-slate-500">{viewStaff.designation || viewStaff.role}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge value={viewStaff.role} /><Badge value={viewStaff.status} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { icon: Mail, label: "Email", value: viewStaff.email },
                  { icon: Phone, label: "Phone", value: viewStaff.phone || "—" },
                  { icon: Building2, label: "Department", value: viewStaff.department || "—" },
                  { icon: IndianRupee, label: "Base Salary", value: viewStaff.baseSalary ? `₹${Number(viewStaff.baseSalary).toLocaleString("en-IN")}` : "—" },
                  { icon: Calendar, label: "Joined", value: viewStaff.joiningDate ? new Date(viewStaff.joiningDate).toLocaleDateString("en-IN") : "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">{label}</span>
                    </div>
                    <p className="text-slate-700 font-medium text-xs">{value}</p>
                  </div>
                ))}
              </div>
              {viewStaff.notes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{viewStaff.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => { openEdit(viewStaff); setViewStaff(null); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium">
                <Edit2 className="w-4 h-4" />Edit
              </button>
              <button onClick={() => setViewStaff(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
