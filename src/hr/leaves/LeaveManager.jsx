import { useEffect, useState, useCallback } from 'react';
import { getLeaves, updateLeave, deleteLeave } from '../../api/hrApi';
import toast from 'react-hot-toast';
import { CalendarX2, CheckCircle, XCircle, Trash2, Filter } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};
const TYPE_COLORS = {
  sick: 'bg-red-50 text-red-600',
  casual: 'bg-sky-50 text-sky-600',
  annual: 'bg-blue-50 text-blue-700',
  unpaid: 'bg-slate-100 text-slate-600',
  other: 'bg-purple-50 text-purple-600',
};

export default function LeaveManager() {
  const [leaves, setLeaves] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getLeaves({ status: filterStatus, type: filterType, page, limit: 15 });
      setLeaves(data.leaves);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  }, [filterStatus, filterType, page]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try {
      await updateLeave(id, { status: 'approved', reviewNote });
      toast.success('Leave approved');
      setReviewing(null);
      load();
    } catch (err) { toast.error('Failed'); }
  };

  const handleReject = async (id) => {
    try {
      await updateLeave(id, { status: 'rejected', reviewNote });
      toast.success('Leave rejected');
      setReviewing(null);
      load();
    } catch (err) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leave application?')) return;
    try {
      await deleteLeave(id);
      toast.success('Deleted');
      load();
    } catch (err) { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Leave Management</h2>
          <p className="text-sm text-slate-500">{total} applications</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Filter className="w-4 h-4" /> Filters:
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {['sick', 'casual', 'annual', 'unpaid', 'other'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
            <CalendarX2 className="w-10 h-10" />
            <p className="text-sm">No leave applications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Staff', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{l.staff?.name}</p>
                      <p className="text-xs text-slate-400">{l.staff?.department}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[l.type] || ''}`}>{l.type}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(l.startDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(l.endDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{l.totalDays}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{l.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status] || ''}`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {l.status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setReviewing({ ...l, action: 'approve' }); setReviewNote(''); }}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setReviewing({ ...l, action: 'reject' }); setReviewNote(''); }}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(l._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {/* Review Modal */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full space-y-4">
            <h3 className={`text-base font-bold ${reviewing.action === 'approve' ? 'text-emerald-700' : 'text-red-600'}`}>
              {reviewing.action === 'approve' ? 'Approve' : 'Reject'} Leave
            </h3>
            <p className="text-sm text-slate-600">
              <strong>{reviewing.staff?.name}</strong> — {reviewing.type} leave from{' '}
              {new Date(reviewing.startDate).toLocaleDateString('en-IN')} to{' '}
              {new Date(reviewing.endDate).toLocaleDateString('en-IN')} ({reviewing.totalDays} days)
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600">Review Note (optional)</label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add a note…"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewing(null)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              {reviewing.action === 'approve' ? (
                <button onClick={() => handleApprove(reviewing._id)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">Approve</button>
              ) : (
                <button onClick={() => handleReject(reviewing._id)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Reject</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
