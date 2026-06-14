import { getCurrentRestaurantId, tenantGet, tenantSet } from "../../utils/tenantCache";

export const KITCHEN_PRINT_MODE_KEY = "kitchenPrintMode";
export const KITCHEN_PRINT_MODE_CHANGED_EVENT = "kitchenPrintModeChanged";

/** @typedef {"auto" | "manual"} KitchenPrintMode */

function normalizeMode(mode) {
  return mode === "auto" ? "auto" : "manual";
}

function resolveRestaurantId(explicitId) {
  if (explicitId) return String(explicitId).toUpperCase().trim();
  const fromCache = getCurrentRestaurantId();
  if (fromCache) return fromCache;
  try {
    const raw = localStorage.getItem("userInfo");
    if (raw) {
      const user = JSON.parse(raw);
      const rid = user?.restaurantId;
      if (rid) return String(rid).toUpperCase().trim();
    }
  } catch {}
  return "";
}

function readLegacyPrintMode() {
  try {
    const legacy = localStorage.getItem(KITCHEN_PRINT_MODE_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy);
    return parsed === "auto" || parsed === "manual" ? parsed : null;
  } catch {
    return null;
  }
}

/** @returns {KitchenPrintMode} */
export function getKitchenPrintMode(restaurantId) {
  const rid = resolveRestaurantId(restaurantId);
  if (rid) {
    const stored = tenantGet(KITCHEN_PRINT_MODE_KEY, rid);
    if (stored === "auto" || stored === "manual") return stored;
  }
  return readLegacyPrintMode() || "manual";
}

/** @param {KitchenPrintMode} mode @param {string} [restaurantId] */
export function setKitchenPrintMode(mode, restaurantId) {
  const normalized = normalizeMode(mode);
  const rid = resolveRestaurantId(restaurantId);

  try {
    if (rid) {
      tenantSet(KITCHEN_PRINT_MODE_KEY, rid, normalized);
      localStorage.removeItem(KITCHEN_PRINT_MODE_KEY);
    } else {
      localStorage.setItem(KITCHEN_PRINT_MODE_KEY, JSON.stringify(normalized));
    }
  } catch {
    return false;
  }

  try {
    window.dispatchEvent(
      new CustomEvent(KITCHEN_PRINT_MODE_CHANGED_EVENT, {
        detail: { mode: normalized, restaurantId: rid },
      })
    );
  } catch {}

  return true;
}
