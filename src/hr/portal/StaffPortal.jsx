import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useHR } from '../../context/HRContext';
import { getMyAttendance, getMyLeaves, getMyPayrolls, applyLeave, changeMyHRPassword } from '../../api/hrApi';
import toast from 'react-hot-toast';
import {
  LogOut, User, CalendarCheck, CalendarX2, Wallet,
  Download, Building2, Lock, Send, ChevronDown, ChevronUp,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const STATUS_COLORS = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-600',
  leave: 'bg-amber-100 text-amber-700',
  'half-day': 'bg-sky-100 text-sky-700',
  holiday: 'bg-violet-100 text-violet-700',
};
const LEAVE_STATUS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};

/* ── Tab Button ─────────────────────────────────────────────────────── */
function Tab({ label, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

/* ── Apply Leave Modal ───────────────────────────────────────────────── */
function ApplyLeaveModal({ onClose, onApplied }) {
  const [form, setForm] = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await applyLeave(form);
      toast.success('Leave application submitted');
      onApplied();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Apply for Leave</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Leave Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['sick','casual','annual','unpaid','other'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <textarea value={form.reason} onChange={(e) => set('reason', e.target.value)} required rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe reason for leave…" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
              {saving ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Change Password Modal ───────────────────────────────────────────── */
function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await changeMyHRPassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed successfully');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Change Password</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {[
            { label: 'Current Password', key: 'currentPassword' },
            { label: 'New Password', key: 'newPassword' },
            { label: 'Confirm New Password', key: 'confirmPassword' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input type="password" value={form[key]} onChange={(e) => set(key, e.target.value)} required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
              {saving ? 'Saving…' : 'Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Payslip PDF download ─────────────────────────────────────────────── */
function downloadPayslipPDF(payroll, staff) {
  const doc = new jsPDF();
  const m = MONTHS[(payroll.month || 1) - 1];
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('Restaurant Management System', 14, 15);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Payslip — ${m} ${payroll.year}`, 14, 25);

  doc.setTextColor(30, 41, 59); doc.setFontSize(9);
  const rows = [
    ['Employee', staff?.name || '—', 'Designation', staff?.designation || '—'],
    ['Email', staff?.email || '—', 'Department', staff?.department || '—'],
  ];
  let y = 45;
  rows.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold'); doc.text(l1 + ':', 14, y);
    doc.setFont('helvetica', 'normal'); doc.text(v1, 50, y);
    doc.setFont('helvetica', 'bold'); doc.text(l2 + ':', 120, y);
    doc.setFont('helvetica', 'normal'); doc.text(v2, 155, y);
    y += 7;
  });

  y += 4;
  autoTable(doc, {
    startY: y,
    head: [['Working Days', 'Present', 'Absent', 'Leave']],
    body: [[payroll.workingDays, payroll.presentDays, payroll.absentDays, payroll.leaveDays]],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
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

  const ph = doc.internal.pageSize.height;
  doc.setFillColor(248, 250, 252);
  doc.rect(0, ph - 18, 210, 18, 'F');
  doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text('Computer-generated payslip. No signature required.', 105, ph - 7, { align: 'center' });
  doc.save(`payslip_${m}_${payroll.year}.pdf`);
}

/* ── Main StaffPortal ─────────────────────────────────────────────────── */
import { useRef } from 'react';
import { Camera, CheckCircle2, MapPin } from 'lucide-react';

/* ── Selfie Attendance ──────────────────────────────────────────────── */
function SelfieAttendance() {
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      
      // Get location
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geo error", err),
        { enableHighAccuracy: true }
      );
    } catch (err) {
      toast.error("Camera access denied");
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg');
    setPhoto(data);
    stream.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const submitAttendance = async () => {
    setLoading(true);
    try {
      const blob = await (await fetch(photo)).blob();
      const formData = new FormData();
      formData.append('selfie', blob, 'selfie.jpg');
      if (location) formData.append('location', JSON.stringify(location));

      await selfieAttendance(formData);
      toast.success("Attendance marked successfully");
      setPhoto(null);
      // reload attendance list if needed
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark attendance");
    } finally { setLoading(false); }
  };

  if (photo) return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
      <img src={photo} alt="Selfie" className="w-48 h-48 object-cover rounded-full mx-auto mb-4 border-4 border-blue-500" />
      <div className="flex justify-center gap-3">
        <button onClick={() => setPhoto(null)} className="px-4 py-2 text-slate-600 font-bold uppercase text-xs">Retake</button>
        <button onClick={submitAttendance} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold uppercase text-xs shadow-lg shadow-blue-200 flex items-center gap-2">
          {loading ? "Saving..." : <><CheckCircle2 size={16}/> Submit Attendance</>}
        </button>
      </div>
    </div>
  );

  if (stream) return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
      <video ref={videoRef} autoPlay playsInline className="w-full max-w-xs mx-auto rounded-2xl mb-4 bg-slate-900" />
      <button onClick={takePhoto} className="w-16 h-16 bg-white border-4 border-blue-600 rounded-full mx-auto flex items-center justify-center">
        <div className="w-12 h-12 bg-blue-600 rounded-full" />
      </button>
    </div>
  );

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Camera className="text-blue-600" size={32} />
      </div>
      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Selfie Attendance</h3>
      <p className="text-sm text-slate-500 mb-6 uppercase font-bold tracking-tighter">Mark your daily attendance with a quick selfie</p>
      <button onClick={startCamera} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 mx-auto">
        <Camera size={18} /> Start Camera
      </button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default function StaffPortal() {
  const { hrStaff, hrLoading, logout } = useHR();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);

  if (hrLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hrStaff) return <Navigate to="/hr/login" replace />;

  // Admins/managers go to full HR panel
  if (hrStaff.role !== 'staff') return <Navigate to="/hr/dashboard" replace />;

  const loadTab = async (tab) => {
    setActiveTab(tab);
    if (tab === 'profile') return;
    setDataLoading(true);
    try {
      if (tab === 'attendance') {
        const { data } = await getMyAttendance({ limit: 50 });
        setAttendance(data.records || []);
      } else if (tab === 'leaves') {
        const { data } = await getMyLeaves({ limit: 50 });
        setLeaves(data.leaves || []);
      } else if (tab === 'salary') {
        const { data } = await getMyPayrolls();
        setPayrolls(data.payrolls || data || []);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally { setDataLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/hr/login'); };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Staff Portal</p>
              <p className="text-xs text-slate-400">Welcome, {hrStaff.name}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white rounded-xl border border-slate-200 p-2">
          <Tab label="Profile" active={activeTab === 'profile'} onClick={() => loadTab('profile')} icon={User} />
          <Tab label="Attendance" active={activeTab === 'attendance'} onClick={() => loadTab('attendance')} icon={CalendarCheck} />
          <Tab label="My Leaves" active={activeTab === 'leaves'} onClick={() => loadTab('leaves')} icon={CalendarX2} />
          <Tab label="Salary" active={activeTab === 'salary'} onClick={() => loadTab('salary')} icon={Wallet} />
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Avatar Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center gap-3">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">
                {hrStaff.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg">{hrStaff.name}</p>
                <p className="text-sm text-slate-500">{hrStaff.designation || hrStaff.role}</p>
                <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                  {hrStaff.role}
                </span>
              </div>
              <button onClick={() => setShowPwdModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition mt-2">
                <Lock className="w-4 h-4" /> Change Password
              </button>
            </div>

            {/* Details */}
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Personal & Job Details</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: 'Email', value: hrStaff.email },
                  { label: 'Phone', value: hrStaff.phone },
                  { label: 'Department', value: hrStaff.department },
                  { label: 'Designation', value: hrStaff.designation },
                  { label: 'Joining Date', value: hrStaff.joiningDate ? new Date(hrStaff.joiningDate).toLocaleDateString('en-IN') : null },
                  { label: 'Gender', value: hrStaff.gender },
                  { label: 'Status', value: hrStaff.status },
                  { label: 'DOB', value: hrStaff.dateOfBirth ? new Date(hrStaff.dateOfBirth).toLocaleDateString('en-IN') : null },
                  { label: 'Address', value: hrStaff.address },
                  { label: 'Emergency Contact', value: hrStaff.emergencyContact },
                ].filter((r) => r.value).map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="font-medium text-slate-700 capitalize">{value}</p>
                  </div>
                ))}
              </div>
              {hrStaff.currentShift && (
                <div className="bg-amber-50 rounded-lg p-3 text-sm border border-amber-200">
                  <p className="font-medium text-amber-800">Current Shift: {hrStaff.currentShift.name}</p>
                  <p className="text-amber-700 text-xs mt-0.5">{hrStaff.currentShift.startTime} – {hrStaff.currentShift.endTime}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Attendance Tab ── */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">My Attendance</h3>
              <p className="text-sm text-slate-500">{attendance.length} records</p>
            </div>
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : attendance.length === 0 ? (
              <p className="text-center text-slate-400 py-12">No attendance records found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Check In</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Check Out</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((r) => (
                    <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.checkIn || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.checkOut || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Leaves Tab ── */}
        {activeTab === 'leaves' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">My Leave Applications</h3>
              <button onClick={() => setShowLeaveModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                <Send className="w-4 h-4" /> Apply Leave
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {dataLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : leaves.length === 0 ? (
                <p className="text-center text-slate-400 py-12">No leave applications found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">From</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">To</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Days</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Reason</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l._id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 capitalize font-medium text-slate-700">{l.type}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(l.startDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(l.endDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-slate-600">{l.totalDays}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{l.reason}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${LEAVE_STATUS[l.status]}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Salary Tab ── */}
        {activeTab === 'salary' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">Salary History</h3>
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : payrolls.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" /> No salary records yet.
              </div>
            ) : (
              <div className="space-y-3">
                {payrolls.map((p) => {
                  const [open, setOpen] = useState(false);
                  return (
                    <div key={p._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => setOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <p className="font-bold text-slate-800">{MONTHS[(p.month || 1) - 1]} {p.year}</p>
                            <p className="text-xl font-bold text-blue-700">{fmt(p.netSalary)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.status}
                          </span>
                          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>
                      {open && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                            {[
                              { label: 'Base Salary', value: fmt(p.baseSalary), color: 'text-slate-700' },
                              { label: 'Deduction', value: `- ${fmt(p.leaveDeduction)}`, color: 'text-red-600' },
                              { label: 'Bonus', value: `+ ${fmt(p.bonus)}`, color: 'text-emerald-600' },
                              { label: 'Overtime', value: `+ ${fmt(p.overtime)}`, color: 'text-emerald-600' },
                            ].map(({ label, value, color }) => (
                              <div key={label} className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-400">{label}</p>
                                <p className={`font-bold mt-0.5 ${color}`}>{value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="text-xs text-slate-500 flex items-center gap-4">
                              <span>Working Days: <strong>{p.workingDays}</strong></span>
                              <span>Present: <strong>{p.presentDays}</strong></span>
                              <span>Absent: <strong>{p.absentDays}</strong></span>
                            </div>
                            <button onClick={() => downloadPayslipPDF(p, hrStaff)}
                              className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">
                              <Download className="w-3.5 h-3.5" /> Download Payslip
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showLeaveModal && (
        <ApplyLeaveModal
          onClose={() => setShowLeaveModal(false)}
          onApplied={() => loadTab('leaves')}
        />
      )}
      {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}
    </div>
  );
}
