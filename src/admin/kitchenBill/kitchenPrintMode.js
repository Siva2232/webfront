import { getCurrentRestaurantId, tenantGet, tenantSet } from "../../utils/tenantCache";

export const KITCHEN_PRINT_MODE_KEY = "kitchenPrintMode";

/** @typedef {"auto" | "manual"} KitchenPrintMode */

/** @returns {KitchenPrintMode} */
export function getKitchenPrintMode() {
  const rid = getCurrentRestaurantId();
  const stored = rid ? tenantGet(KITCHEN_PRINT_MODE_KEY, rid) : null;
  return stored === "auto" ? "auto" : "manual";
}

/** @param {KitchenPrintMode} mode */
export function setKitchenPrintMode(mode) {
  const rid = getCurrentRestaurantId();
  if (!rid) return false;
  tenantSet(KITCHEN_PRINT_MODE_KEY, rid, mode === "auto" ? "auto" : "manual");
  return true;
}
