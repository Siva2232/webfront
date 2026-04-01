import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStaffById, deleteStaffDocument, uploadStaffDocument } from '../../api/hrApi';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, FileText, Upload, Trash2, Shield } from 'lucide-react';
import StaffFormModal from './StaffFormModal';

const Info = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  ) : null;

export default function StaffProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docSaving, setDocSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await getStaffById(id);
      setStaff(data);
    } catch (err) {
      toast.error('Failed to load profile');
      navigate('/hr/staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!docName || !docUrl) return toast.error('Name and URL required');
    setDocSaving(true);
    try {
      await uploadStaffDocument(id, { name: docName, url: docUrl });
      toast.success('Document added');
      setDocName(''); setDocUrl('');
      load();
    } catch (err) {
      toast.error('Upload failed');
    } finally { setDocSaving(false); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Remove this document?')) return;
    try {
      await deleteStaffDocument(id, docId);
      toast.success('Document removed');
      load();
    } catch (err) { toast.error('Remove failed'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!staff) return null;

  const STATUS_COLORS = { active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-slate-100 text-slate-500', terminated: 'bg-red-100 text-red-600' };
  const ROLE_COLORS = { admin: 'bg-blue-100 text-blue-700', manager: 'bg-violet-100 text-violet-700', staff: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link to="/hr/staff" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600">
          <ArrowLeft className="w-4 h-4" /> Staff
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 font-medium">{staff.name}</span>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-700 font-bold text-3xl flex items-center justify-center shrink-0">
            {staff.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-800">{staff.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[staff.role]}`}>{staff.role}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[staff.status]}`}>{staff.status}</span>
            </div>
            <p className="text-sm text-slate-500">{staff.designation}{staff.department ? ` · ${staff.department}` : ''}</p>
            <p className="text-xs text-slate-400 mt-1">Joined {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="self-start px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Personal Details</h3>
          <Info icon={Mail} label="Email" value={staff.email} />
          <Info icon={Phone} label="Phone" value={staff.phone} />
          <Info icon={MapPin} label="Address" value={staff.address} />
          <Info icon={Calendar} label="Date of Birth" value={staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString('en-IN') : null} />
          <Info icon={Shield} label="Emergency Contact" value={staff.emergencyContact} />
        </div>

        {/* Job Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Employment Details</h3>
          <Info icon={Briefcase} label="Department" value={staff.department} />
          <Info icon={Briefcase} label="Designation" value={staff.designation} />
          <Info icon={Shield} label="Role" value={staff.role} />
          <div className="flex items-start gap-2.5">
            <div className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Base Salary</p>
              <p className="text-sm font-bold text-slate-700">₹{staff.baseSalary?.toLocaleString()}</p>
            </div>
          </div>
          {staff.currentShift && (
            <div>
              <p className="text-xs text-slate-400">Current Shift</p>
              <p className="text-sm font-medium text-slate-700">{staff.currentShift.name} ({staff.currentShift.startTime} – {staff.currentShift.endTime})</p>
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">Documents</h3>

        {/* Upload form */}
        <form onSubmit={handleUploadDoc} className="flex flex-wrap gap-3">
          <input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="Document name (e.g. ID Proof)"
            className="flex-1 min-w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            placeholder="Document URL"
            className="flex-1 min-w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={docSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            <Upload className="w-3.5 h-3.5" /> Add
          </button>
        </form>

        {/* Document list */}
        {staff.documents?.length === 0 ? (
          <p className="text-sm text-slate-400">No documents uploaded.</p>
        ) : (
          <div className="space-y-2">
            {staff.documents?.map((doc) => (
              <div key={doc._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline truncate">{doc.name}</a>
                <span className="text-xs text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</span>
                <button
                  onClick={() => handleDeleteDoc(doc._id)}
                  className="text-slate-400 hover:text-red-500 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <StaffFormModal
          staff={staff}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}
    </div>
  );
}
