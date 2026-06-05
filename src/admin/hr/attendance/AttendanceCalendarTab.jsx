import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, User, ChevronLeft, ChevronRight, RefreshCw,
  CheckCircle2, XCircle, CalendarX2, Minus, Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAttendanceCalendarOverview } from "../../../api/hrApi";
import {
  MONTH_NAMES,
  STATUS_META,
  IST_NOW,
  todayYMD,
  shiftMonth,
} from "./utils/calendarMeta";
import TeamAttendanceCalendar from "./TeamAttendanceCalendar";
import StaffAttendanceCalendar from "./StaffAttendanceCalendar";
import DayAttendanceDrawer from "./DayAttendanceDrawer";

export default function AttendanceCalendarTab() {
  const nowIST = IST_NOW();
  const [viewMonth, setViewMonth] = useState(nowIST.getUTCMonth());
  const [viewYear, setViewYear] = useState(nowIST.getUTCFullYear());
  const [mode, setMode] = useState("team");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawerDate, setDrawerDate] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadOverview = useCallback(async () => {
    if (mode !== "team") return;
    setLoading(true);
    try {
      const { data } = await getAttendanceCalendarOverview({
        month: viewMonth + 1,
        year: viewYear,
      });
      setOverview(data);
    } catch {
      toast.error("Failed to load team calendar");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [mode, viewMonth, viewYear, refreshKey]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const onUpdate = () => setRefreshKey((k) => k + 1);
    window.addEventListener("attendanceUpdated", onUpdate);
    return () => window.removeEventListener("attendanceUpdated", onUpdate);
  }, []);

  const dailyMap = useMemo(() => {
    const map = {};
    (overview?.daily || []).forEach((d) => {
      map[d.date] = d;
    });
    return map;
  }, [overview?.daily]);

  const summary = overview?.summary || {};
  const todayStr = todayYMD();

  const teamStats = [
    { label: "Present", value: summary.present || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Absent", value: summary.absent || 0, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
    { label: "Leave", value: summary.leave || 0, icon: CalendarX2, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Half Day", value: summary.halfDay || 0, icon: Minus, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    { label: "Hours", value: summary.totalWorkHours || 0, icon: Clock, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  ];

  const handleMonthChange = ({ month, year }) => {
    setViewMonth(month);
    setViewYear(year);
  };

  const goToday = () => {
    const n = IST_NOW();
    setViewMonth(n.getUTCMonth());
    setViewYear(n.getUTCFullYear());
  };

  return (
    <div className="space-y-5">
      {/* Mode + month controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setMode("team")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[11px] font-bold transition ${
              mode === "team" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="h-4 w-4" />
            Team
          </button>
          <button
            type="button"
            onClick={() => setMode("individual")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[11px] font-bold transition ${
              mode === "individual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="h-4 w-4" />
            Individual
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMonthChange(shiftMonth(viewMonth, viewYear, -1))}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[140px] text-center">
            <p className="text-sm font-black text-slate-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </p>
            {mode === "team" && overview?.staffCount != null && (
              <p className="text-[10px] font-bold text-slate-400">{overview.staffCount} active staff</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleMonthChange(shiftMonth(viewMonth, viewYear, 1))}
            disabled={`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}` >= todayStr.slice(0, 7)}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-25"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => (mode === "team" ? loadOverview() : setRefreshKey((k) => k + 1))}
            disabled={loading}
            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-indigo-600"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {mode === "team" ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {teamStats.map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`${bg} ${border} flex items-center gap-3 rounded-2xl border p-4`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          <TeamAttendanceCalendar
            viewMonth={viewMonth}
            viewYear={viewYear}
            dailyMap={dailyMap}
            loading={loading}
            selectedDate={drawerDate}
            onDayClick={setDrawerDate}
          />

          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUS_META).map(([status, meta]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                <span className="text-[11px] font-bold text-slate-500">{meta.label}</span>
              </div>
            ))}
            <span className="text-[11px] text-slate-400">· Click a day for staff list</span>
          </div>
        </>
      ) : (
        <StaffAttendanceCalendar
          key={refreshKey}
          viewMonth={viewMonth}
          viewYear={viewYear}
        />
      )}

      {drawerDate && mode === "team" && (
        <DayAttendanceDrawer dateStr={drawerDate} onClose={() => setDrawerDate(null)} />
      )}
    </div>
  );
}
