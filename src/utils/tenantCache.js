/**
 * Tenant-scoped localStorage cache helper.
 *
 * Strategy: Each restaurant gets its OWN namespaced localStorage keys:
 *   products_RESTO001, cachedOrders_RESTO001, etc.
 *
 * This means revisiting any restaurant always shows its own cached data
 * without clearing another restaurant's cache. No more cross-tenant erasure.
 */

const BASE_CACHE_KEYS = [
  "products",
  "categories",
  "cachedOrders",
  "cachedBills",
  "cachedKitchenBills",
  "cachedTokens",
  "lastTokenFetch",
  "lastBillFetch",
  "optimisticOrderPatch",
  "ui_banners",
  "ui_offers",
  "lastUsedTable",
  "restaurantBranding",
  "receiptHeaderSettings",
];

/** Public guest routes — tenant must come from ?restaurantId= only (no LS/JWT guess). */
export function isCustomerPublicMenuPath(pathname = typeof window !== "undefined" ? window.location.pathname : "") {
  if (!pathname) return false;
  if (
    pathname === "/menu" ||
    pathname === "/cart" ||
    pathname === "/takeaway-cart" ||
    pathname === "/order-summary" ||
    pathname === "/choose-mode"
  ) {
    return true;
  }
  if (pathname.startsWith("/order-status/")) return true;
  return false;
}

/**
 * Venue id for public menu flows: URL query only (privacy — never infer from LS/admin session).
 */
export function getCustomerVenueRestaurantId(search = typeof window !== "undefined" ? window.location.search : "") {
  const urlParams = new URLSearchParams(search);
  return (urlParams.get("restaurantId") || "").toUpperCase().trim();
}

/**
 * Tenant id for namespaced cache + product/banner fetches: on public menu paths, same as venue link;
 * elsewhere (admin, kitchen, …) URL then localStorage / session flows.
 */
export function getRestaurantIdForTenantData() {
  if (typeof window === "undefined") return "";
  if (isCustomerPublicMenuPath()) return getCustomerVenueRestaurantId();
  return getCurrentRestaurantId();
}

/**
 * Get current restaurantId from URL (priority) or localStorage.
 * No implicit default tenant — avoids loading the wrong venue on bare /menu.
 */
export function getCurrentRestaurantId() {
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const fromUrl = urlParams.get("restaurantId");
  const fromLs = typeof localStorage !== "undefined" ? localStorage.getItem("restaurantId") : null;
  return ((fromUrl || fromLs || "").toUpperCase().trim());
}

/**
 * Returns a namespaced localStorage key for a given base key + restaurantId.
 * e.g. tenantKey('products', 'RESTO001') → 'products_RESTO001'
 */
export function tenantKey(baseKey, rid) {
  if (!rid) return baseKey;
  return `${baseKey}_${rid.toUpperCase()}`;
}

/**
 * Helper: read a namespaced localStorage item (JSON-parsed).
 */
export function tenantGet(baseKey, rid) {
  try {
    const val = localStorage.getItem(tenantKey(baseKey, rid));
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Helper: write a namespaced localStorage item (serialised to JSON).
 */
export function tenantSet(baseKey, rid, value) {
  try {
    localStorage.setItem(tenantKey(baseKey, rid), JSON.stringify(value));
  } catch {}
}

/**
 * Helper: remove a namespaced localStorage item.
 */
export function tenantRemove(baseKey, rid) {
  localStorage.removeItem(tenantKey(baseKey, rid));
}

/**
 * Check if there is cached data for the given restaurant.
 * (Used by contexts to decide whether to show a loading spinner.)
 */
export function hasTenantCache(baseKey, rid) {
  if (!rid) return false;
  const val = localStorage.getItem(tenantKey(baseKey, rid));
  return val !== null;
}

/**
 * Persist the active restaurantId to localStorage (used by axios interceptor fallback).
 * Only updates — never clears other restaurants' caches.
 */
export function syncRestaurantCache(newId) {
  if (!newId) return;
  localStorage.setItem("restaurantId", newId);
}

/**
 * Ensures `restaurantId` is on the query string for customer routes (SPA navigations
 * often dropped it; APIs and tenant cache need it).
 * On public menu paths, only appends the id already present in the URL (never LS).
 * @param {string} pathWithOptionalQuery e.g. "/menu?table=3"
 */
export function appendRestaurantQuery(pathWithOptionalQuery) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const rid = isCustomerPublicMenuPath(pathname)
    ? getCustomerVenueRestaurantId()
    : getCurrentRestaurantId();
  if (!rid) return pathWithOptionalQuery;
  const qMark = pathWithOptionalQuery.indexOf("?");
  const path = qMark === -1 ? pathWithOptionalQuery : pathWithOptionalQuery.slice(0, qMark);
  const query = qMark === -1 ? "" : pathWithOptionalQuery.slice(qMark + 1);
  const sp = new URLSearchParams(query);
  if (!sp.get("restaurantId")) sp.set("restaurantId", rid);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * isCacheFresh — kept for backward compatibility on OrderContext/UIContext guards.
 * With namespaced keys every restaurant's cache is always "fresh" — returns true.
 */
export function isCacheFresh() {
  return true;
}

/**
 * Bootstrap: read restaurantId from URL and persist it to localStorage.
 * Called once at app startup BEFORE React renders.
 * Does not invent a tenant when the URL has no restaurantId (privacy).
 */
export function bootstrapTenantCache() {
  if (typeof window === "undefined") return;
  const urlParams = new URLSearchParams(window.location.search);
  const rid = urlParams.get("restaurantId");
  if (rid) {
    localStorage.setItem("restaurantId", rid.toUpperCase().trim());
  }
}
