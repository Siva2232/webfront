import { TAKEAWAY_TABLE } from "../context/CartContext";
import { getCurrentRestaurantId, tenantKey } from "./tenantCache";

export function orderSessionRef(order) {
  return String(order?.sessionRef || order?._id || order?.id || "");
}

export function isTakeawayTableOrder(order) {
  if (!order) return false;
  return (
    order.table === TAKEAWAY_TABLE ||
    order.table === "TAKEAWAY" ||
    order.isTakeawayOrder === true
  );
}

export function takeawayCustomerDisplayName(order) {
  return String(order?.customerName || "").trim();
}

/** "Priya · Token #12" or partial when data missing */
export function formatTakeawayCustomerLabel(order) {
  const name = takeawayCustomerDisplayName(order);
  const token = order?.tokenNumber;
  const hasToken = token != null && String(token).trim() !== "";

  if (name && hasToken) return `${name} · Token #${token}`;
  if (name) return name;
  if (hasToken) return `Token #${token}`;
  return "";
}

/** Persist which takeaway ticket this browser is tracking (not other customers). */
export function persistTakeawayTrackOrderId(orderId) {
  if (orderId == null || orderId === "") return;
  try {
    const rid = getCurrentRestaurantId();
    const id = String(orderId);
    localStorage.setItem(tenantKey("takeawayTrackOrderId", rid), id);
    localStorage.setItem(tenantKey("lastOrderId", rid), id);
  } catch {
    /* ignore */
  }
}

export function getTakeawayTrackOrderId(searchParams) {
  const fromUrl =
    searchParams?.get?.("order")?.trim() ||
    searchParams?.get?.("mergeId")?.trim() ||
    "";
  if (fromUrl) return fromUrl;
  try {
    const rid = getCurrentRestaurantId();
    return (
      localStorage.getItem(tenantKey("takeawayTrackOrderId", rid)) ||
      localStorage.getItem(tenantKey("lastOrderId", rid)) ||
      ""
    );
  } catch {
    return "";
  }
}

/**
 * Takeaway queue shares one table id — only show this visitor's session (same customer add-on rounds).
 */
export function filterTakeawayOrdersForVisitor(openTakeawayOrders, allOrders, trackOrderId) {
  if (!trackOrderId || !openTakeawayOrders?.length) return [];

  const pool = allOrders?.length ? allOrders : openTakeawayOrders;
  const anchor = pool.find((o) => String(o._id || o.id) === String(trackOrderId));
  const sessionRoot = anchor ? orderSessionRef(anchor) : null;

  if (sessionRoot) {
    return openTakeawayOrders.filter((o) => orderSessionRef(o) === sessionRoot);
  }

  return openTakeawayOrders.filter(
    (o) => String(o._id || o.id) === String(trackOrderId)
  );
}
