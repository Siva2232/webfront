import { useEffect, useState, useCallback } from 'react';
import { getAllStaff, getAttendance, markAttendance, updateAttendance, deleteAttendance } from '../../api/hrApi';
import toast from 'react-hot-toast';
import { CalendarCheck, ChevronLeft, ChevronRight, Pencil, Trash2, Users } from 'lucide-react';

const STATUS_OPTIONS = ['present', 'absent', 'leave', 'half-day', 'holiday'];
const STATUS_COLORS = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-600',
  leave: 'bg-amber-100 text-amber-700',
  'half-day': 'bg-sky-100 text-sky-700',
  holiday: 'bg-violet-100 text-violet-700',
};

const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function AttendanceManager() {
  const [staff, setStaff] = useState([]);
  const [date, setDate] = useState(todayStr);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStatuses, setBulkStatuses] = useState({});
  const [editRecord, setEditRecord] = useState(null);
  const [filterStaff, setFilterStaff] = useState('');

  useEffect(() => {
    getAllStaff({ limit: 200, status: 'active' }).then(({ data }) => setStaff(data.staff));
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAttendance({ date, staffId: filterStaff || undefined, limit: 200 });
      setRecords(data.records);
    } catch (err) { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  }, [date, filterStaff]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const shiftDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  // Bulk mark: initialise statuses for all active staff
  const initBulk = () => {
    const map = {};
    staff.forEach((s) => {
      const existing = records.find((r) => r.staff?._id === s._id || r.staff === s._id);
      map[s._id] = existing?.status || 'present';
    });
    setBulkStatuses(map);
    setBulkMode(true);
  };

  const saveBulk = async () => {
    try {
      const entries = Object.entries(bulkStatuses).map(([staffId, status]) => ({
        staff: staffId, date, status,
      }));
      await markAttendance(entries);
      toast.success('Attendance saved');
      setBulkMode(false);
      loadRecords();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete record?')) return;
    try {
      await deleteAttendance(id);
      toast.success('Deleted');
      loadRecords();
    } catch (err) { toast.error('Delete failed'); }
  };

  const handleUpdateSave = async () => {
    try {
      await updateAttendance(editRecord._id, editRecord);
      toast.success('Updated');
      setEditRecord(null);
      loadRecords();
    } catch (err) { toast.error('Update failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Attendance</h2>
          <p className="text-sm text-slate-500">{records.length} records for selected date</p>
        </div>
        {!bulkMode && (
          <button
            onClick={initBulk}
            className="sm:ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <CalendarCheck className="w-4 h-4" /> Mark Bulk Attendance
          </button>
        )}
        {bulkMode && (
          <div className="sm:ml-auto flex gap-2">
            <button onClick={() => setBulkMode(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={saveBulk} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">Save All</button>
          </div>
        )}
      </div>

      {/* Date Navigator */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 w-fit">
        <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border-0 outline-none text-sm font-semibold text-slate-700"
        />
        <button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => setDate(todayStr())} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">Today</button>
      </div>

      {/* Bulk Mode Table */}
      {bulkMode ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-700">Mark attendance for {date}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Staff', 'Department', 'Designation', 'Status', 'Check In', 'Check Out'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">{s.name?.[0]}</div>
                        <span className="font-medium text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.department}</td>
                    <td className="px-4 py-3 text-slate-500">{s.designation}</td>
                    <td className="px-4 py-3">
                      <select
                        value={bulkStatuses[s._id] || 'present'}
                        onChange={(e) => setBulkStatuses((prev) => ({ ...prev, [s._id]: e.target.value }))}
                        className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
                      >
                        {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input type="time" className="border border-slate-300 rounded px-1.5 py-0.5 text-xs" onChange={(e) => setBulkStatuses((prev) => ({ ...prev, [`${s._id}_in`]: e.target.value }))} />
                    </td>
                    <td className="px-4 py-3">
                      <input type="time" className="border border-slate-300 rounded px-1.5 py-0.5 text-xs" onChange={(e) => setBulkStatuses((prev) => ({ ...prev, [`${s._id}_out`]: e.target.value }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Records Table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Users className="w-10 h-10" />
              <p className="text-sm">No attendance records for this date</p>
              <button onClick={initBulk} className="text-xs text-blue-600 hover:underline">Mark attendance now</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Staff', 'Department', 'Status', 'Check In', 'Check Out', 'Hours', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{r.staff?.name}</p>
                        <p className="text-xs text-slate-400">{r.staff?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r.staff?.department}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.checkIn || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.checkOut || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.workHours?.toFixed(1) || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => setEditRecord({ ...r, date: r.date?.split('T')[0] })} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(r._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-slate-800">Edit Attendance Record</h3>
            <div>
              <label className="text-xs font-medium text-slate-600">Status</label>
              <select
                value={editRecord.status}
                onChange={(e) => setEditRecord({ ...editRecord, status: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Check In</label>
                <input type="time" value={editRecord.checkIn || ''} onChange={(e) => setEditRecord({ ...editRecord, checkIn: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Check Out</label>
                <input type="time" value={editRecord.checkOut || ''} onChange={(e) => setEditRecord({ ...editRecord, checkOut: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Note</label>
              <input value={editRecord.note || ''} onChange={(e) => setEditRecord({ ...editRecord, note: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditRecord(null)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handleUpdateSave} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
