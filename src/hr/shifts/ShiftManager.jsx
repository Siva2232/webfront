import { useEffect, useState, useCallback } from 'react';
import { getShifts, createShift, updateShift, deleteShift, getAllStaff, assignStaffToShift } from '../../api/hrApi';
import toast from 'react-hot-toast';
import { Plus, Clock4, Pencil, Trash2, UserPlus, X } from 'lucide-react';

const SHIFT_COLORS = { morning: 'bg-amber-100 text-amber-700', evening: 'bg-orange-100 text-orange-700', night: 'bg-blue-100 text-blue-700', custom: 'bg-slate-100 text-slate-600' };
const EMPTY = { name: '', type: 'morning', startTime: '', endTime: '', description: '' };

export default function ShiftManager() {
  const [shifts, setShifts] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, staffRes] = await Promise.all([getShifts(), getAllStaff({ limit: 200, status: 'active' })]);
      setShifts(sRes.data);
      setStaffList(staffRes.data.staff);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setEditShift(null); setShowModal(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditShift(s); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editShift) { await updateShift(editShift._id, form); toast.success('Shift updated'); }
      else { await createShift(form); toast.success('Shift created'); }
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this shift?')) return;
    try { await deleteShift(id); toast.success('Deleted'); load(); }
    catch (err) { toast.error('Delete failed'); }
  };

  const openAssign = (s) => {
    setAssignModal(s);
    setSelectedStaff(s.assignedStaff?.map((st) => st._id || st) || []);
  };

  const handleAssign = async () => {
    try {
      await updateShift(assignModal._id, { assignedStaff: selectedStaff });
      toast.success('Staff assigned');
      setAssignModal(null);
      load();
    } catch (err) { toast.error('Assign failed'); }
  };

  const toggleStaff = (id) => {
    setSelectedStaff((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Shift Management</h2>
          <p className="text-sm text-slate-500">{shifts.length} shifts configured</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Create Shift
        </button>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Clock4 className="w-10 h-10" />
          <p className="text-sm">No shifts created yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((s) => (
            <div key={s._id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{s.name}</h3>
                  <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${SHIFT_COLORS[s.type] || ''}`}>{s.type}</span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(s._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Clock4 className="w-4 h-4 text-slate-400" />
                <span className="font-medium">{s.startTime} – {s.endTime}</span>
              </div>

              {s.description && <p className="text-xs text-slate-500">{s.description}</p>}

              {/* Assigned staff */}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1.5">Assigned Staff ({s.assignedStaff?.length || 0})</p>
                <div className="flex flex-wrap gap-1.5">
                  {(s.assignedStaff || []).slice(0, 4).map((st) => (
                    <span key={st._id || st} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{st.name || 'Staff'}</span>
                  ))}
                  {s.assignedStaff?.length > 4 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">+{s.assignedStaff.length - 4}</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => openAssign(s)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-blue-200 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Assign Staff
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">{editShift ? 'Edit Shift' : 'Create Shift'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Shift Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="e.g. Morning Shift" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  {['morning', 'evening', 'night', 'custom'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Start Time *</label>
                  <input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">End Time *</label>
                  <input required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Optional" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Saving…' : editShift ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Staff Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Assign Staff – {assignModal.name}</h3>
              <button onClick={() => setAssignModal(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500">Select staff members to assign to this shift.</p>
            <div className="max-h-64 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2">
              {staffList.map((s) => (
                <label key={s._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedStaff.includes(s._id)} onChange={() => toggleStaff(s._id)} className="rounded" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.designation} · {s.department}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAssignModal(null)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handleAssign} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Save Assignment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
