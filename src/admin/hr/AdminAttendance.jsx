import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck2, Search, Loader2,
  CheckCircle2, Clock, Users, Save,
  ChevronLeft, ChevronRight, RefreshCw, MapPin, Navigation,
  Calendar as CalendarIcon
} from "lucide-react";
import { getAllStaff, getAttendance, markAttendance, getAttendanceLocation, setAttendanceLocation } from "../../api/hrApi";
import toast from "react-hot-toast";

const STATUS_MAP = {
  present:  { label: "Present",  color: "bg-emerald-50 text-emerald-700 border-emerald-200", active: "bg-emerald-600 text-white border-emerald-600" },
  absent:   { label: "Absent",   color: "bg-rose-50 text-rose-700 border-rose-200",     active: "bg-rose-600 text-white border-rose-600" },
  leave:    { label: "Leave",    color: "bg-amber-50 text-amber-700 border-amber-200",   active: "bg-amber-600 text-white border-amber-600" },
  holiday:  { label: "Holiday",  color: "bg-blue-50 text-blue-700 border-blue-200",     active: "bg-blue-600 text-white border-blue-600" },
  halfday:  { label: "Half Day", color: "bg-purple-50 text-purple-700 border-purple-200", active: "bg-purple-600 text-white border-purple-600", apiValue: "half-day" },
};

