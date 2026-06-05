import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Loader2,
  CheckCircle2, XCircle, CalendarX2, Minus, Clock, Sun,
} from "lucide-react";
import { getAllStaff, getAttendanceSummary } from "../../../api/hrApi";
import toast from "react-hot-toast";
import {
  DAY_NAMES,
  STATUS_META,
  buildMonthGrid,
  dateStrFromParts,
  todayYMD,
  formatTime,
  formatDateLabel,
  recordsToMap,
} from "./utils/calendarMeta";

export default function StaffAttendanceCalendar({ viewMonth, viewYear }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getAllStaff({ status: "active", limit: 300 })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.staff || [];
        setStaffList(list);
        if (list.length && !selectedStaffId) setSelectedStaffId(list[0]._id);
      })
      .catch(() => toast.error("Failed to load staff"));
  }, []);

  const loadStaffMonth = useCallback(async () => {
    if (!selectedStaffId) return;
    setLoading(true);
    setSelected(null);
    try {
      const { data } = await getAttendanceSummary(selectedStaffId, {
        month: viewMonth + 1,
        year: viewYear,
      });
      setRecords(data?.records || []);
      setSummary(data?.summary || null);
    } catch {
      toast.error("Failed to load staff calendar");
      setRecords([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [selectedStaffId, viewMonth, viewYear]);

  useEffect(() => {
    loadStaffMonth();
  }, [loadStaffMonth]);

  useEffect(() => {
    const handler = () => loadStaffMonth();
    window.addEventListener("attendanceUpdated", handler);
    return () => window.removeEventListener("attendanceUpdated", handler);
  }, [loadStaffMonth]);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
    );
  }, [staffList, staffSearch]);

  const selectedStaff = staffList.find((s) => s._id === selectedStaffId);
  const recordMap = recordsToMap(records);
  const cells = buildMonthGrid(viewYear, viewMonth);
  const todayStr = todayYMD();

  const statsCards = [
    { label: "Present", value: summary?.present || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Absent", value: summary?.absent || 0, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
    { label: "Leave", value: summary?.leave || 0, icon: CalendarX2, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Half Day", value: summary?.halfDay || 0, icon: Minus, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    { label: "Hours", value: (summary?.totalWorkHours || 0).toFixed(1), icon: Clock, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
          Select employee
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Search name or department…"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="min-w-[200px] rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none"
          >
            {filteredStaff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} · {s.department || "General"}
              </option>
            ))}
          </select>
        </div>
        {selectedStaff && (
          <p className="mt-2 text-xs text-slate-500">
            Viewing <span className="font-bold text-slate-700">{selectedStaff.name}</span>
            {selectedStaff.department ? ` · ${selectedStaff.department}` : ""}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statsCards.map(({ label, value, icon: Icon, color, bg, border }) => (
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-slate-100">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="min-h-[52px] bg-white" />;
              }
              const dateStr = dateStrFromParts(viewYear, viewMonth, day);
              const rec = recordMap[dateStr];
              const meta = rec ? STATUS_META[rec.status] : null;
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const isSelected = selected?.dateStr === dateStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isFuture}
                  onClick={() => setSelected(isSelected ? null : { dateStr, day, rec })}
                  className={`
                    relative flex min-h-[52px] flex-col items-center bg-white p-1.5 transition
                    ${!isFuture ? "cursor-pointer hover:bg-slate-50" : "cursor-default"}
                    ${isSelected ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400" : ""}
                  `}
                >
                  <span
                    className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                      isToday ? "bg-indigo-600 text-white" : isFuture ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {day}
                  </span>
                  {meta && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
                  {meta && (
                    <span className={`mt-0.5 hidden text-[9px] font-black uppercase md:block ${meta.text}`}>
                      {meta.label.slice(0, 4)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div
            className={`flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-4 ${
              selected.rec ? STATUS_META[selected.rec?.status]?.light : "bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {selected.rec ? (
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${STATUS_META[selected.rec.status]?.light} ${STATUS_META[selected.rec.status]?.text} ${STATUS_META[selected.rec.status]?.border}`}
                >
                  {STATUS_META[selected.rec.status]?.label}
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-400">
                  No record
                </span>
              )}
              <span className="text-sm font-bold text-slate-600">{formatDateLabel(selected.dateStr)}</span>
            </div>
            {selected.rec?.checkIn && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>In: <strong className="text-emerald-700">{formatTime(selected.rec.checkIn)}</strong></span>
                {selected.rec?.checkOut && (
                  <span className="ml-2">
                    Out: <strong className="text-rose-600">{formatTime(selected.rec.checkOut)}</strong>
                  </span>
                )}
              </div>
            )}
            {selected.rec?.workHours > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span><strong>{selected.rec.workHours.toFixed(1)}</strong> hrs</span>
              </div>
            )}
            {selected.rec?.note && (
              <p className="text-xs italic text-slate-500">Note: {selected.rec.note}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
            <span className="text-[11px] font-bold text-slate-500">{meta.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
