import React, { useState, useEffect, useCallback } from "react";
import {
  Banknote, Plus, Send, Download, Edit2, Loader2, Search,
  ChevronDown, X, RefreshCw, CheckCircle2, Clock, IndianRupee,
  Users, Zap, Save, FileText, Mail
} from "lucide-react";
import {
  getPayrolls, generatePayroll, generatePayrollAll, updatePayroll,
  sendPayslip, getPayslipPDFUrl, getAllStaff
} from "../../api/hrApi";
import toast from "react-hot-toast";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function StatusBadge({ status }) {
  return status === "paid"
    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
}

export default function AdminPayroll() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [payrolls, setPayrolls] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [sending, setSending] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [genForm, setGenForm] = useState({ staffId: "", bonus: 0, overtime: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, staffRes] = await Promise.all([
        getPayrolls({ month, year }),
        getAllStaff({ status: "active", limit: 200 })
      ]);
      setPayrolls(Array.isArray(payRes.data) ? payRes.data : payRes.data?.payrolls || []);
      setAllStaff(Array.isArray(staffRes.data) ? staffRes.data : staffRes.data?.staff || []);
    } catch {
      toast.error("Failed to load payroll");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const filtered = payrolls.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.staff?.name?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalNetSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const paidCount = payrolls.filter(p => p.status === "paid").length;
  const pendingCount = payrolls.filter(p => p.status === "pending").length;

  // Staff that don't have payroll yet this month
  const staffWithoutPayroll = allStaff.filter(s => !payrolls.find(p => (p.staff?._id || p.staff) === s._id));

  const handleGenerate = async () => {
    if (!genForm.staffId) { toast.error("Select a staff member"); return; }
    setGenerating(true);
    try {
      await generatePayroll({ staffId: genForm.staffId, month, year, bonus: Number(genForm.bonus), overtime: Number(genForm.overtime) });
      toast.success("Payroll generated");
      setGenerateModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!window.confirm(`Generate payroll for all ${staffWithoutPayroll.length} staff without payroll this month?`)) return;
    setBulkGenerating(true);
    try {
      await generatePayrollAll({ month, year });
      toast.success("Bulk payroll generated");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Bulk generation failed");
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleSendPayslip = async (id, staffName) => {
    setSending(id);
    try {
      await sendPayslip(id);
      toast.success(`Payslip sent to ${staffName}`);
    } catch {
      toast.error("Failed to send payslip");
    } finally {
      setSending(null);
    }
  };

  const handleDownloadPDF = (id) => {
    const isProd = import.meta.env.PROD;
    const baseURL = isProd
      ? import.meta.env.VITE_API_BASE_URL || "https://backend-res-ikeb.onrender.com/api"
      : "/api";
    window.open(`${baseURL}/hr/payroll/${id}/payslip-pdf`, "_blank");
  };

  const openEdit = (p) => {
    setEditModal(p);
    setEditForm({ bonus: p.bonus || 0, overtime: p.overtime || 0, status: p.status || "pending" });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updatePayroll(editModal._id, { bonus: Number(editForm.bonus), overtime: Number(editForm.overtime), status: editForm.status });
      toast.success("Payroll updated");
      setEditModal(null);
      load();
    } catch {
      toast.error("Failed to update payroll");
    } finally {
      setSaving(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payroll Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{MONTHS[month - 1]} {year}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={load} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
          {staffWithoutPayroll.length > 0 && (
            <button onClick={handleBulkGenerate} disabled={bulkGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
              {bulkGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Generate All ({staffWithoutPayroll.length})
            </button>
          )}
          <button onClick={() => { setGenForm({ staffId: "", bonus: 0, overtime: 0 }); setGenerateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" />Generate Payroll
          </button>
        </div>
      </div>

      {/* Month/Year selector + summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 outline-none">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 outline-none">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex gap-4 flex-wrap ml-2">
          {[
            { label: "Total Records", value: payrolls.length, color: "text-slate-700" },
            { label: "Paid", value: paidCount, color: "text-emerald-600" },
            { label: "Pending", value: pendingCount, color: "text-amber-600" },
            { label: "Total Payout", value: `₹${totalNetSalary.toLocaleString("en-IN")}`, color: "text-indigo-700 font-semibold" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search staff…"
            className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400" />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-slate-400" /></button>}
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-sm text-slate-700 outline-none">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Banknote className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No payroll records for {MONTHS[month - 1]} {year}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-4 text-left">Staff Name / Role</th>
                  <th className="px-5 py-4 text-left font-bold">Base Salary (₹)</th>
                  <th className="px-5 py-4 text-left">Absent Days</th>
                  <th className="px-5 py-4 text-left">Deduction (₹)</th>
                  <th className="px-5 py-4 text-left">Bonus (₹)</th>
                  <th className="px-5 py-4 text-left">Overtime (₹)</th>
                  <th className="px-5 py-4 text-left font-bold">Net Salary (₹)</th>
                  <th className="px-5 py-4 text-left">Payment Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          {p.staff?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{p.staff?.name || "—"}</p>
                          <p className="text-[11px] text-slate-400 font-medium uppercase mt-0.5 tracking-tight">{p.staff?.designation || p.staff?.department || "General Staff"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span className="text-slate-400 font-medium text-xs">₹</span>
                        {Number(p.baseSalary || 0).toLocaleString("en-IN")}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`px-2.5 py-1 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold ${p.absentDays > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${p.absentDays > 0 ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                        {p.absentDays || 0} days
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-rose-500 tabular-nums">
                      <span className="text-[10px] mr-0.5 font-medium opacity-70">₹</span>
                      {Number(p.leaveDeduction || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 font-bold text-emerald-600 tabular-nums">
                      <span className="text-[10px] mr-0.5 font-medium opacity-70">₹</span>
                      {Number(p.bonus || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 font-bold text-emerald-600 tabular-nums">
                      <span className="text-[10px] mr-0.5 font-medium opacity-70">₹</span>
                      {Number(p.overtime || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 bg-indigo-50/30">
                      <div className="flex items-center gap-1.5 font-black text-indigo-700 text-base tabular-nums">
                        <span className="text-[11px] font-bold">₹</span>
                        {Number(p.netSalary || 0).toLocaleString("en-IN")}
                      </div>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(p)} title="Edit Payroll"
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-100/50 rounded-xl transition-all shadow-sm bg-white border border-slate-100">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleSendPayslip(p._id, p.staff?.name)} disabled={sending === p._id} title="Send Email"
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/50 rounded-xl transition-all shadow-sm bg-white border border-slate-100 disabled:opacity-50">
                          {sending === p._id ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <Mail className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDownloadPDF(p._id)} title="Download PDF"
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100/50 rounded-xl transition-all shadow-sm bg-white border border-slate-100">
                          <Download className="w-4 h-4" />
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

      {/* Generate Single Modal */}
      {generateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Generate Payroll</h2>
              <button onClick={() => setGenerateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-slate-600">
                Generating for <strong>{MONTHS[month - 1]} {year}</strong>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Staff Member *</label>
                <select value={genForm.staffId} onChange={e => setGenForm(p => ({ ...p, staffId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 bg-white">
                  <option value="">Select staff…</option>
                  {allStaff.map(s => (
                    <option key={s._id} value={s._id}>{s.name} — ₹{Number(s.baseSalary || 0).toLocaleString("en-IN")}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bonus (₹)</label>
                  <input type="number" min={0} value={genForm.bonus}
                    onChange={e => setGenForm(p => ({ ...p, bonus: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Overtime (₹)</label>
                  <input type="number" min={0} value={genForm.overtime}
                    onChange={e => setGenForm(p => ({ ...p, overtime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700" />
                </div>
              </div>
              <p className="text-xs text-slate-400">Net Salary = Base Salary – Leave Deduction + Bonus + Overtime</p>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-200">
              <button onClick={() => setGenerateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleGenerate} disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Edit Payroll</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editModal.staff?.name} · {MONTHS[month - 1]} {year}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 rounded-xl p-4">
                <div><span className="text-slate-400">Base Salary</span><p className="font-semibold text-slate-700 mt-0.5">₹{Number(editModal.baseSalary || 0).toLocaleString("en-IN")}</p></div>
                <div><span className="text-slate-400">Absent Days</span><p className="font-semibold text-slate-700 mt-0.5">{editModal.absentDays || 0}</p></div>
                <div><span className="text-slate-400">Deduction</span><p className="font-semibold text-rose-600 mt-0.5">₹{Number(editModal.leaveDeduction || 0).toLocaleString("en-IN")}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bonus (₹)</label>
                  <input type="number" min={0} value={editForm.bonus}
                    onChange={e => setEditForm(p => ({ ...p, bonus: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Overtime (₹)</label>
                  <input type="number" min={0} value={editForm.overtime}
                    onChange={e => setEditForm(p => ({ ...p, overtime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 bg-white">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm">
                Estimated Net: <strong className="text-indigo-700">
                  ₹{Math.max(0, Number(editModal.baseSalary || 0) - Number(editModal.leaveDeduction || 0) + Number(editForm.bonus || 0) + Number(editForm.overtime || 0)).toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-200">
              <button onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
