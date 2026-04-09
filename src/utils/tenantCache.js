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
];

/**
 * Get current restaurantId from URL (priority) or localStorage.
 */
export function getCurrentRestaurantId() {
  const urlParams = new URLSearchParams(window.location.search);
  return (urlParams.get('restaurantId') || localStorage.getItem('restaurantId') || '').toUpperCase().trim();
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
