import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarCheck2, Search, Loader2,
  CheckCircle2, Clock, Users, Save,
  ChevronLeft, ChevronRight, RefreshCw, MapPin, Navigation,
  Calendar as CalendarIcon, Cloud, CloudOff
} from "lucide-react";
import { getAllStaff, getAttendance, markAttendance, updateAttendance, getAttendanceLocation, setAttendanceLocation } from "../../api/hrApi";
import toast from "react-hot-toast";
import { STATUS_MAP } from "./attendance/utils/statusMap";
import AttendanceCalendarTab from "./attendance/AttendanceCalendarTab";
import StickyPageHeader from "../components/StickyPageHeader";

export default function AdminAttendance() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [attendanceMap, setAttendanceMap] = useState({});
  const [activeTab, setActiveTab] = useState("attendance");
  const [locConfig, setLocConfig] = useState({ lat: "", lng: "", radius: 100, label: "" });
  const [locConfigSaving, setLocConfigSaving] = useState(false);
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | synced | error

  const attendanceMapRef = useRef({});
  const syncTimersRef = useRef({});
  const syncingIdsRef = useRef(new Set());
  const dirtyIdsRef = useRef(new Set());
  const syncStateTimerRef = useRef(null);

  attendanceMapRef.current = attendanceMap;

  const loadStaff = useCallback(async () => {
    try {
      const res = await getAllStaff({ status: "active", limit: 200 });
      setStaff(Array.isArray(res.data) ? res.data : res.data?.staff || []);
    } catch (err) {
      toast.error("Failed to load staff");
    }
  }, []);

  const mergeRecordIntoMap = useCallback((map, record) => {
    const sid = record.staff?._id || record.staff;
    if (!sid) return map;
    return {
      ...map,
      [sid]: {
        _id: record._id,
        status: record.status,
        checkIn: record.checkIn || "",
        checkOut: record.checkOut || "",
        note: record.note || "",
        selfie: record.selfie,
        location: record.location,
      },
    };
  }, []);

  const loadAttendance = useCallback(async (d, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await getAttendance({ date: d, limit: 300 });
      const list = res.data?.records || res.data || [];
      setAttendance(list);

      setAttendanceMap((prev) => {
        const map = { ...prev };
        list.forEach((a) => {
          const sid = a.staff?._id || a.staff;
          if (!sid) return;
          if (dirtyIdsRef.current.has(String(sid)) || syncingIdsRef.current.has(String(sid))) return;
          map[sid] = {
            _id: a._id,
            status: a.status,
            checkIn: a.checkIn || "",
            checkOut: a.checkOut || "",
            note: a.note || "",
            selfie: a.selfie,
            location: a.location,
          };
        });
        return map;
      });
    } catch (err) {
      if (!silent) toast.error("Failed to load attendance records");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const setSyncIndicator = useCallback((state) => {
    setSyncState(state);
    if (syncStateTimerRef.current) clearTimeout(syncStateTimerRef.current);
    if (state === "synced") {
      syncStateTimerRef.current = setTimeout(() => setSyncState("idle"), 2500);
    }
  }, []);

  const persistStaff = useCallback(async (staffId) => {
    const sid = String(staffId);
    const entry = attendanceMapRef.current[sid] || attendanceMapRef.current[staffId];
    if (!entry) return;

    syncingIdsRef.current.add(sid);
    setSyncIndicator("syncing");

    const payload = {
      staff: staffId,
      date,
      status: entry.status || "absent",
      checkIn: entry.checkIn || undefined,
      checkOut: entry.checkOut || undefined,
      note: entry.note || undefined,
    };

    try {
      let record;
      if (entry._id) {
        const res = await updateAttendance(entry._id, payload);
        record = res.data;
      } else {
        const res = await markAttendance([payload]);
        record = Array.isArray(res.data) ? res.data[0] : res.data;
      }

      if (record) {
        setAttendanceMap((prev) => mergeRecordIntoMap(prev, record));
      }
      dirtyIdsRef.current.delete(sid);
      setSyncIndicator("synced");
    } catch (err) {
      setSyncIndicator("error");
      toast.error(err.response?.data?.message || "Auto-sync failed");
    } finally {
      syncingIdsRef.current.delete(sid);
    }
  }, [date, mergeRecordIntoMap, setSyncIndicator]);

  const scheduleAutoSync = useCallback((staffId) => {
    const sid = String(staffId);
    dirtyIdsRef.current.add(sid);
    if (syncTimersRef.current[sid]) clearTimeout(syncTimersRef.current[sid]);
    syncTimersRef.current[sid] = setTimeout(() => {
      delete syncTimersRef.current[sid];
      persistStaff(staffId);
    }, 500);
  }, [persistStaff]);

  const flushPendingSyncs = useCallback(async () => {
    Object.keys(syncTimersRef.current).forEach((sid) => {
      clearTimeout(syncTimersRef.current[sid]);
      delete syncTimersRef.current[sid];
    });
    const pending = [...dirtyIdsRef.current];
    await Promise.all(pending.map((sid) => persistStaff(sid)));
  }, [persistStaff]);

  const changeDate = useCallback(async (newDate) => {
    await flushPendingSyncs();
    setDate(newDate);
  }, [flushPendingSyncs]);

  // Load initial data
  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => {
    loadAttendance(date);
  }, [date, loadAttendance]);

  // Realtime sync when staff mark via GPS / selfie / other admin sessions
  useEffect(() => {
    const onRemoteUpdate = () => loadAttendance(date, { silent: true });
    window.addEventListener("attendanceUpdated", onRemoteUpdate);
    return () => window.removeEventListener("attendanceUpdated", onRemoteUpdate);
  }, [date, loadAttendance]);

  useEffect(() => () => {
    Object.values(syncTimersRef.current).forEach(clearTimeout);
    if (syncStateTimerRef.current) clearTimeout(syncStateTimerRef.current);
  }, []);

  // Load location config
  useEffect(() => {
    getAttendanceLocation()
      .then(({ data }) => {
        if (data) {
          setLocConfig({
            lat: data.lat ?? "",
            lng: data.lng ?? "",
            radius: data.radius ?? 100,
            label: data.label ?? ""
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleAutoFetchLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");

    setFetchingGPS(true);
    // Use watchPosition to get the most accurate fix (lowest accuracy value)
    let bestPos = null;
    let watchId = null;

    const finalise = (pos) => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setLocConfig(p => ({
        ...p,
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6)
      }));
      setFetchingGPS(false);
      toast.success(`Location fetched (±${Math.round(pos.coords.accuracy)}m accuracy)`);
    };

    const timer = setTimeout(() => {
      if (bestPos) {
        finalise(bestPos);
      } else {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        toast.error('GPS signal too weak. Move to an open area and try again.');
        setFetchingGPS(false);
      }
    }, 20000);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
        }
        if (pos.coords.accuracy <= 20) {
          clearTimeout(timer);
          finalise(pos);
        }
      },
      (err) => {
        clearTimeout(timer);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        const msg = err.code === 1
          ? 'Permission denied. Please allow location access in browser settings.'
          : err.code === 2
          ? 'Position unavailable. Ensure GPS is on.'
          : 'Request timed out. Try again.';
        toast.error(msg);
        setFetchingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
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
        radius: Number(locConfig.radius) || 100,
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

  const currentLocalTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const updateStaffField = (staffId, patch) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [staffId]: { ...(prev[staffId] || {}), ...patch },
    }));
    scheduleAutoSync(staffId);
  };

  const setStaffStatus = (staffId, status) => {
    const apiStatus = STATUS_MAP[status]?.apiValue || status;
    const prev = attendanceMapRef.current[staffId] || {};
    const patch = { status: apiStatus };
    if (apiStatus === "present" && !prev.checkIn) {
      patch.checkIn = currentLocalTime();
    }
    updateStaffField(staffId, patch);
  };

  const markAll = async (status) => {
    const apiStatus = STATUS_MAP[status]?.apiValue || status;
    const nowTime = currentLocalTime();
    const map = { ...attendanceMapRef.current };
    staff.forEach((s) => {
      const prev = map[s._id] || {};
      map[s._id] = {
        ...prev,
        status: apiStatus,
        ...(apiStatus === "present" && !prev.checkIn ? { checkIn: nowTime } : {}),
      };
      dirtyIdsRef.current.add(String(s._id));
    });
    setAttendanceMap(map);

    setSaving(true);
    setSyncIndicator("syncing");
    try {
      const payloads = staff.map((s) => {
        const entry = map[s._id] || {};
        return {
          staff: s._id,
          date,
          status: entry.status || apiStatus,
          checkIn: entry.checkIn || undefined,
          checkOut: entry.checkOut || undefined,
          note: entry.note || undefined,
        };
      });
      const res = await markAttendance(payloads);
      const records = Array.isArray(res.data) ? res.data : [res.data];
      setAttendanceMap((prev) => {
        let next = { ...prev };
        records.forEach((r) => {
          if (r) next = mergeRecordIntoMap(next, r);
        });
        return next;
      });
      dirtyIdsRef.current.clear();
      setSyncIndicator("synced");
      toast.success(`All staff marked ${status} — synced`);
    } catch (err) {
      setSyncIndicator("error");
      toast.error(err.response?.data?.message || "Failed to sync attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter(a => a.status === "present").length;
  const absentCount = Object.values(attendanceMap).filter(a => a.status === "absent").length;
  const leaveCount = Object.values(attendanceMap).filter(a => a.status === "leave").length;
  const halfDayCount = Object.values(attendanceMap).filter(a => a.status === "half-day").length;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />

      <StickyPageHeader
        icon={CalendarCheck2}
        eyebrow="HR"
        title="Attendance"
        subtitle="Daily marking, calendar insights & location setup"
        rightAddon={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("attendance")}
              className={`w-full rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wide transition-colors sm:w-auto ${
                activeTab === "attendance"
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`w-full rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wide transition-colors sm:w-auto ${
                activeTab === "calendar"
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("location")}
              className={`w-full rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wide transition-colors sm:w-auto ${
                activeTab === "location"
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Location
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:px-4 sm:py-8 md:px-8">

      {/* ==================== ATTENDANCE TAB ==================== */}
      {activeTab === "attendance" && (
        <>
          {/* Date Navigator */}
          <div className="flex w-full max-w-full items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 sm:w-fit">
            <button
              onClick={() => {
                const d = new Date(date);
                d.setDate(d.getDate() - 1);
                changeDate(d.toISOString().split("T")[0]);
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
                onChange={(e) => changeDate(e.target.value)}
                className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                const d = new Date(date);
                d.setDate(d.getDate() + 1);
                if (d <= new Date()) changeDate(d.toISOString().split("T")[0]);
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
                { label: "Half Day", count: halfDayCount, bg: "bg-purple-500" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-slate-200 bg-white min-w-fit shadow-sm">
                  <div className={`w-2 h-2 rounded-full ${c.bg}`} />
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">{c.label}</span>
                  <span className="text-sm font-black text-slate-800">{c.count}</span>
                </div>
              ))}
            </div>

            <div className="lg:col-span-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => markAll("present")}
                className="w-full px-4 py-2 text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all sm:w-auto"
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
              <>
              <div className="lg:hidden divide-y divide-slate-100">
                {filteredStaff.map((s, idx) => {
                  const att = attendanceMap[s._id] || {};
                  return (
                    <div key={s._id} className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                          {s.name?.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-sm truncate">{s.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{s.department || "General"}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-300">#{idx + 1}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {["present", "absent", "leave", "halfday"].map((st) => (
                          <button
                            key={st}
                            onClick={() => setStaffStatus(s._id, st)}
                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                              att.status === (STATUS_MAP[st].apiValue || st)
                                ? STATUS_MAP[st].active + " shadow-sm"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {STATUS_MAP[st].label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          value={att.checkIn || ""}
                          onChange={(e) => updateStaffField(s._id, { checkIn: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold"
                        />
                        <input
                          type="time"
                          value={att.checkOut || ""}
                          onChange={(e) => updateStaffField(s._id, { checkOut: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Remarks..."
                        value={att.note || ""}
                        onChange={(e) => updateStaffField(s._id, { note: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="hidden lg:block overflow-x-auto">
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
                                  onChange={(e) => updateStaffField(s._id, { checkIn: e.target.value })}
                                  className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 w-28"
                                />
                              </div>
                              <div className="w-2 h-px bg-slate-200" />
                              <input
                                type="time"
                                value={att.checkOut || ""}
                                onChange={(e) => updateStaffField(s._id, { checkOut: e.target.value })}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 w-28"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={att.note || ""}
                              placeholder="Add comment..."
                              onChange={(e) => updateStaffField(s._id, { note: e.target.value })}
                              className="bg-transparent text-xs font-medium text-slate-600 outline-none w-full placeholder-slate-300 border-b border-transparent focus:border-indigo-200 pb-1"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          {/* Auto-sync status */}
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {syncState === "error" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                  <CloudOff className="h-5 w-5 text-rose-600" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <Cloud className="h-5 w-5 text-emerald-600" />
                </div>
              )}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Auto-sync enabled</p>
                <p className="text-sm font-medium text-slate-700">
                  {syncState === "syncing" || saving
                    ? "Saving changes…"
                    : syncState === "synced"
                    ? "All changes saved"
                    : syncState === "error"
                    ? "Sync error — check connection and retry"
                    : "Changes save automatically · live updates from staff check-ins"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(syncState === "syncing" || saving) && (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              )}
              {syncState === "synced" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              <button
                type="button"
                onClick={() => loadAttendance(date)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </>
      )}

      {/* ==================== CALENDAR TAB ==================== */}
      {activeTab === "calendar" && <AttendanceCalendarTab />}

      {/* ==================== LOCATION SETUP TAB ==================== */}
      {activeTab === "location" && (
        <div className="w-full max-w-lg space-y-6">
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
                  min="10"
                  max="5000"
                  value={locConfig.radius}
                  onChange={e => setLocConfig(p => ({ ...p, radius: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <p className="text-xs text-slate-400 mt-1">Recommended: 100–200m for indoor/outdoor GPS reliability. Min 10m.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-3">
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
    </div>
  );
}