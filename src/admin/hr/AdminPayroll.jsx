import React, { useState, useEffect, useCallback } from "react";
import {
  Banknote, Plus, Send, Download, Edit2, Loader2, Search,
  ChevronDown, X, RefreshCw, CheckCircle2, Clock, IndianRupee,
  Users, Zap, Save, FileText, Mail, Info
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
    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </span>
    : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider">
        <Clock className="w-3 h-3" /> Pending
      </span>;
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
    if (!window.confirm(`Generate payroll for all ${staffWithoutPayroll.length} staff?`)) return;
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
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payroll Hub</h1>
          <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Manage and generate staff compensation for {MONTHS[month - 1]} {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm active:scale-95">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {staffWithoutPayroll.length > 0 && (
            <button onClick={handleBulkGenerate} disabled={bulkGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-2xl text-sm font-bold disabled:opacity-50 transition-all shadow-lg active:scale-95">
              {bulkGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-400" />}
              Auto-Generate ({staffWithoutPayroll.length})
            </button>
          )}
          <button onClick={() => { setGenForm({ staffId: "", bonus: 0, overtime: 0 }); setGenerateModal(true); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95">
            <Plus className="w-5 h-5" /> Manual Entry
          </button>
        </div>
      </div>

      {/* Analytics & Controls Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-center gap-6 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Period Selection</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select value={month} onChange={e => setMonth(Number(e.target.value))}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors">
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <select value={year} onChange={e => setYear(Number(e.target.value))}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {[
              { label: "Total Staff", value: payrolls.length, icon: Users, color: "text-slate-900" },
              { label: "Paid Trans.", value: paidCount, icon: CheckCircle2, color: "text-emerald-600" },
              { label: "Outstanding", value: pendingCount, icon: Clock, color: "text-amber-600" },
              { label: "Total Payout", value: `₹${totalNetSalary.toLocaleString("en-IN")}`, icon: Banknote, color: "text-indigo-600" },
            ].map((item, idx) => (
              <div key={idx} className={`p-1 ${idx !== 3 ? 'md:border-r border-slate-100' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className={`w-4 h-4 ${item.color} opacity-70`} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                </div>
                <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by staff name or role..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-12 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all" />
          {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>}
        </div>
        <div className="relative w-full md:w-56">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all">
            <option value="">All Statuses</option>
            <option value="pending">Pending Only</option>
            <option value="paid">Paid Only</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Syncing Payroll Data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <FileText className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-slate-800 font-bold text-lg">No Records Found</h3>
            <p className="text-slate-400 text-sm mt-1">There are no payroll entries for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 uppercase tracking-[0.1em] text-[10px] font-black text-slate-400">
                  <th className="px-8 py-5 text-left">Member Profile</th>
                  <th className="px-6 py-5 text-left">Base Pay</th>
                  <th className="px-6 py-5 text-left">Absence</th>
                  <th className="px-6 py-5 text-left">Deductions</th>
                  <th className="px-6 py-5 text-left">Add-ons (Bonus/OT)</th>
                  <th className="px-6 py-5 text-left">Net Amount</th>
                  <th className="px-6 py-5 text-left">Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => (
                  <tr key={p._id} className="hover:bg-indigo-50/30 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 text-base font-black shadow-sm group-hover:scale-110 transition-transform">
                          {p.staff?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-none">{p.staff?.name || "—"}</p>
                          <p className="text-[11px] text-slate-400 font-bold uppercase mt-1.5 tracking-wider">{p.staff?.designation || "General Staff"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-600">₹{Number(p.baseSalary || 0).toLocaleString("en-IN")}</td>
                    <td className="px-6 py-5">
                      <div className={`px-3 py-1 inline-flex items-center gap-1.5 rounded-lg text-xs font-black ${p.absentDays > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-400'}`}>
                        {p.absentDays || 0} D
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-rose-500">-₹{Number(p.leaveDeduction || 0).toLocaleString("en-IN")}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5 font-bold text-[13px]">
                        <span className="text-emerald-600">+₹{Number(p.bonus || 0).toLocaleString("en-IN")} <small className="text-[10px] text-slate-400 font-bold uppercase ml-1">Bonus</small></span>
                        <span className="text-emerald-600">+₹{Number(p.overtime || 0).toLocaleString("en-IN")} <small className="text-[10px] text-slate-400 font-bold uppercase ml-1">OT</small></span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="px-4 py-2 bg-indigo-50 rounded-2xl inline-block">
                        <span className="text-indigo-700 font-black text-lg tracking-tight">₹{Number(p.netSalary || 0).toLocaleString("en-IN")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5"><StatusBadge status={p.status} /></td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 group-hover:translate-x-0 transition-all">
                        <button onClick={() => openEdit(p)} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors" title="Edit">
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button onClick={() => handleSendPayslip(p._id, p.staff?.name)} disabled={sending === p._id} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors disabled:opacity-30" title="Send Email">
                          {sending === p._id ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Mail className="w-4.5 h-4.5" />}
                        </button>
                        <button onClick={() => handleDownloadPDF(p._id)} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Download">
                          <Download className="w-4.5 h-4.5" />
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-8 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Entry</h2>
              <button onClick={() => setGenerateModal(false)} className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <div className="bg-indigo-600 text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-indigo-100">
                <div className="p-2 bg-white/20 rounded-xl"><Clock className="w-5 h-5" /></div>
                <p className="text-sm font-bold uppercase tracking-widest">{MONTHS[month - 1]} {year} Cycle</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Select Staff Member</label>
                  <select value={genForm.staffId} onChange={e => setGenForm(p => ({ ...p, staffId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all">
                    <option value="">Select an employee...</option>
                    {allStaff.map(s => (
                      <option key={s._id} value={s._id}>{s.name} (₹{s.baseSalary})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Bonus</label>
                    <input type="number" min={0} value={genForm.bonus}
                      onChange={e => setGenForm(p => ({ ...p, bonus: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Overtime</label>
                    <input type="number" min={0} value={genForm.overtime}
                      onChange={e => setGenForm(p => ({ ...p, overtime: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 p-8 bg-slate-50/50">
              <button onClick={() => setGenerateModal(false)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
                Discard
              </button>
              <button onClick={handleGenerate} disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 active:scale-95">
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Styled similarly) */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-8 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Edit Payroll</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5">{editModal.staff?.name}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Base</p>
                  <p className="text-[13px] font-black text-slate-700">₹{editModal.baseSalary}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Absents</p>
                  <p className="text-[13px] font-black text-slate-700">{editModal.absentDays || 0}</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-tighter">Loss</p>
                  <p className="text-[13px] font-black text-rose-600">₹{editModal.leaveDeduction}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Adjustment Bonus</label>
                  <input type="number" value={editForm.bonus}
                    onChange={e => setEditForm(p => ({ ...p, bonus: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Overtime Pay</label>
                  <input type="number" value={editForm.overtime}
                    onChange={e => setEditForm(p => ({ ...p, overtime: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Payment Lifecycle</label>
                <div className="flex gap-2">
                   {['pending', 'paid'].map((stat) => (
                     <button
                       key={stat}
                       onClick={() => setEditForm(p => ({ ...p, status: stat }))}
                       className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                         editForm.status === stat 
                         ? 'bg-slate-900 text-white shadow-lg' 
                         : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                       }`}
                     >
                       {stat}
                     </button>
                   ))}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">New Net Payable</p>
                  <h3 className="text-2xl font-black text-emerald-700 tracking-tighter">
                    ₹{Math.max(0, Number(editModal.baseSalary || 0) - Number(editModal.leaveDeduction || 0) + Number(editForm.bonus || 0) + Number(editForm.overtime || 0)).toLocaleString("en-IN")}
                  </h3>
                </div>
                <Banknote className="w-10 h-10 text-emerald-200" />
              </div>
            </div>
            <div className="flex gap-4 p-8 bg-slate-50/50 border-t border-slate-100">
              <button onClick={() => setEditModal(null)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 active:scale-95">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}