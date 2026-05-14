import { getCurrentRestaurantId, tenantGet, tenantSet } from "../../utils/tenantCache";

export const RECEIPT_HEADER_STORAGE_KEY = "receiptHeaderSettings";

export const DEFAULT_RECEIPT_HEADER = {
  restaurantName: "MY CAFE",
  address: "01 SKYLINE DRIVE, BUSINESS DISTRICT",
  phone: "+91 0000 000 000",
  gstNumber: "32AAAAA0000A1Z5",
};

/** Safe for inserting into receipt HTML */
export function escapeReceiptHtml(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Reads receipt header for the active restaurant (localStorage, tenant-scoped).
 */
export function getReceiptHeader() {
  const rid = getCurrentRestaurantId();
  const stored = rid ? tenantGet(RECEIPT_HEADER_STORAGE_KEY, rid) : null;
  return { ...DEFAULT_RECEIPT_HEADER, ...(stored || {}) };
}

export function loadReceiptHeaderForRestaurant(restaurantId) {
  if (!restaurantId) return { ...DEFAULT_RECEIPT_HEADER };
  const stored = tenantGet(RECEIPT_HEADER_STORAGE_KEY, restaurantId);
  return { ...DEFAULT_RECEIPT_HEADER, ...(stored || {}) };
}

export function saveReceiptHeader(restaurantId, data) {
  if (!restaurantId) return false;
  tenantSet(RECEIPT_HEADER_STORAGE_KEY, restaurantId, {
    ...DEFAULT_RECEIPT_HEADER,
    ...data,
  });
  return true;
}
