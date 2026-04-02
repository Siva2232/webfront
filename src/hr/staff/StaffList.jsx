import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllStaff, deleteStaff } from '../../api/hrApi';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, Eye, UserCheck, UserX } from 'lucide-react';
import StaffFormModal from './StaffFormModal';

const STATUS_COLORS = { active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-slate-100 text-slate-500', terminated: 'bg-red-100 text-red-600' };
const ROLE_COLORS = { admin: 'bg-blue-100 text-blue-700', manager: 'bg-violet-100 text-violet-700', staff: 'bg-slate-100 text-slate-600' };

export default function StaffList() {
  const [staff, setStaff] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAllStaff({ search, role: filterRole, status: filterStatus, page, limit: 15 });
      setStaff(data.staff);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterStatus, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    window.addEventListener('staffUpdated', load);
    return () => window.removeEventListener('staffUpdated', load);
  }, [load]);

  const handleDelete = async () => {
    try {
      await deleteStaff(deleteId);
      toast.success('Staff deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Staff Management</h2>
          <p className="text-sm text-slate-500">{total} total members</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="sm:ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, designation…"
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
            <UserX className="w-10 h-10" />
            <p className="text-sm">No staff found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Name', 'Department', 'Designation', 'Role', 'Base Salary', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {s.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.department || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.designation || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[s.role] || 'bg-slate-100 text-slate-600'}`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">₹{s.baseSalary?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || ''}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/hr/staff/${s._id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => { setEditTarget(s); setShowModal(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(s._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-50">Prev</button>
          <span className="text-sm text-slate-600">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-50">Next</button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <StaffFormModal
          staff={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-slate-800 mb-2">Delete Staff Member?</h3>
            <p className="text-sm text-slate-500 mb-5">This action is irreversible. All associated data will remain but the staff account will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
