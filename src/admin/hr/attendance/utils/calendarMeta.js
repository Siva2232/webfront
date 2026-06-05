export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const STATUS_META = {
  present: {
    label: "Present",
    short: "P",
    bg: "bg-emerald-500",
    light: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  absent: {
    label: "Absent",
    short: "A",
    bg: "bg-rose-500",
    light: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  leave: {
    label: "Leave",
    short: "L",
    bg: "bg-amber-400",
    light: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-400",
  },
  "half-day": {
    label: "Half Day",
    short: "H",
    bg: "bg-purple-400",
    light: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-400",
  },
  holiday: {
    label: "Holiday",
    short: "Ho",
    bg: "bg-blue-400",
    light: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-400",
  },
};

export const IST_NOW = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);

export function todayYMD() {
  return IST_NOW().toISOString().slice(0, 10);
}

export function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return "—";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Build calendar cells: null padding + day numbers 1..N */
export function buildMonthGrid(year, monthIndex) {
  const firstDayOfMonth = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
}

export function dateStrFromParts(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function shiftMonth(viewMonth, viewYear, delta) {
  let m = viewMonth + delta;
  let y = viewYear;
  if (m < 0) {
    m = 11;
    y -= 1;
  } else if (m > 11) {
    m = 0;
    y += 1;
  }
  return { month: m, year: y };
}

export function recordsToMap(records) {
  const map = {};
  (records || []).forEach((r) => {
    if (r.date) map[String(r.date).slice(0, 10)] = r;
  });
  return map;
}

export function countSummaryLine(day) {
  if (!day || day.total === 0) return null;
  const parts = [];
  if (day.present > 0) parts.push(`${day.present}P`);
  if (day.absent > 0) parts.push(`${day.absent}A`);
  if (day.leave > 0) parts.push(`${day.leave}L`);
  if (day.halfDay > 0) parts.push(`${day.halfDay}H`);
  return parts.join(" · ");
}
