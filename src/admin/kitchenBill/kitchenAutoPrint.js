import toast from "react-hot-toast";
import API from "../../api/axios";
import { getCurrentRestaurantId } from "../../utils/tenantCache";
import { getKitchenPrintMode } from "./kitchenPrintMode";
import { directPrintKitchenReceipt } from "./kitchenPrint";

const printedIds = new Set();

function kitchenBillId(kb) {
  return String(kb?._id || kb?.id || "").trim();
}

function trimPrintedIds() {
  if (printedIds.size <= 200) return;
  printedIds.clear();
  printedIds.add("__trimmed__");
}

/**
 * Print a kitchen ticket when auto-print mode is enabled.
 * Dedupes by kitchen bill id so socket + listener cannot double-print.
 */
export async function maybeAutoPrintKitchenBill(kb, { showToast = true } = {}) {
  if (getKitchenPrintMode(getCurrentRestaurantId()) !== "auto") return false;
  const id = kitchenBillId(kb);
  if (!id || printedIds.has(id)) return false;

  printedIds.add(id);
  trimPrintedIds();

  try {
    await directPrintKitchenReceipt(kb);
    if (showToast) toast.success("KOT sent to kitchen printer");
    return true;
  } catch (err) {
    printedIds.delete(id);
    if (showToast) {
      if (err?.queued) {
        toast.success(err.message || "KOT queued — connector will print shortly", { duration: 5000 });
        return true;
      }
      toast.error(err?.message || "Auto print failed");
    }
    throw err;
  }
}

/**
 * Fallback when socket delivery is slow: poll kitchen bills for an order and auto-print.
 */
export function scheduleAutoPrintForOrder(orderId, { maxAttempts = 12, intervalMs = 500 } = {}) {
  if (getKitchenPrintMode(getCurrentRestaurantId()) !== "auto") return () => {};
  const id = String(orderId || "").trim();
  if (!id) return () => {};

  let attempts = 0;
  let cancelled = false;
  let timerId = null;

  const stop = () => {
    cancelled = true;
    if (timerId != null) window.clearInterval(timerId);
  };

  const tick = async () => {
    if (cancelled) return;
    attempts += 1;
    try {
      const { data } = await API.get(`/kitchen-bills/order/${id}`);
      const bills = Array.isArray(data) ? data : [];
      const latest = bills.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      )[0];
      if (latest) {
        await maybeAutoPrintKitchenBill(latest);
        stop();
        return;
      }
    } catch (_) {}

    if (attempts >= maxAttempts) stop();
  };

  void tick();
  timerId = window.setInterval(() => {
    void tick();
  }, intervalMs);

  return stop;
}
