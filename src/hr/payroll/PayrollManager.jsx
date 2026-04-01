import { useEffect, useState, useCallback } from 'react';
import {
  getPayrolls, generatePayroll, generatePayrollAll,
  updatePayroll, sendPayslip, getAllStaff,
} from '../../api/hrApi';
import toast from 'react-hot-toast';
import {
  Wallet, Plus, RefreshCw, Send, CheckCircle, Download,
  ChevronLeft, ChevronRight, Filter, Users,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── Generate Single Modal ─────────────────────────────────────────── */
function GenerateModal({ staff, month, year, onClose, onGenerated }) {
  const [form, setForm] = useState({
    staffId: '', month, year, bonus: 0, overtime: 0, workingDays: 26, notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.staffId) return toast.error('Select a staff member');
    setSaving(true);
    try {
      const { data } = await generatePayroll({ ...form });
      toast.success('Payroll generated');
      onGenerated(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Generate Payroll</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Staff Member *</label>
            <select
              value={form.staffId}
              onChange={(e) => set('staffId', e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select staff…</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>{s.name} — {s.designation || s.role}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
              <select
                value={form.month}
                onChange={(e) => set('month', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
              <input
                type="number" value={form.year} min={2020} max={2099}
                onChange={(e) => set('year', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Working Days</label>
              <input type="number" value={form.workingDays} min={1} max={31}
                onChange={(e) => set('workingDays', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Bonus (₹)</label>
              <input type="number" value={form.bonus} min={0}
                onChange={(e) => set('bonus', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Overtime (₹)</label>
              <input type="number" value={form.overtime} min={0}
                onChange={(e) => set('overtime', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Optional notes…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
              {saving ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Edit Payroll Modal ─────────────────────────────────────────────── */
function EditPayrollModal({ payroll, onClose, onSaved }) {
  const [form, setForm] = useState({
    bonus: payroll.bonus || 0,
    overtime: payroll.overtime || 0,
    notes: payroll.notes || '',
    status: payroll.status || 'pending',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const netPreview = (
    (payroll.baseSalary || 0) -
    (payroll.leaveDeduction || 0) +
    Number(form.bonus) +
    Number(form.overtime)
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePayroll(payroll._id, form);
      toast.success('Payroll updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">
            Edit — {payroll.staff?.name} ({MONTHS[(payroll.month || 1) - 1]} {payroll.year})
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          {/* Read-only summary */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Base Salary</span><span className="font-medium">{fmt(payroll.baseSalary)}</span></div>
            <div className="flex justify-between text-red-600"><span>Leave Deduction</span><span>- {fmt(payroll.leaveDeduction)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Bonus</span><span>+ {fmt(form.bonus)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Overtime</span><span>+ {fmt(form.overtime)}</span></div>
            <div className="flex justify-between font-bold text-blue-700 border-t border-slate-200 pt-2 mt-1">
              <span>Net Salary</span><span>{fmt(netPreview < 0 ? 0 : netPreview)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Bonus (₹)</label>
              <input type="number" value={form.bonus} min={0}
                onChange={(e) => set('bonus', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Overtime (₹)</label>
              <input type="number" value={form.overtime} min={0}
                onChange={(e) => set('overtime', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input value={form.notes} onChange={(e) => set('notes', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Download Payslip PDF (client-side) ─────────────────────────────── */
function downloadPayslipPDF(payroll) {
  const doc = new jsPDF();
  const companyName = 'Restaurant Management System';
  const m = MONTHS[(payroll.month || 1) - 1];
  const staff = payroll.staff || {};

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(companyName, 14, 15);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Payslip — ${m} ${payroll.year}`, 14, 25);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  const infoRows = [
    ['Employee', staff.name || '—', 'Designation', staff.designation || '—'],
    ['Email', staff.email || '—', 'Department', staff.department || '—'],
    ['Phone', staff.phone || '—', 'Pay Period', `${m} ${payroll.year}`],
  ];
  let y = 45;
  infoRows.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold'); doc.text(l1 + ':', 14, y);
    doc.setFont('helvetica', 'normal'); doc.text(v1, 50, y);
    doc.setFont('helvetica', 'bold'); doc.text(l2 + ':', 120, y);
    doc.setFont('helvetica', 'normal'); doc.text(v2, 155, y);
    y += 7;
  });

  // Attendance
  y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Attendance Summary', 14, y); y += 5;
  doc.setDrawColor(200, 200, 200); doc.line(14, y, 196, y); y += 3;
  autoTable(doc, {
    startY: y,
    head: [['Working Days', 'Present', 'Absent', 'Leave']],
    body: [[payroll.workingDays, payroll.presentDays, payroll.absentDays, payroll.leaveDays]],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  // Salary breakdown
  y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Salary Breakdown', 14, y); y += 5;
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount (₹)']],
    body: [
      ['Base Salary', `+${Number(payroll.baseSalary || 0).toFixed(2)}`],
      ['Leave Deduction', `-${Number(payroll.leaveDeduction || 0).toFixed(2)}`],
      ['Bonus', `+${Number(payroll.bonus || 0).toFixed(2)}`],
      ['Overtime', `+${Number(payroll.overtime || 0).toFixed(2)}`],
      ['', ''],
      ['Net Salary', `${Number(payroll.netSalary || 0).toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    didParseCell(data) {
      if (data.row.index === 5) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [239, 246, 255];
        data.cell.styles.textColor = [29, 78, 216];
        data.cell.styles.fontSize = 10;
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageH - 18, 210, 18, 'F');
  doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated payslip. No signature required.', 105, pageH - 7, { align: 'center' });

  doc.save(`payslip_${staff.name?.replace(/\s/g, '_') || 'staff'}_${m}_${payroll.year}.pdf`);
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function PayrollManager() {
  const [payrolls, setPayrolls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenModal, setShowGenModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('');
  const [sending, setSending] = useState(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getPayrolls({
        month: filterMonth, year: filterYear,
        status: filterStatus || undefined, page, limit: 15,
      });
      setPayrolls(data.payrolls);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      toast.error('Failed to load payroll data');
    } finally { setLoading(false); }
  }, [filterMonth, filterYear, filterStatus, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getAllStaff({ limit: 200, status: 'active' }).then(({ data }) => setStaffList(data.staff));
  }, []);

  const handleSendPayslip = async (id, name) => {
    setSending(id);
    try {
      await sendPayslip(id);
      toast.success(`Payslip sent to ${name}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email send failed');
    } finally { setSending(null); }
  };

  const handleBulkGenerate = async () => {
    if (!window.confirm(`Generate payroll for ALL active staff for ${MONTHS[filterMonth - 1]} ${filterYear}?`)) return;
    setBulkGenerating(true);
    try {
      const { data } = await generatePayrollAll({ month: filterMonth, year: filterYear, workingDays: 26 });
      toast.success(`Generated ${data.results?.length || 0} payroll records`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk generation failed');
    } finally { setBulkGenerating(false); }
  };

  const totalNetSalary = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Payroll</h2>
          <p className="text-sm text-slate-500">{total} records · Total {fmt(totalNetSalary)}</p>
        </div>
        <div className="sm:ml-auto flex flex-wrap gap-2">
          <button
            onClick={handleBulkGenerate} disabled={bulkGenerating}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm transition disabled:opacity-60"
          >
            {bulkGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Generate All
          </button>
          <button
            onClick={() => setShowGenModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Generate
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filterMonth}
          onChange={(e) => { setFilterMonth(Number(e.target.value)); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input
          type="number" value={filterYear} min={2020} max={2099}
          onChange={(e) => { setFilterYear(Number(e.target.value)); setPage(1); }}
          className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Records', value: total, color: 'bg-blue-50 text-blue-700' },
          { label: 'Pending', value: payrolls.filter((p) => p.status === 'pending').length, color: 'bg-amber-50 text-amber-700' },
          { label: 'Paid', value: payrolls.filter((p) => p.status === 'paid').length, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Total Payout', value: fmt(totalNetSalary), color: 'bg-violet-50 text-violet-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border border-slate-200 p-4 ${color}`}>
            <p className="text-xs font-medium opacity-70">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Staff</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Base</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Deduction</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Bonus</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Net</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No payroll records found
                  </td>
                </tr>
              ) : (
                payrolls.map((p) => (
                  <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.staff?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{p.staff?.designation || p.staff?.role}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {MONTHS[(p.month || 1) - 1]} {p.year}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(p.baseSalary)}</td>
                    <td className="px-4 py-3 text-right text-red-600">- {fmt(p.leaveDeduction)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">+ {fmt(p.bonus)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{fmt(p.netSalary)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => setEditTarget(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
                          </svg>
                        </button>
                        {/* Download PDF */}
                        <button
                          onClick={() => downloadPayslipPDF(p)}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                          title="Download Payslip PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {/* Send Email */}
                        <button
                          onClick={() => handleSendPayslip(p._id, p.staff?.name)}
                          disabled={sending === p._id}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-60"
                          title="Send payslip email"
                        >
                          {sending === p._id
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : p.payslipSent
                              ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                              : <Send className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-2 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showGenModal && (
        <GenerateModal
          staff={staffList}
          month={filterMonth}
          year={filterYear}
          onClose={() => setShowGenModal(false)}
          onGenerated={load}
        />
      )}
      {editTarget && (
        <EditPayrollModal
          payroll={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
