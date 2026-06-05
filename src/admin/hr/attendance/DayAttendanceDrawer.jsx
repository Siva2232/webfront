import React, { useState, useEffect } from "react";
import { X, Loader2, Clock, MapPin } from "lucide-react";
import { getAttendance } from "../../../api/hrApi";
import { STATUS_META, formatTime, formatDateLabel } from "./utils/calendarMeta";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "present", label: "Present" },
  { id: "absent", label: "Absent" },
  { id: "leave", label: "Leave" },
  { id: "half-day", label: "Half Day" },
];

export default function DayAttendanceDrawer({ dateStr, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!dateStr) return;
    let cancelled = false;
    setLoading(true);
    getAttendance({ date: dateStr, limit: 300 })
      .then((res) => {
        if (!cancelled) {
          setRecords(res.data?.records || res.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  if (!dateStr) return null;

  const filtered =
    filter === "all" ? records : records.filter((r) => r.status === filter);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Day detail</p>
            <p className="text-sm font-bold text-slate-800">{formatDateLabel(dateStr)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition ${
                filter === f.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">No records for this filter.</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((rec) => {
                const meta = STATUS_META[rec.status] || STATUS_META.absent;
                const staff = rec.staff || {};
                return (
                  <li
                    key={rec._id}
                    className={`rounded-2xl border p-4 ${meta.light} ${meta.border}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-800">{staff.name || "Staff"}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {staff.department || "General"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${meta.light} ${meta.text} border ${meta.border}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {(rec.checkIn || rec.checkOut) && (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {rec.checkIn && <span>In: <strong>{formatTime(rec.checkIn)}</strong></span>}
                        {rec.checkOut && <span>Out: <strong>{formatTime(rec.checkOut)}</strong></span>}
                        {rec.workHours > 0 && (
                          <span>{rec.workHours.toFixed(1)}h</span>
                        )}
                      </div>
                    )}
                    {rec.location?.lat != null && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <MapPin className="h-3 w-3" /> GPS check-in
                      </p>
                    )}
                    {rec.note && (
                      <p className="mt-2 text-xs italic text-slate-500">{rec.note}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
