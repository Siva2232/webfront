import { useEffect, useState } from "react";
import { getOrderRoundTiming } from "../admin/utils/tableOrderTime";

/** Live elapsed timer for one order/kitchen ticket; stops when Served/Paid. */
export default function OrderRoundTimer({ order, className = "" }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timing = getOrderRoundTiming(order, Date.now());
    if (timing?.mode !== "running") return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [order?.status, order?.createdAt, order?.updatedAt]);

  const timing = getOrderRoundTiming(order, now);
  if (!timing) return null;

  const isRunning = timing.mode === "running";

  return (
    <span
      className={`tabular-nums font-bold ${className} ${
        isRunning ? "text-indigo-300" : "text-emerald-300"
      }`}
      title={timing.statusLine}
    >
      {isRunning ? timing.durationLabel : `Done ${timing.durationLabel}`}
    </span>
  );
}
