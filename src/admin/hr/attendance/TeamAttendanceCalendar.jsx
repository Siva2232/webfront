import React from "react";
import { Loader2 } from "lucide-react";
import {
  DAY_NAMES,
  buildMonthGrid,
  dateStrFromParts,
  todayYMD,
  countSummaryLine,
} from "./utils/calendarMeta";

function DayStackBar({ day }) {
  const total = day.total || 1;
  const segments = [
    { key: "present", count: day.present, className: "bg-emerald-500" },
    { key: "absent", count: day.absent, className: "bg-rose-500" },
    { key: "leave", count: day.leave, className: "bg-amber-400" },
    { key: "halfDay", count: day.halfDay, className: "bg-purple-400" },
  ].filter((s) => s.count > 0);

  if (!day.total) {
    return <div className="mt-1 h-1 w-full rounded-full bg-slate-100" />;
  }

  return (
    <div className="mt-1 flex h-1 w-full overflow-hidden rounded-full bg-slate-100">
      {segments.map((s) => (
        <div
          key={s.key}
          className={`h-full ${s.className}`}
          style={{ width: `${(s.count / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

export default function TeamAttendanceCalendar({
  viewMonth,
  viewYear,
  dailyMap,
  loading,
  onDayClick,
  selectedDate,
}) {
  const cells = buildMonthGrid(viewYear, viewMonth);
  const todayStr = todayYMD();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400"
          >
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-slate-100">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-[72px] bg-white md:min-h-[88px]" />;
            }

            const dateStr = dateStrFromParts(viewYear, viewMonth, day);
            const dayData = dailyMap[dateStr] || {
              present: 0,
              absent: 0,
              leave: 0,
              halfDay: 0,
              total: 0,
            };
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const isSelected = selectedDate === dateStr;
            const summary = countSummaryLine(dayData);

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isFuture}
                onClick={() => !isFuture && onDayClick?.(dateStr)}
                className={`
                  relative flex min-h-[72px] flex-col items-stretch bg-white p-1.5 text-left transition md:min-h-[88px] md:p-2
                  ${!isFuture ? "cursor-pointer hover:bg-slate-50" : "cursor-default opacity-60"}
                  ${isSelected ? "ring-2 ring-inset ring-indigo-400 bg-indigo-50" : ""}
                `}
              >
                <span
                  className={`mb-1 flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full text-xs font-black ${
                    isToday ? "bg-indigo-600 text-white" : "text-slate-600"
                  }`}
                >
                  {day}
                </span>

                {summary ? (
                  <>
                    <span className="hidden text-center text-[9px] font-black uppercase tracking-wide text-slate-500 md:block">
                      {summary}
                    </span>
                    <span className="text-center text-[8px] font-bold text-slate-400 md:hidden">
                      {dayData.total}
                    </span>
                    <DayStackBar day={dayData} />
                  </>
                ) : (
                  <span className="mt-auto text-center text-[9px] text-slate-300">—</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
