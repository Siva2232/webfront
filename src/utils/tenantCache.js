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
  'products',
  'categories',
  'cachedOrders',
  'cachedBills',
  'cachedKitchenBills',
  'cachedTokens',
  'lastTokenFetch',
  'lastBillFetch',
  'optimisticOrderPatch',
  'ui_banners',
  'ui_offers',
  'lastUsedTable',
  'restaurantBranding',
  'receiptHeaderSettings',
];

/**
 * Get current restaurantId from URL (priority) or localStorage.
 */
export function getCurrentRestaurantId() {
  const urlParams = new URLSearchParams(window.location.search);
  return (urlParams.get('restaurantId') || localStorage.getItem('restaurantId') || '').toUpperCase().trim();
}

/** Customer SPA paths where tenant data must not rely on stale localStorage without a venue in the URL. */
const CUSTOMER_PUBLIC_PATH_PREFIXES = [
  '/menu',
  '/cart',
  '/takeaway-cart',
  '/order-status',
  '/order-summary',
  '/choose-mode',
];

/**
 * True when the current route is the unauthenticated customer flow (see routes under CustomerLayout).
 */
export function isCustomerPublicMenuPath() {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return CUSTOMER_PUBLIC_PATH_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}

/**
 * Venue id from the link only (?restaurantId=), not from localStorage — avoids wrong-tenant cache/API
 * on /menu before the customer scans a QR.
 */
export function getCustomerVenueRestaurantId() {
  if (typeof window === 'undefined') return '';
  const urlParams = new URLSearchParams(window.location.search);
  return (urlParams.get('restaurantId') || '').toUpperCase().trim();
}

/**
 * Restaurant id for namespaced caches and contexts (URL wins, then localStorage).
 * Same resolution as {@link getCurrentRestaurantId}; separate name matches context imports.
 */
export function getRestaurantIdForTenantData() {
  return getCurrentRestaurantId();
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
  localStorage.setItem('restaurantId', newId);
}

/**
 * Ensures `restaurantId` is on the query string for customer routes (SPA navigations
 * often dropped it; APIs and tenant cache need it).
 * @param {string} pathWithOptionalQuery e.g. "/menu?table=3"
 */
export function appendRestaurantQuery(pathWithOptionalQuery) {
  const rid = getCurrentRestaurantId();
  if (!rid) return pathWithOptionalQuery;
  const qMark = pathWithOptionalQuery.indexOf('?');
  const path = qMark === -1 ? pathWithOptionalQuery : pathWithOptionalQuery.slice(0, qMark);
  const query = qMark === -1 ? '' : pathWithOptionalQuery.slice(qMark + 1);
  const sp = new URLSearchParams(query);
  if (!sp.get('restaurantId')) sp.set('restaurantId', rid);
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
 * No longer clears any cache — each restaurant keeps its own namespace.
 */
export function bootstrapTenantCache() {
  const urlParams = new URLSearchParams(window.location.search);
  const rid = urlParams.get('restaurantId');
  if (rid) {
    localStorage.setItem('restaurantId', rid.toUpperCase().trim());
  }
}
