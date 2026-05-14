import axios from "axios";
import { getCurrentRestaurantId } from "../utils/tenantCache";

// dynamic baseURL: choose between development/local and production endpoints
// Production builds should set VITE_API_BASE_URL to the full API URL (e.g. https://myapp.com/api).
// During local development we prefer to hit the backend running on localhost:5000 via Vite proxy,
// but you can override it with VITE_API_BASE_URL_DEV if needed.
//
// Usage examples:
//   # dev (default)
//   npm run dev
//   # force a custom URL for the dev server
//   VITE_API_BASE_URL_DEV=http://localhost:5000/api npm run dev
//   # production build
//   VITE_API_BASE_URL=https://backend.example.com/api npm run build

const isProd = import.meta.env.PROD;
const baseURL = isProd
  ? import.meta.env.VITE_API_BASE_URL || "https://backend-res-ikeb.onrender.com/api"
  : import.meta.env.VITE_API_BASE_URL_DEV || "/api";

const API = axios.create({
  baseURL,
});

// Add a request interceptor to include the auth token.
// For HR routes: prefer hrToken (HR staff JWT); if not present, fall back to
// admin token so POS admins can access HR endpoints directly without a separate login.
// Also appends restaurantId query param for all requests (used by tenantMiddleware
// on public routes; ignored for authenticated routes where JWT carries the tenant).
API.interceptors.request.use((req) => {
  const isHRRoute = req.url && req.url.startsWith('/hr/');
  let token;
  if (isHRRoute) {
    token = localStorage.getItem("hrToken") || localStorage.getItem("token");
  } else {
    token = localStorage.getItem("token");
  }
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  // Append restaurantId to every request (URL → LS → VITE_DEFAULT / dev default; see tenantCache).
  let restaurantId = getCurrentRestaurantId();

  if (!restaurantId && localStorage.getItem('isSuperAdmin') !== 'true') {
    // Last resort: decode the JWT payload to extract restaurantId (not for platform super-admin tokens).
    try {
      const tok = localStorage.getItem('token') || localStorage.getItem('hrToken');
      if (tok) {
        const payload = JSON.parse(atob(tok.split('.')[1]));
        if (payload.restaurantId) {
          restaurantId = String(payload.restaurantId).toUpperCase().trim();
          localStorage.setItem('restaurantId', restaurantId);
        }
      }
    } catch (_) { /* malformed token — ignore */ }
  }

  if (restaurantId) {
    // Check if restaurantId is already in query params to avoid duplication
    const url = new URL(req.url, window.location.origin);
    if (!url.searchParams.has('restaurantId')) {
      req.params = { ...req.params, restaurantId };
    }
    req.headers['X-Restaurant-Id'] = restaurantId;
  }

  return req;
}, (error) => {
  return Promise.reject(error);
});

// Add a response interceptor to handle 401 errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isHRRoute = error.config?.url?.startsWith('/hr/');
      if (isHRRoute) {
        // Don't redirect to HR login if the user is in an admin, waiter, or kitchen panel
        // — they use their own POS token which is still valid.
        const path = window.location.pathname;
        const skipRedirect =
          path.startsWith('/admin/hr') ||
          path.startsWith('/waiter/') ||
          path.startsWith('/kitchen/');
        if (!skipRedirect) {
          localStorage.removeItem("hrToken");
          if (!path.includes("/hr/login")) {
            window.location.href = "/hr/login";
          }
        }
      } else {
        // Regular admin/POS session expired
        localStorage.removeItem("token");
        localStorage.removeItem("userInfo");
        localStorage.removeItem("isAdminLoggedIn");
        localStorage.removeItem("isKitchenLoggedIn");
        if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/menu") && !window.location.pathname.includes("/order-status") && !window.location.pathname.includes("/order-summary") && !window.location.pathname.includes("/cart") && !window.location.pathname.includes("/takeaway-cart") && !window.location.pathname.includes("/choose-mode")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Coalesce concurrent identical GETs (same URL + params + tenant) so Strict Mode,
 * multiple layouts, and overlapping effects share one HTTP round-trip.
 * Pass `{ skipCoalesce: true }` to force a fresh request (e.g. after realtime refresh).
 */
const rawGet = API.get.bind(API);
const inflightGets = new Map();

function stableParamsKey(params) {
  if (!params || typeof params !== "object") return "";
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

API.get = function coalescedGet(url, config) {
  const cfg =
    config && typeof config === "object" && !Array.isArray(config) ? { ...config } : {};
  if (cfg.skipCoalesce) {
    delete cfg.skipCoalesce;
    return rawGet(url, cfg);
  }

  let rid = "";
  try {
    rid = String(localStorage.getItem("restaurantId") || "")
      .toUpperCase()
      .trim();
  } catch (_) {}

  const key = `${rid}::${url}::${stableParamsKey(cfg.params)}`;
  const existing = inflightGets.get(key);
  if (existing) return existing;

  const p = rawGet(url, cfg).finally(() => {
    inflightGets.delete(key);
  });
  inflightGets.set(key, p);
  return p;
};

export default API;
