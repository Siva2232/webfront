import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck2, Search, ChevronDown, X, Loader2,
  CheckCircle2, XCircle, Clock, AlertCircle, Users, Save,
  ChevronLeft, ChevronRight, RefreshCw, Camera, MapPin, Image as ImageIcon
} from "lucide-react";
import { getAllStaff, getAttendance, markAttendance, updateAttendance, getAttendanceSummary } from "../../api/hrApi";
import toast from "react-hot-toast";

const STATUS_MAP = {
  present:  { label: "Present",  color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  absent:   { label: "Absent",   color: "bg-rose-100 text-rose-700 border-rose-200",     dot: "bg-rose-500" },
  leave:    { label: "On Leave", color: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-500" },
  holiday:  { label: "Holiday",  color: "bg-blue-100 text-blue-700 border-blue-200",      dot: "bg-blue-500" },
  halfday:  { label: "Half Day", color: "bg-violet-100 text-violet-700 border-violet-200",dot: "bg-violet-500", apiValue: "half-day" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || Object.values(STATUS_MAP).find(x => x.apiValue === status) || STATUS_MAP.absent;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>{s.label}</span>
  );
}

export default function AdminAttendance() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("mark"); // "mark" | "history"
  const [historyDate, setHistoryDate] = useState(date);
  const [attendanceMap, setAttendanceMap] = useState({}); // staffId -> { status, checkIn, checkOut, note, _id }

  const loadStaff = useCallback(async () => {
    try {
      const res = await getAllStaff({ status: "active", limit: 200 });
      setStaff(Array.isArray(res.data) ? res.data : res.data?.staff || []);
    } catch { toast.error("Failed to load staff"); }
  }, []);

  const loadAttendance = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await getAttendance({ date: d });
      const list = res.data?.records || res.data || [];
      setAttendance(list);
      // Build a map for quick lookup
      const map = {};
      list.forEach(a => {
        if (a.staff?._id || a.staff) {
          const sid = a.staff?._id || a.staff;
          map[sid] = { _id: a._id, status: a.status, checkIn: a.checkIn || "", checkOut: a.checkOut || "", note: a.note || "" };
        }
      });
      setAttendanceMap(map);
    } catch (err) { 
      console.error(err);
      toast.error("Failed to load attendance"); 
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { loadAttendance(date); }, [date, loadAttendance]);

  const filteredStaff = staff.filter(s => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
  });

  const setStaffStatus = (staffId, status) => {
    const apiStatus = STATUS_MAP[status]?.apiValue || status;
    setAttendanceMap(prev => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), status: apiStatus } }));
  };

  const markAll = (status) => {
    const apiStatus = STATUS_MAP[status]?.apiValue || status;
    const map = {};
    staff.forEach(s => { map[s._id] = { ...(attendanceMap[s._id] || {}), status: apiStatus }; });
    setAttendanceMap(map);
    toast.success(`All marked as ${status}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloads = staff.map(s => {
        const entry = attendanceMap[s._id] || {};
        return {
          staff: s._id,
          date,
          status: entry.status || "absent",
          checkIn: entry.checkIn || undefined,
          checkOut: entry.checkOut || undefined,
          note: entry.note || undefined
        };
      });

      // Backend markAttendance handles bulk arrays or single objects
      await markAttendance(payloads);

      toast.success("Attendance saved successfully");
      loadAttendance(date);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter(a => a.status === "present").length;
  const absentCount = Object.values(attendanceMap).filter(a => a.status === "absent").length;
  const leaveCount = Object.values(attendanceMap).filter(a => a.status === "leave").length;

  const prevDay = () => {
    const d = new Date(date); d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split("T")[0]);
  };
  const nextDay = () => {
    const d = new Date(date); d.setDate(d.getDate() + 1);
    if (d <= new Date()) setDate(d.toISOString().split("T")[0]);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{staff.length} active staff</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadAttendance(date)}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date navigator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
          <input type="date" value={date} max={new Date().toISOString().split("T")[0]}
            onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-slate-700" />
          <button onClick={nextDay} disabled={date >= new Date().toISOString().split("T")[0]}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Present", count: presentCount, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
            { label: "Absent", count: absentCount, color: "bg-rose-50 text-rose-700 border-rose-100" },
            { label: "On Leave", count: leaveCount, color: "bg-amber-50 text-amber-700 border-amber-100" },
          ].map(c => (
            <span key={c.label} className={`px-3 py-1 rounded-full text-xs font-semibold border ${c.color}`}>
              {c.label}: {c.count}
            </span>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={() => markAll("present")}
            className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors">
            All Present
          </button>
          <button onClick={() => markAll("absent")}
            className="px-3 py-1.5 text-xs font-medium bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors">
            All Absent
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
        <Search className="w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search staff…"
          className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400" />
        {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-slate-400" /></button>}
      </div>

      {/* Attendance grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Check In</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Check Out</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((s, idx) => {
                const att = attendanceMap[s._id] || {};
                return (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-black uppercase">
                          {s.name?.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">{s.name}</span>
                          {att.selfie && (
                            <button 
                              onClick={() => setSelectedSelfie({ url: `http://localhost:5000${att.selfie}`, name: s.name, time: att.checkIn || '—', location: att.location })}
                              className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest mt-0.5"
                            >
                              <ImageIcon size={10} /> View Selfie
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.department || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {["present", "absent", "leave", "halfday", "holiday"].map(st => (
                          <button key={st} onClick={() => setStaffStatus(s._id, st)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              att.status === st
                                ? STATUS_MAP[st].color + " shadow-sm"
                                : "border-slate-200 text-slate-400 hover:border-slate-300"
                            }`}>
                            {STATUS_MAP[st].label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input type="time" value={att.checkIn || ""}
                        onChange={e => setAttendanceMap(prev => ({ ...prev, [s._id]: { ...prev[s._id], checkIn: e.target.value } }))}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-300 w-28 text-slate-700" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="time" value={att.checkOut || ""}
                        onChange={e => setAttendanceMap(prev => ({ ...prev, [s._id]: { ...prev[s._id], checkOut: e.target.value } }))}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-300 w-28 text-slate-700" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="text" value={att.note || ""} placeholder="Optional note"
                        onChange={e => setAttendanceMap(prev => ({ ...prev, [s._id]: { ...prev[s._id], note: e.target.value } }))}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-300 w-36 text-slate-700 placeholder-slate-300" />
                    </td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No staff found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Save button */}
      {filteredStaff.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 shadow-sm transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Attendance
          </button>
        </div>
      )}
    </div>
  );
}
