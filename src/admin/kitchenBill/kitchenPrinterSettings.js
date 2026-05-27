import { getCurrentRestaurantId, tenantGet, tenantSet } from "../../utils/tenantCache";

export const KITCHEN_PRINTER_STORAGE_KEY = "kitchenPrinterSettings";

export const DEFAULT_KITCHEN_PRINTER = {
  host: "",
  port: 9100,
  bridgeUrl: "http://127.0.0.1:17881",
};

export function getKitchenPrinterSettings() {
  const rid = getCurrentRestaurantId();
  const stored = rid ? tenantGet(KITCHEN_PRINTER_STORAGE_KEY, rid) : null;
  return { ...DEFAULT_KITCHEN_PRINTER, ...(stored || {}) };
}

export function loadKitchenPrinterForRestaurant(restaurantId) {
  if (!restaurantId) return { ...DEFAULT_KITCHEN_PRINTER };
  const stored = tenantGet(KITCHEN_PRINTER_STORAGE_KEY, restaurantId);
  return { ...DEFAULT_KITCHEN_PRINTER, ...(stored || {}) };
}

export function saveKitchenPrinterSettings(restaurantId, data) {
  if (!restaurantId) return false;
  tenantSet(KITCHEN_PRINTER_STORAGE_KEY, restaurantId, {
    ...DEFAULT_KITCHEN_PRINTER,
    ...data,
    port: Number(data?.port) || 9100,
  });
  return true;
}
