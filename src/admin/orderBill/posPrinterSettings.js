import { getCurrentRestaurantId, tenantGet, tenantSet } from "../../utils/tenantCache";

export const POS_PRINTER_STORAGE_KEY = "posPrinterSettings";

export const DEFAULT_POS_PRINTER = {
  /** Network thermal printer IP (ESC/POS port 9100) */
  host: "",
  port: 9100,
  /** Local RestoPrint bridge on the POS PC */
  bridgeUrl: "http://127.0.0.1:17881",
};

export function getPosPrinterSettings() {
  const rid = getCurrentRestaurantId();
  const stored = rid ? tenantGet(POS_PRINTER_STORAGE_KEY, rid) : null;
  return { ...DEFAULT_POS_PRINTER, ...(stored || {}) };
}

export function loadPosPrinterForRestaurant(restaurantId) {
  if (!restaurantId) return { ...DEFAULT_POS_PRINTER };
  const stored = tenantGet(POS_PRINTER_STORAGE_KEY, restaurantId);
  return { ...DEFAULT_POS_PRINTER, ...(stored || {}) };
}

export function savePosPrinterSettings(restaurantId, data) {
  if (!restaurantId) return false;
  tenantSet(POS_PRINTER_STORAGE_KEY, restaurantId, {
    ...DEFAULT_POS_PRINTER,
    ...data,
    port: Number(data?.port) || 9100,
  });
  return true;
}
