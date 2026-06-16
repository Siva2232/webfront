import toast from "react-hot-toast";
import API from "../../api/axios";
import { getCurrentRestaurantId } from "../../utils/tenantCache";
import { getKitchenPrintMode } from "./kitchenPrintMode";
import { directPrintKitchenReceipt } from "./kitchenPrint";

const PRINTED_IDS_MAX = 200;
/** Only poll-fallback print orders created within this window (avoids mass-print on page load). */
export const FETCH_AUTO_PRINT_MAX_AGE_MS = 3 * 60 * 1000;

const printedIds = new Set();
const scheduledOrderIds = new Set();
let printedIdsLoadedForRid = "";

function printedIdsStorageKey() {
  const rid = getCurrentRestaurantId();
  return rid ? `kotPrinted:${rid}` : "kotPrinted";
}

function ensurePrintedIdsLoaded() {
  const rid = getCurrentRestaurantId() || "_default";
  if (printedIdsLoadedForRid === rid) return;
  printedIdsLoadedForRid = rid;
  printedIds.clear();
  try {
    const raw = sessionStorage.getItem(printedIdsStorageKey());
    const list = JSON.parse(raw || "[]");
    if (Array.isArray(list)) {
      list.filter(Boolean).forEach((kotId) => printedIds.add(kotId));
    }
  } catch (_) {}
}

function persistPrintedIds() {
  try {
    const list = [...printedIds].slice(-PRINTED_IDS_MAX);
    sessionStorage.setItem(printedIdsStorageKey(), JSON.stringify(list));
  } catch (_) {}
}

function kitchenBillId(kb) {
  return String(kb?._id || kb?.id || "").trim();
}

function trimPrintedIds() {
  if (printedIds.size <= PRINTED_IDS_MAX) return;
  const kept = [...printedIds].slice(-PRINTED_IDS_MAX);
  printedIds.clear();
  kept.forEach((kotId) => printedIds.add(kotId));
  persistPrintedIds();
}

/** True when fetchOrders fallback should schedule auto-print (recent order only). */
export function isOrderEligibleForFetchAutoPrint(order) {
  const t = new Date(order?.createdAt || order?._optimisticAt || 0).getTime();
  if (!t || Number.isNaN(t)) return false;
  return Date.now() - t <= FETCH_AUTO_PRINT_MAX_AGE_MS;
}

function pickLatestKitchenBill(bills) {
  if (!Array.isArray(bills) || bills.length === 0) return null;
  return bills.reduce((best, bill) => {
    if (!best) return bill;
    const bestBatch = Number(best.batchNumber) || 0;
    const billBatch = Number(bill.batchNumber) || 0;
    if (billBatch !== bestBatch) return billBatch > bestBatch ? bill : best;
    return new Date(bill.createdAt || 0) > new Date(best.createdAt || 0) ? bill : best;
  }, null);
}

/**
 * Print a kitchen ticket when auto-print mode is enabled.
 * Dedupes by kitchen bill id so socket + listener cannot double-print.
 */
export async function maybeAutoPrintKitchenBill(kb, { showToast = true } = {}) {
  if (getKitchenPrintMode(getCurrentRestaurantId()) !== "auto") return false;
  ensurePrintedIdsLoaded();
  const id = kitchenBillId(kb);
  if (!id || printedIds.has(id)) return false;

  printedIds.add(id);
  persistPrintedIds();
  trimPrintedIds();

  try {
    await directPrintKitchenReceipt(kb);
    if (showToast) toast.success("KOT sent to kitchen printer");
    return true;
  } catch (err) {
    printedIds.delete(id);
    persistPrintedIds();
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
  if (scheduledOrderIds.has(id)) return () => {};
  scheduledOrderIds.add(id);

  let attempts = 0;
  let cancelled = false;
  let timerId = null;

  const stop = () => {
    cancelled = true;
    if (timerId != null) window.clearInterval(timerId);
    scheduledOrderIds.delete(id);
  };

  const tick = async () => {
    if (cancelled) return;
    attempts += 1;
    try {
      const { data } = await API.get(`/kitchen-bills/order/${id}`);
      const latest = pickLatestKitchenBill(Array.isArray(data) ? data : []);
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
