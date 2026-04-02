import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, CalendarX2, Minus, Sun, Loader2, RefreshCw } from 'lucide-react';
import { getMyAttendance } from '../api/hrApi';
import toast from 'react-hot-toast';

// ── helpers ───────────────────────────────────────────────────────────────────

const IST_NOW = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);

const STATUS_META = {
  present:  { label: 'Present',  bg: 'bg-emerald-500',  light: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200',  dot: 'bg-emerald-500'  },
  absent:   { label: 'Absent',   bg: 'bg-red-500',      light: 'bg-red-50',      text: 'text-red-700',      border: 'border-red-200',      dot: 'bg-red-500'      },
  leave:    { label: 'Leave',    bg: 'bg-amber-400',    light: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200',    dot: 'bg-amber-400'    },
  'half-day': { label: 'Half Day', bg: 'bg-purple-400', light: 'bg-purple-50',   text: 'text-purple-700',   border: 'border-purple-200',   dot: 'bg-purple-400'   },
  holiday:  { label: 'Holiday',  bg: 'bg-blue-400',     light: 'bg-blue-50',     text: 'text-blue-700',     border: 'border-blue-200',     dot: 'bg-blue-400'     },
};

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── main component ────────────────────────────────────────────────────────────

export default function AttendanceHistoryCalendar({ accentColor = 'indigo' }) {
  const nowIST = IST_NOW();
  const [viewMonth, setViewMonth] = useState(nowIST.getUTCMonth()); // 0-indexed
  const [viewYear,  setViewYear]  = useState(nowIST.getUTCFullYear());

  const [records,  setRecords]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null); // day object clicked

  // ── fetch ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    try {
      const { data } = await getMyAttendance({ month: viewMonth + 1, year: viewYear });
      setRecords(data?.records || []);
      setSummary(data?.summary || null);
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [viewMonth, viewYear]);

  useEffect(() => { load(); }, [load]);

  // ── build calendar grid ──────────────────────────────────────────────────
  const firstDayOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay(); // 0=Sun
  const daysInMonth     = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

  // Index records by YYYY-MM-DD
  const recordMap = {};
  records.forEach((r) => {
    if (r.date) recordMap[r.date.slice(0, 10)] = r;
  });

  const todayStr = nowIST.toISOString().slice(0, 10);

  // Build flat array: nulls for leading empty cells, then day numbers 1..N
  const cells = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToday  = () => {
    const n = IST_NOW();
    setViewMonth(n.getUTCMonth());
    setViewYear(n.getUTCFullYear());
  };

  // ── summary counts ───────────────────────────────────────────────────────
  const present  = summary?.present || 0;
  const absent   = summary?.absent  || 0;
  const leave    = summary?.leave   || 0;
  const halfDay  = summary?.halfDay || 0;
  const workHrs  = (summary?.totalWorkHours || 0).toFixed(1);

  const statsCards = [
    { label: 'Present',   value: present,  icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Absent',    value: absent,   icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200'     },
    { label: 'Leave',     value: leave,    icon: CalendarX2,   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
    { label: 'Half Day',  value: halfDay,  icon: Minus,        color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200'  },
    { label: 'Hours Worked', value: workHrs, icon: Clock,      color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-200'     },
  ];

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Summary stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statsCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`${bg} ${border} border rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0`}>
              <Icon className={`${color} w-4 h-4`} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Calendar card ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <p className="text-base font-black text-slate-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </p>
            <button
              onClick={goToday}
              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <button
            onClick={nextMonth}
            disabled={`${viewYear}-${String(viewMonth + 1).padStart(2,'0')}` >= todayStr.slice(0, 7)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 disabled:opacity-25 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Calendar grid */}
        {!loading && (
          <div className="grid grid-cols-7 gap-px bg-slate-100">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="bg-white min-h-[52px]" />;
              }
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const rec     = recordMap[dateStr];
              const meta    = rec ? STATUS_META[rec.status] : null;
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const isSelected = selected?.dateStr === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelected(isSelected ? null : { dateStr, day, rec })}
                  disabled={isFuture}
                  className={`
                    relative bg-white min-h-[52px] p-1.5 flex flex-col items-center justify-start
                    transition-all duration-150 group focus:outline-none
                    ${!isFuture ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}
                    ${isSelected ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-50' : ''}
                  `}
                >
                  {/* Day number */}
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mb-1
                    ${isToday ? 'bg-indigo-600 text-white' : isFuture ? 'text-slate-300' : 'text-slate-600'}
                  `}>
                    {day}
                  </span>

                  {/* Status dot */}
                  {meta && (
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  )}

                  {/* Status label — shown on md+ screens */}
                  {meta && (
                    <span className={`hidden md:block text-[9px] font-black uppercase tracking-wider mt-0.5 ${meta.text}`}>
                      {meta.label.length > 4 ? meta.label.slice(0, 4) : meta.label}
                    </span>
                  )}

                  {/* Today indicator ring */}
                  {isToday && !meta && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected day detail */}
        {selected && (
          <div className={`
            border-t border-slate-100 px-5 py-4 flex flex-wrap items-center gap-4
            ${selected.rec ? STATUS_META[selected.rec?.status]?.light : 'bg-slate-50'}
          `}>
            <div className="flex items-center gap-2">
              {selected.rec ? (
                <span className={`
                  px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider
                  ${STATUS_META[selected.rec.status]?.light} ${STATUS_META[selected.rec.status]?.text}
                  border ${STATUS_META[selected.rec.status]?.border}
                `}>
                  {STATUS_META[selected.rec.status]?.label}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200">
                  No Record
                </span>
              )}
              <span className="text-sm font-bold text-slate-600">
                {new Date(selected.dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {selected.rec?.checkIn && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>In: <strong className="text-emerald-700">{formatTime(selected.rec.checkIn)}</strong></span>
                {selected.rec?.checkOut && (
                  <span className="ml-2">Out: <strong className="text-rose-600">{formatTime(selected.rec.checkOut)}</strong></span>
                )}
              </div>
            )}

            {selected.rec?.workHours > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span><strong>{selected.rec.workHours.toFixed(1)}</strong> hrs worked</span>
              </div>
            )}

            {selected.rec?.note && (
              <p className="text-xs text-slate-500 italic">Note: {selected.rec.note}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
            <span className="text-[11px] font-bold text-slate-500">{meta.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-[7px] font-black text-white">D</span>
          </span>
          <span className="text-[11px] font-bold text-slate-500">Today</span>
        </div>
      </div>
    </div>
  );
}
