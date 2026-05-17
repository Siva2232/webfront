import { format } from "date-fns";
import { normalizeStatus } from "../orders/utils/orderStatus";

const TERMINAL = new Set(["closed", "cancelled"]);
const KITCHEN_ACTIVE = new Set(["new", "pending", "preparing", "ready"]);
const SERVED_LIKE = new Set(["served", "paid"]);

/** Dine-in table orders only (excludes takeaway sentinel). */
export function getOrdersForTable(orders, tableId) {
  const tid = String(tableId);
  return (orders || []).filter((o) => {
    if (o?.table == null || o.table === "TAKEAWAY") return false;
    if (String(o.table) !== tid) return false;
    return !TERMINAL.has(normalizeStatus(o.status));
  });
}

export function formatOrderDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

export function formatOrderClockTime(timestamp) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "h:mm a");
}

/** green < 15m, amber 15–30m, red > 30m */
export function serviceLagLevel(elapsedMs) {
  const mins = elapsedMs / 60000;
  if (mins < 15) return "ok";
  if (mins < 30) return "warn";
  return "late";
}

const urgencyStyles = {
  ok: {
    textClass: "text-emerald-900",
    subTextClass: "text-emerald-800/90",
    bgClass: "bg-emerald-100 border-emerald-500",
    durationClass: "text-emerald-900",
    liveDotClass: "bg-emerald-500",
  },
  warn: {
    textClass: "text-amber-950",
    subTextClass: "text-amber-900/90",
    bgClass: "bg-amber-100 border-amber-500",
    durationClass: "text-amber-950",
    liveDotClass: "bg-amber-500",
  },
  late: {
    textClass: "text-rose-950",
    subTextClass: "text-rose-900/90",
    bgClass: "bg-rose-100 border-rose-600",
    durationClass: "text-rose-950",
    liveDotClass: "bg-rose-600",
  },
};

/**
 * Table session timing for floor plan (earliest open order → now or served stop).
 * @returns {null | {
 *   mode: 'running' | 'served',
 *   sessionStart: number,
 *   sessionEnd?: number,
 *   elapsedMs: number,
 *   orderTimeLabel: string,
 *   durationLabel: string,
 *   statusLine: string,
 *   urgency: 'ok' | 'warn' | 'late',
 *   textClass: string,
 *   bgClass: string,
 *   roundCount: number,
 * }}
 */
export function getTableSessionTiming(tableId, orders, now = Date.now()) {
  const tableOrders = getOrdersForTable(orders, tableId);
  if (!tableOrders.length) return null;

  const startTimes = tableOrders
    .map((o) => new Date(o.createdAt).getTime())
    .filter((t) => Number.isFinite(t));
  if (!startTimes.length) return null;

  const sessionStart = Math.min(...startTimes);
  const roundCount = tableOrders.length;

  const active = tableOrders.filter((o) =>
    KITCHEN_ACTIVE.has(normalizeStatus(o.status))
  );

  if (active.length > 0) {
    const elapsedMs = now - sessionStart;
    const urgency = serviceLagLevel(elapsedMs);
    return {
      mode: "running",
      sessionStart,
      elapsedMs,
      orderTimeLabel: formatOrderClockTime(sessionStart),
      durationLabel: formatOrderDuration(elapsedMs),
      statusLine: "Live · order running",
      urgency,
      ...urgencyStyles[urgency],
      roundCount,
    };
  }

  const servedOrders = tableOrders.filter((o) =>
    SERVED_LIKE.has(normalizeStatus(o.status))
  );
  if (servedOrders.length > 0) {
    const endTimes = servedOrders
      .map((o) => new Date(o.updatedAt || o.createdAt).getTime())
      .filter((t) => Number.isFinite(t));
    const sessionEnd = endTimes.length ? Math.max(...endTimes) : now;
    const elapsedMs = Math.max(0, sessionEnd - sessionStart);
    const urgency = serviceLagLevel(elapsedMs);
    return {
      mode: "served",
      sessionStart,
      sessionEnd,
      elapsedMs,
      orderTimeLabel: formatOrderClockTime(sessionStart),
      durationLabel: formatOrderDuration(elapsedMs),
      statusLine: "Served · time stopped",
      urgency,
      ...urgencyStyles[urgency],
      roundCount,
    };
  }

  return null;
}

export function tableHasOpenOrder(orders, tableId) {
  return getOrdersForTable(orders, tableId).length > 0;
}
