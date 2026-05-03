import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Search, Edit2, Trash2, Eye, Phone, Mail,
  Building2, BadgeCheck, Loader2, X, ChevronDown, Filter,
  Calendar, IndianRupee, UserCheck, UserX, Save, AlertTriangle,
  Briefcase, Hash, MoreHorizontal, ArrowRight
} from "lucide-react";
import {
  getAllStaff, createStaff, updateStaff, deleteStaff
} from "../../api/hrApi";
import toast from "react-hot-toast";
import StaffBadge from "./staff/components/StaffBadge";

const ROLES = ["admin", "manager", "staff"];
const DEPARTMENTS = [
  "Kitchen", "Waiter", "Service", "Management", "Accounts", "Housekeeping",
  "Security", "POS Cashier", "Other",
];
const STATUSES = ["active", "inactive", "on_leave"];
const EMPTY_FORM = {
  name: "", email: "", phone: "", role: "staff", department: "Kitchen",
  designation: "", baseSalary: "", joiningDate: "", status: "active", notes: "",
};

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); 
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
    const matchDept =
      !deptFilter ||
      s.department === deptFilter ||
      (deptFilter === "POS Cashier" && s.isCashier);
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchRole && matchDept && matchStatus;
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || "", email: s.email || "", phone: s.phone || "",
      role: s.role || "staff",
      department: s.isCashier ? "POS Cashier" : (s.department || ""),
      designation: s.designation || "", baseSalary: s.baseSalary || "",
      joiningDate: s.joiningDate ? s.joiningDate.split("T")[0] : "",
      status: s.status || "active", notes: s.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        isCashier: form.department === "POS Cashier",
      };
      if (editing) {
        await updateStaff(editing._id, payload);
        toast.success("Staff profile updated");
      } else {
        if (!form.password) { toast.error("Password is required for new accounts"); setSaving(false); return; }
        await createStaff(payload);
        toast.success("Staff member added");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanent Action: Are you sure you want to delete this staff record?")) return;
    setDeleting(id);
    try {
      await deleteStaff(id);
      toast.success("Staff record removed");
      setStaff(prev => prev.filter(s => s._id !== id));
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Staff Directory</h1>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            <Users className="w-4 h-4" /> Total active records: <span className="text-indigo-600">{staff.length}</span>
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95">
          <Plus className="w-4 h-4" /> Add New Member
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, contact, or email..."
            className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400 font-medium" />
        </div>

        <div className="flex items-center gap-2 flex-wrap p-1">
          {[
            { v: roleFilter, set: setRoleFilter, opts: ROLES, placeholder: "All Roles" },
            { v: deptFilter, set: setDeptFilter, opts: DEPARTMENTS, placeholder: "All Depts" },
            { v: statusFilter, set: setStatusFilter, opts: STATUSES, placeholder: "All Status" }
          ].map(({ v, set, opts, placeholder }, i) => (
            <div key={i} className="relative">
              <select value={v} onChange={e => set(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-indigo-300 transition-colors uppercase tracking-wider">
                <option value="">{placeholder}</option>
                {opts.map(o => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ))}
          
          {(search || roleFilter || deptFilter || statusFilter) && (
            <button onClick={() => { setSearch(""); setRoleFilter(""); setDeptFilter(""); setStatusFilter(""); }}
              className="px-4 py-2 text-rose-500 text-xs font-bold hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 uppercase tracking-tighter">
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-400">Syncing directory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <div className="p-4 bg-slate-50 rounded-full">
                <Users className="w-12 h-12 opacity-20" />
            </div>
            <div className="text-center">
                <p className="text-base font-bold text-slate-800">No members match your criteria</p>
                <p className="text-xs">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {["Member", "Contact Info", "System Role", "Workplace", "Compensation", "Hire Date", "Status", ""].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(s => (
                  <tr key={s._id} className="group hover:bg-indigo-50/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 text-sm font-bold flex-shrink-0 group-hover:from-indigo-500 group-hover:to-violet-500 group-hover:text-white transition-all duration-300">
                          {s.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{s.name}</p>
                          <p className="text-[11px] font-medium text-slate-400 truncate tracking-tight">{s.designation || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5"><Mail className="w-3 h-3 opacity-40" />{s.email}</p>
                        <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3 opacity-40" />{s.phone || "—"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StaffBadge value={s.role} /></td>
                    <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-slate-300" />
                            {s.isCashier || s.department === "POS Cashier"
                              ? "POS Cashier"
                              : (s.department || "—")}
                        </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-slate-800 flex items-center">
                        <IndianRupee className="w-3 h-3" />
                        {s.baseSalary ? Number(s.baseSalary).toLocaleString("en-IN") : "0"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-500 uppercase">
                        {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString("en-IN", { month: 'short', day: '2-digit', year: 'numeric' }) : "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4"><StaffBadge value={s.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewStaff(s)} title="View Profile"
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-indigo-100 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(s)} title="Edit Record"
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-amber-100 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s._id)} disabled={deleting === s._id} title="Delete Record"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-rose-100 transition-all disabled:opacity-50">
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

      {/* Profile/Upsert Modal — fits viewport; body scrolls inside card */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center box-border overflow-x-hidden overflow-y-auto overscroll-contain bg-slate-900/60 backdrop-blur-[2px] p-2 sm:p-4"
          style={{
            paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))",
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div
            className="relative my-auto flex w-full max-w-lg min-h-0 max-h-[calc(100svh-1rem)] sm:max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-in fade-in zoom-in duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0 bg-slate-50 border-b border-slate-100">
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-900 tracking-tight truncate">
                  {editing ? "Update staff" : "New staff"}
                </h2>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">HR</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 shrink-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 bg-white">
              <div className="min-h-0 flex-1 touch-pan-y space-y-4 overflow-y-auto overscroll-y-contain px-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">
                  {[
                    { label: "Full Name", key: "name", type: "text", required: true },
                    { label: "Official Email", key: "email", type: "email", required: true },
                    { label: "Phone Number", key: "phone", type: "tel" },
                    { label: "Job Title / Designation", key: "designation", type: "text" },
                    { label: "Monthly Base Salary (₹)", key: "baseSalary", type: "number" },
                    { label: "Joining Date", key: "joiningDate", type: "date" },
                  ].map(({ label, key, type, required }) => (
                    <div key={key}>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        {label} {required && "*"}
                      </label>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white text-slate-800"
                      />
                    </div>
                  ))}
                  {!editing && (
                    <div className="sm:col-span-2">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Portal Password *
                      </label>
                      <input
                        type="password"
                        value={form.password || ""}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white text-slate-800"
                      />
                    </div>
                  )}
                  {[
                    { label: "System Role", key: "role", opts: ROLES },
                    { label: "Work Department", key: "department", opts: DEPARTMENTS },
                    { label: "Employment Status", key: "status", opts: STATUSES },
                  ].map(({ label, key, opts }) => (
                    <div key={key} className={key === "status" ? "sm:col-span-2" : ""}>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</label>
                      <div className="relative">
                        <select
                          value={form[key]}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white text-slate-800 cursor-pointer"
                        >
                          {opts.map((o) => (
                            <option key={o} value={o}>
                              {o.replace("_", " ").toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white text-slate-800 resize-none"
                    placeholder="Optional internal notes…"
                  />
                </div>
              </div>

              <div className="flex gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 shrink-0 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white transition-all active:scale-[0.99]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? "Save" : "Add staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff preview — fits viewport; no negative margins (prevents top clip) */}
      {viewStaff && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center box-border overflow-x-hidden overflow-y-auto overscroll-contain bg-slate-900/60 backdrop-blur-[2px] p-2 sm:p-4"
          style={{
            paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))",
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="relative my-auto flex w-full max-w-md min-h-0 max-h-[calc(100svh-1rem)] sm:max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="relative h-12 shrink-0 bg-gradient-to-r from-indigo-500 to-violet-600">
              <button
                type="button"
                onClick={() => setViewStaff(null)}
                className="absolute top-1.5 right-2.5 p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-2 pt-3">
                <div className="mb-3 flex justify-center sm:justify-start">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-slate-100 p-0.5 shadow-md ring-2 ring-slate-100">
                    <div className="flex h-full w-full items-center justify-center rounded-[0.625rem] bg-white text-lg font-black text-indigo-600">
                      {viewStaff.name?.charAt(0)?.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="mb-3 text-center sm:text-left">
                  <h2 className="text-base font-black tracking-tight text-slate-900">{viewStaff.name}</h2>
                  <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-tight text-indigo-600 sm:justify-start">
                    <Briefcase className="h-3.5 w-3.5 shrink-0" /> {viewStaff.designation || viewStaff.role}
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <StaffBadge value={viewStaff.role} />
                    <StaffBadge value={viewStaff.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {[
                    { icon: Mail, label: "Email", value: viewStaff.email },
                    { icon: Phone, label: "Phone", value: viewStaff.phone || "—" },
                    {
                      icon: Building2,
                      label: "Department",
                      value:
                        viewStaff.isCashier || viewStaff.department === "POS Cashier"
                          ? "POS Cashier"
                          : viewStaff.department || "Unassigned",
                    },
                    {
                      icon: IndianRupee,
                      label: "Salary",
                      value: viewStaff.baseSalary
                        ? `₹${Number(viewStaff.baseSalary).toLocaleString("en-IN")}`
                        : "0",
                    },
                    {
                      icon: Calendar,
                      label: "Joined",
                      value: viewStaff.joiningDate
                        ? new Date(viewStaff.joiningDate).toLocaleDateString("en-IN", { dateStyle: "medium" })
                        : "—",
                    },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm text-slate-400 shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-slate-50 p-3">
                <button
                  type="button"
                  onClick={() => {
                    openEdit(viewStaff);
                    setViewStaff(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.99]"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setViewStaff(null)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all active:scale-[0.99]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}