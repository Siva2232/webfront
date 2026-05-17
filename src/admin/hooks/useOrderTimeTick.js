import { useEffect, useState } from "react";
import { normalizeStatus } from "../orders/utils/orderStatus";

const RUNNING = new Set(["new", "pending", "preparing", "ready"]);

/** Tick every 1s while kitchen-active orders exist; otherwise every 60s. */
export function useOrderTimeTick(orders) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const hasRunning = (orders || []).some((o) => {
      if (o?.table == null || o.table === "TAKEAWAY") return false;
      return RUNNING.has(normalizeStatus(o.status));
    });
    const intervalMs = hasRunning ? 1000 : 60000;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [orders]);

  return now;
}
