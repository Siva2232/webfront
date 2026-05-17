import { Clock } from "lucide-react";

/** Slim one-line timer for floor plan + dashboard tiles. */
export default function TableOrderTimeBadge({
  timing,
  compact = false,
  variant = "default",
  size,
}) {
  if (!timing) return null;

  const isRunning = timing.mode === "running";
  const inline = variant === "table" || variant === "inline" || compact;
  const isTable = variant === "table";
  const isDashboard = size === "dashboard" || variant === "dashboard";

  const shellClass = inline
    ? `w-full rounded-md border ${timing.bgClass} ${
        isTable ? "px-2.5 py-1.5" : isDashboard ? "px-2 py-1.5" : "px-1.5 py-1"
      } ${isRunning && timing.urgency === "late" ? "animate-pulse" : ""}`
    : `mt-2 w-full rounded-xl border-2 px-2.5 py-2 shadow-sm ${timing.bgClass} ${
        isRunning && timing.urgency === "late" ? "animate-pulse" : ""
      }`;

  const clockSize = isTable ? 12 : isDashboard ? 11 : inline ? 9 : 10;
  const timeText = isTable
    ? "text-[10px]"
    : isDashboard
      ? "text-[9px]"
      : inline
        ? "text-[8px]"
        : "text-[9px]";
  const durationText = isTable
    ? "text-sm"
    : isDashboard
      ? "text-xs"
      : inline
        ? "text-[11px]"
        : "text-sm";
  const liveDot = isTable ? "h-1.5 w-1.5" : isDashboard ? "h-1.5 w-1.5" : "h-1 w-1";

  return (
    <div
      className={shellClass}
      title={`${timing.statusLine} — ordered ${timing.orderTimeLabel}`}
    >
      <div className={`flex items-center justify-between ${inline ? "gap-1.5" : "gap-2"}`}>
        <div className="flex min-w-0 items-center gap-0.5">
          {isRunning && (
            <span
              className={`${liveDot} shrink-0 rounded-full ${timing.liveDotClass} animate-pulse`}
              aria-hidden
            />
          )}
          <Clock size={clockSize} className={`shrink-0 ${timing.textClass}`} strokeWidth={2.5} />
          <span className={`truncate ${timeText} font-bold tabular-nums leading-none ${timing.textClass}`}>
            {timing.orderTimeLabel}
          </span>
        </div>
        <span className={`shrink-0 ${durationText} font-black tabular-nums leading-none ${timing.durationClass}`}>
          {timing.durationLabel}
        </span>
      </div>
    </div>
  );
}