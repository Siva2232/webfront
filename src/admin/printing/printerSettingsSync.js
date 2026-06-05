import API from "../../api/axios";
import { getCurrentRestaurantId } from "../../utils/tenantCache";
import {
  DEFAULT_POS_PRINTER,
  getPosPrinterSettings,
  savePosPrinterSettings,
} from "../orderBill/posPrinterSettings";
import {
  DEFAULT_KITCHEN_PRINTER,
  getKitchenPrinterSettings,
  saveKitchenPrinterSettings,
} from "../kitchenBill/kitchenPrinterSettings";

let inflight = null;

/**
 * Pull printer IPs from the server and merge into local tenant cache.
 * Server values fill in missing local hosts; local cache wins when host is already set.
 */
export async function fetchPrinterSettingsFromServer(restaurantId) {
  const rid = (restaurantId || getCurrentRestaurantId() || "").toUpperCase().trim();
  if (!rid) return null;

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data } = await API.get(`/restaurants/${rid}/printer-settings`);
      if (!data || typeof data !== "object") return null;

      const localInvoice = getPosPrinterSettings();
      const localKitchen = getKitchenPrinterSettings();

      const invoiceFromServer = data.invoice || {};
      const kitchenFromServer = data.kitchen || {};

      const serverInvoiceHost = String(invoiceFromServer.host || "").trim();
      const serverKitchenHost = String(kitchenFromServer.host || "").trim();

      const mergedInvoice = {
        ...DEFAULT_POS_PRINTER,
        ...localInvoice,
        host: serverInvoiceHost || localInvoice.host?.trim() || "",
        port: Number(invoiceFromServer.port) || Number(localInvoice.port) || 9100,
      };

      const mergedKitchen = {
        ...DEFAULT_KITCHEN_PRINTER,
        ...localKitchen,
        host: serverKitchenHost || localKitchen.host?.trim() || "",
        port: Number(kitchenFromServer.port) || Number(localKitchen.port) || 9100,
      };

      if (serverInvoiceHost || !localInvoice.host?.trim()) {
        savePosPrinterSettings(rid, mergedInvoice);
      }
      if (serverKitchenHost || !localKitchen.host?.trim()) {
        saveKitchenPrinterSettings(rid, mergedKitchen);
      }

      return { invoice: mergedInvoice, kitchen: mergedKitchen };
    } catch (_) {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Push printer IPs to the server (admin save). */
export async function savePrinterSettingsToServer(restaurantId, { invoice, kitchen }) {
  const rid = (restaurantId || getCurrentRestaurantId() || "").toUpperCase().trim();
  if (!rid) return null;

  const { data } = await API.put(`/restaurants/${rid}/printer-settings`, {
    invoice: {
      host: String(invoice?.host || "").trim(),
      port: Number(invoice?.port) || 9100,
    },
    kitchen: {
      host: String(kitchen?.host || "").trim(),
      port: Number(kitchen?.port) || 9100,
    },
  });
  return data?.printerSettings ?? data;
}
