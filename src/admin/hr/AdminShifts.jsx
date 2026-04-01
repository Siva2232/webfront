import React, { useState, useEffect, useCallback } from "react";
import {
  Clock4, Plus, Edit2, Trash2, Users, X, Save, Loader2,
  Search, Sun, Sunset, Moon, ChevronDown, RefreshCw, UserMinus
} from "lucide-react";
import { getShifts, createShift, updateShift, deleteShift, assignStaffToShift, getAllStaff } from "../../api/hrApi";
import toast from "react-hot-toast";

const SHIFT_COLORS = {
  morning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: Sun, badge: "bg-amber-100 text-amber-700" },
  evening: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: Sunset, badge: "bg-orange-100 text-orange-700" },
  night:   { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", icon: Moon, badge: "bg-indigo-100 text-indigo-700" },
  custom:  { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", icon: Clock4, badge: "bg-slate-100 text-slate-600" },
};

const EMPTY_FORM = { name: "", shiftType: "morning", startTime: "08:00", endTime: "16:00", description: "" };

export default function AdminShifts() {
  const [shifts, setShifts] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [assignModal, setAssignModal] = useState(null); // shift being assigned
  const [assignSearch, setAssignSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shiftsRes, staffRes] = await Promise.all([
        getShifts(),
        getAllStaff({ status: "active", limit: 200 })
      ]);
      setShifts(Array.isArray(shiftsRes.data) ? shiftsRes.data : shiftsRes.data?.shifts || []);
      setAllStaff(Array.isArray(staffRes.data) ? staffRes.data : staffRes.data?.staff || []);
    } catch {
      toast.error("Failed to load shifts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name || "", shiftType: s.shiftType || "morning", startTime: s.startTime || "08:00", endTime: s.endTime || "16:00", description: s.description || "" });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Shift name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.type) payload.type = form.shiftType; // Ensure backend gets 'type'

      if (editing) {
        await updateShift(editing._id, payload);
        toast.success("Shift updated");
      } else {
        await createShift(payload);
        toast.success("Shift created");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save shift");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this shift?")) return;
    setDeleting(id);
    try {
      await deleteShift(id);
      toast.success("Shift deleted");
      setShifts(prev => prev.filter(s => s._id !== id));
    } catch {
      toast.error("Failed to delete shift");
    } finally {
      setDeleting(null);
    }
  };

  const handleAssign = async (staffId, add) => {
    if (!assignModal) return;
    const shift = assignModal;
    // Normalized current staff list
    const currentStaffRaw = shift.assignedStaff || shift.staff || [];
    const currentStaffIds = currentStaffRaw.map(s => String(typeof s === "object" ? s._id : s));
    
    const newStaff = add
      ? [...new Set([...currentStaffIds, String(staffId)])]
      : currentStaffIds.filter(id => id !== String(staffId));

    setAssigning(true);
    try {
      // Send as both staff and assignedStaff to be safe
      const res = await updateShift(shift._id, { assignedStaff: newStaff, staff: newStaff });
      const updated = res.data?.shift || res.data;
      
      // Update local state with the newly populated shift
      setShifts(prev => prev.map(s => s._id === shift._id ? updated : s));
      setAssignModal(updated);
      toast.success(add ? "Staff assigned" : "Staff removed");
    } catch (err) {
      console.error("Assign error:", err);
      toast.error(err?.response?.data?.message || "Failed to update shift assignment");
    } finally {
      setAssigning(false);
    }
  };

  const filteredAssignStaff = allStaff.filter(s => {
    const q = assignSearch.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shift Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{shifts.length} shifts configured</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" />New Shift
          </button>
        </div>
      </div>

      {/* Shift Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-xl text-slate-400">
          <Clock4 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No shifts created yet</p>
          <button onClick={openCreate}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
            Create First Shift
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shifts.map(shift => {
            const cfg = SHIFT_COLORS[shift.shiftType] || SHIFT_COLORS[shift.type] || SHIFT_COLORS.custom;
            const Icon = cfg.icon;
            const assignedStaff = (shift.assignedStaff || shift.staff || []).map(s => typeof s === "object" ? s : allStaff.find(a => a._id === s)).filter(Boolean);
            return (
              <div key={shift._id} className={`bg-white border ${cfg.border} rounded-xl p-5 space-y-4`}>
                {/* Shift header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.text} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{shift.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                        {shift.shiftType || shift.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(shift)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(shift._id)} disabled={deleting === shift._id}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 disabled:opacity-50">
                      {deleting === shift._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock4 className="w-4 h-4 text-slate-400" />
                  <span className="font-mono font-medium">{shift.startTime}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-mono font-medium">{shift.endTime}</span>
                </div>

                {/* Description */}
                {shift.description && (
                  <p className="text-xs text-slate-500">{shift.description}</p>
                )}

                {/* Assigned staff */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />{assignedStaff.length} staff assigned
                    </p>
                    <button onClick={() => { setAssignModal(shift); setAssignSearch(""); }}
                      className="text-xs text-indigo-600 hover:underline">Manage</button>
                  </div>
                  {assignedStaff.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedStaff.slice(0, 5).map(s => (
                        <div key={s._id} title={s.name}
                          className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                          {s.name?.charAt(0)?.toUpperCase()}
                        </div>
                      ))}
                      {assignedStaff.length > 5 && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                          +{assignedStaff.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">{editing ? "Edit Shift" : "Create Shift"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Shift Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Morning Shift A"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Shift Type</label>
                <select value={form.shiftType} onChange={e => setForm(p => ({ ...p, shiftType: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 bg-white">
                  {["morning", "evening", "night", "custom"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? "Save Changes" : "Create Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Staff Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Assign Staff</h2>
                <p className="text-xs text-slate-400 mt-0.5">{assignModal.name} · {assignModal.startTime}–{assignModal.endTime}</p>
              </div>
              <button onClick={() => setAssignModal(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)}
                  placeholder="Search staff…"
                  className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {filteredAssignStaff.map(s => {
                const assignedIds = (assignModal.assignedStaff || assignModal.staff || []).map(a => typeof a === "object" ? a._id : String(a));
                const isAssigned = assignedIds.includes(String(s._id));
                return (
                  <div key={s._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {s.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.department || s.designation || s.role}</p>
                    </div>
                    <button onClick={() => handleAssign(s._id, !isAssigned)} disabled={assigning}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        isAssigned
                          ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}>
                      {isAssigned ? "Remove" : "Assign"}
                    </button>
                  </div>
                );
              })}
              {filteredAssignStaff.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm">No staff found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
