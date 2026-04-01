import React, { useState, useEffect, useCallback } from "react";
import {
  Clock4, Plus, Edit2, Trash2, Users, X, Save, Loader2,
  Search, Sun, Sunset, Moon, ChevronDown, RefreshCw, UserMinus,
  Calendar, ArrowRight, UserPlus
} from "lucide-react";
import { getShifts, createShift, updateShift, deleteShift, getAllStaff } from "../../api/hrApi";
import toast from "react-hot-toast";

const SHIFT_THEMES = {
  morning: { 
    bg: "bg-amber-50/50", 
    border: "border-amber-200/60", 
    text: "text-amber-700", 
    accent: "bg-amber-100",
    icon: Sun 
  },
  evening: { 
    bg: "bg-orange-50/50", 
    border: "border-orange-200/60", 
    text: "text-orange-700", 
    accent: "bg-orange-100",
    icon: Sunset 
  },
  night: { 
    bg: "bg-indigo-50/50", 
    border: "border-indigo-200/60", 
    text: "text-indigo-700", 
    accent: "bg-indigo-100",
    icon: Moon 
  },
  custom: { 
    bg: "bg-slate-50/50", 
    border: "border-slate-200/60", 
    text: "text-slate-700", 
    accent: "bg-slate-100",
    icon: Clock4 
  },
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
  const [assignModal, setAssignModal] = useState(null); 
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
      toast.error("Database sync failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateShift(editing._id, form);
        toast.success("Shift Configuration Updated");
      } else {
        await createShift(form);
        toast.success("New Shift Protocol Created");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (staffId, add) => {
    if (!assignModal) return;
    setAssigning(true);
    const currentIds = (assignModal.assignedStaff || []).map(s => String(typeof s === "object" ? s._id : s));
    const newStaff = add ? [...new Set([...currentIds, staffId])] : currentIds.filter(id => id !== staffId);

    try {
      const res = await updateShift(assignModal._id, { assignedStaff: newStaff });
      const updated = res.data?.shift || res.data;
      setShifts(prev => prev.map(s => s._id === assignModal._id ? updated : s));
      setAssignModal(updated);
      toast.success(add ? "Staff Assigned" : "Staff Removed");
    } catch {
      toast.error("Assignment update failed");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50/30 min-h-screen space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shift Operations</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Resource Allocation & Scheduling</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200">
            <Plus size={18} /> Add Shift
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Initialising Shift Records</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {shifts.map(shift => {
            const theme = SHIFT_THEMES[shift.shiftType] || SHIFT_THEMES.custom;
            const Icon = theme.icon;
            const staffList = (shift.assignedStaff || []).map(s => typeof s === "object" ? s : allStaff.find(a => a._id === s)).filter(Boolean);

            return (
              <div key={shift._id} className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shadow-inner`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 tracking-tight">{shift.name}</h3>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${theme.accent} ${theme.text}`}>
                        {shift.shiftType}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(shift); setForm(shift); setShowModal(true); }} className="p-2 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => deleteShift(shift._id)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock4 size={14} className="text-slate-400" />
                    <span className="text-sm font-black text-slate-700 font-mono tracking-tighter">{shift.startTime}</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-300" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-700 font-mono tracking-tighter">{shift.endTime}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users size={12} /> Personnel ({staffList.length})
                    </p>
                    <button onClick={() => setAssignModal(shift)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Manage</button>
                  </div>
                  
                  <div className="flex -space-x-2 overflow-hidden">
                    {staffList.slice(0, 6).map((s, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white shadow-sm" title={s.name}>
                        {s.name?.charAt(0)}
                      </div>
                    ))}
                    {staffList.length > 6 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm">
                        +{staffList.length - 6}
                      </div>
                    )}
                    {staffList.length === 0 && <p className="text-xs text-slate-400 italic py-1">No staff assigned</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modern Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSave}>
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editing ? "Update Shift" : "New Shift"}</h2>
                <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Label</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full mt-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="e.g. ICU Night Shift" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                    <select value={form.shiftType} onChange={e => setForm({...form, shiftType: e.target.value})} className="w-full mt-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none">
                      {["morning", "evening", "night", "custom"].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start</label>
                      <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End</label>
                      <input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 pt-0 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Discard</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                  {editing ? "Save Changes" : "Initialise"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Side-Sheet Concept */}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Assign Staff</h2>
                <p className="text-xs font-bold text-indigo-500 mt-1 uppercase tracking-widest">{assignModal.name}</p>
              </div>
              <button onClick={() => setAssignModal(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            
            <div className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="Filter by name or department..." />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-2">
              {allStaff.filter(s => s.name.toLowerCase().includes(assignSearch.toLowerCase())).map(s => {
                const isAssigned = (assignModal.assignedStaff || []).some(id => String(typeof id === 'object' ? id._id : id) === String(s._id));
                return (
                  <div key={s._id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-500">{s.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{s.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{s.department}</p>
                      </div>
                    </div>
                    <button onClick={() => handleAssign(s._id, !isAssigned)} disabled={assigning}
                      className={`p-2 rounded-xl transition-all ${isAssigned ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-500 opacity-0 group-hover:opacity-100"}`}>
                      {isAssigned ? <UserMinus size={18} /> : <UserPlus size={18} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}