export default function AdminAttendance() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [attendanceMap, setAttendanceMap] = useState({});
  const [activeTab, setActiveTab] = useState("attendance");
  const [locConfig, setLocConfig] = useState({ lat: "", lng: "", radius: 10, label: "" });
  const [locConfigSaving, setLocConfigSaving] = useState(false);
  const [fetchingGPS, setFetchingGPS] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const res = await getAllStaff({ status: "active", limit: 200 });
      setStaff(Array.isArray(res.data) ? res.data : res.data?.staff || []);
    } catch (err) {
      toast.error("Failed to load staff");
    }
  }, []);

  const loadAttendance = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await getAttendance({ date: d });
      const list = res.data?.records || res.data || [];
      setAttendance(list);

      const map = {};
      list.forEach(a => {
        const sid = a.staff?._id || a.staff;
        if (sid) {
          map[sid] = {
            _id: a._id,
            status: a.status,
            checkIn: a.checkIn || "",
            checkOut: a.checkOut || "",
            note: a.note || "",
            selfie: a.selfie,
            location: a.location
          };
        }
      });
      setAttendanceMap(map);
    } catch (err) {
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { loadAttendance(date); }, [date, loadAttendance]);

  // Load location config
  useEffect(() => {
    getAttendanceLocation()
      .then(({ data }) => {
        if (data) {
          setLocConfig({
            lat: data.lat ?? "",
            lng: data.lng ?? "",
            radius: data.radius ?? 10,
            label: data.label ?? ""
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleAutoFetchLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");

    setFetchingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocConfig(p => ({
          ...p,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        }));
        setFetchingGPS(false);
        toast.success("Location fetched from your device");
      },
      (err) => {
        console.error("GPS Error:", err);
        const msg = err.code === 1 
          ? "Permission denied. Please allow location access in browser settings."
          : err.code === 2 
            ? "Position unavailable. Ensure GPS is on."
            : "Request timed out. Try again.";
        toast.error(msg);
        setFetchingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const saveLocConfig = async () => {
    if (!locConfig.lat || !locConfig.lng) {
      return toast.error("Latitude and Longitude are required");
    }

    setLocConfigSaving(true);
    try {
      await setAttendanceLocation({
        lat: Number(locConfig.lat),
        lng: Number(locConfig.lng),
        radius: Number(locConfig.radius) || 10,
        label: locConfig.label
      });
      toast.success("Work location saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save location");
    } finally {
      setLocConfigSaving(false);
    }
  };

  const filteredStaff = staff.filter(s => {
    const q = search.toLowerCase();
    return !q || 
      s.name?.toLowerCase().includes(q) || 
      s.department?.toLowerCase().includes(q);
  });

  const setStaffStatus = (staffId, status) => {
    const apiStatus = STATUS_MAP[status]?.apiValue || status;
    setAttendanceMap(prev => ({
      ...prev,
      [staffId]: { ...(prev[staffId] || {}), status: apiStatus }
    }));
  };

  const markAll = (status) => {
    const apiStatus = STATUS_MAP[status]?.apiValue || status;
    const map = { ...attendanceMap };
    staff.forEach(s => {
      map[s._id] = { ...(map[s._id] || {}), status: apiStatus };
    });
    setAttendanceMap(map);
    toast.success(`Marked all as ${status}`);
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

      await markAttendance(payloads);
      toast.success("Attendance updated successfully");
      loadAttendance(date);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to sync attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter(a => a.status === "present").length;
  const absentCount = Object.values(attendanceMap).filter(a => a.status === "absent").length;
  const leaveCount = Object.values(attendanceMap).filter(a => a.status === "leave").length;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Attendance</h1>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2 uppercase tracking-widest text-[10px]">
            <Users className="w-3 h-3" /> Management Dashboard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === "attendance" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" /> Attendance
          </button>
          <button
            onClick={() => setActiveTab("location")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === "location" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <MapPin className="w-4 h-4" /> Location Setup
          </button>
        </div>
      </div>

      {/* ==================== ATTENDANCE TAB ==================== */}
      {activeTab === "attendance" && (
        <>
          {/* Date Navigator */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit">
            <button
              onClick={() => {
                const d = new Date(date);
                d.setDate(d.getDate() - 1);
                setDate(d.toISOString().split("T")[0]);
              }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 border-x border-slate-100">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              <input
                type="date"
                value={date}
                max={new Date().toISOString().split("T")[0]}
                onChange={e => setDate(e.target.value)}
                className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                const d = new Date(date);
                d.setDate(d.getDate() + 1);
                if (d <= new Date()) setDate(d.toISOString().split("T")[0]);
              }}
              disabled={date >= new Date().toISOString().split("T")[0]}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-4 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or department..."
                className="bg-transparent text-sm font-medium outline-none w-full text-slate-700 placeholder-slate-400"
              />
            </div>

            <div className="lg:col-span-5 flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              {[
                { label: "Present", count: presentCount, bg: "bg-emerald-500" },
                { label: "Absent", count: absentCount, bg: "bg-rose-500" },
                { label: "Leave", count: leaveCount, bg: "bg-amber-500" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-slate-200 bg-white min-w-fit shadow-sm">
                  <div className={`w-2 h-2 rounded-full ${c.bg}`} />
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">{c.label}</span>
                  <span className="text-sm font-black text-slate-800">{c.count}</span>
                </div>
              ))}
            </div>

            <div className="lg:col-span-3 flex justify-end gap-2">
              <button
                onClick={() => markAll("present")}
                className="px-4 py-2 text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
              >
                Mark All Present
              </button>
              <button
                onClick={() => loadAttendance(date)}
                className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching Daily Logs</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Clock In/Out</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStaff.map((s, idx) => {
                      const att = attendanceMap[s._id] || {};
                      return (
                        <tr key={s._id} className="group hover:bg-indigo-50/30 transition-all">
                          <td className="px-6 py-4 text-center font-bold text-slate-300 text-xs">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-black group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                {s.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">{s.department || "General"}</p>
                                  {att.location && (
                                    <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1">
                                      <MapPin className="w-2.5 h-2.5" /> GPS
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                              {["present", "absent", "leave", "halfday"].map(st => (
                                <button
                                  key={st}
                                  onClick={() => setStaffStatus(s._id, st)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                                    att.status === (STATUS_MAP[st].apiValue || st)
                                      ? STATUS_MAP[st].active + " shadow-sm scale-105"
                                      : "text-slate-400 hover:text-slate-600"
                                  }`}
                                >
                                  {STATUS_MAP[st].label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                                <input
                                  type="time"
                                  value={att.checkIn || ""}
                                  onChange={e => setAttendanceMap(p => ({ ...p, [s._id]: { ...p[s._id], checkIn: e.target.value } }))}
                                  className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 w-28"
                                />
                              </div>
                              <div className="w-2 h-px bg-slate-200" />
                              <input
                                type="time"
                                value={att.checkOut || ""}
                                onChange={e => setAttendanceMap(p => ({ ...p, [s._id]: { ...p[s._id], checkOut: e.target.value } }))}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 w-28"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={att.note || ""}
                              placeholder="Add comment..."
                              onChange={e => setAttendanceMap(p => ({ ...p, [s._id]: { ...p[s._id], note: e.target.value } }))}
                              className="bg-transparent text-xs font-medium text-slate-600 outline-none w-full placeholder-slate-300 border-b border-transparent focus:border-indigo-200 pb-1"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
            <div className="hidden md:block">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Review complete?</p>
              <p className="text-sm font-medium text-slate-300 mt-0.5">Ensure all times are accurate before committing.</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || filteredStaff.length === 0}
              className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              SYNC ATTENDANCE
            </button>
          </div>
        </>
      )}

      {/* ==================== LOCATION SETUP TAB ==================== */}
      {activeTab === "location" && (
        <div className="max-w-lg space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-black text-slate-800">Work Location Setup</h2>
                <p className="text-xs text-slate-400">Staff must be within the set radius to mark attendance</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Location Label</label>
                <input
                  type="text"
                  placeholder="e.g. Main Restaurant"
                  value={locConfig.label}
                  onChange={e => setLocConfig(p => ({ ...p, label: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 28.613939"
                    value={locConfig.lat}
                    onChange={e => setLocConfig(p => ({ ...p, lat: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 77.209021"
                    value={locConfig.lng}
                    onChange={e => setLocConfig(p => ({ ...p, lng: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Allowed Radius (metres)</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={locConfig.radius}
                  onChange={e => setLocConfig(p => ({ ...p, radius: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <p className="text-xs text-slate-400 mt-1">Staff must be within this distance. Default: 10m</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAutoFetchLocation}
                disabled={fetchingGPS}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
              >
                {fetchingGPS ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                {fetchingGPS ? "Fetching…" : "Auto-Fetch My Location"}
              </button>
              <button
                onClick={saveLocConfig}
                disabled={locConfigSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
              >
                {locConfigSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {locConfigSaving ? "Saving…" : "Save Location"}
              </button>
            </div>
          </div>

          {locConfig.lat && locConfig.lng && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Location Configured</p>
                <p className="text-xs text-emerald-600">
                  {locConfig.label && <span className="font-semibold">{locConfig.label} — </span>}
                  {Number(locConfig.lat).toFixed(5)}, {Number(locConfig.lng).toFixed(5)} · Radius: {locConfig.radius}m
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}