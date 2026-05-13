import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import API from "../api/axios";
import { getCurrentRestaurantId, syncRestaurantCache } from "../utils/tenantCache";
import { isSuperAdminSession } from "../utils/sessionFlags";
import {
  DEFAULT_RECEIPT_HEADER,
  saveReceiptHeader,
} from "../admin/orderBill/receiptHeaderSettings";

const ThemeContext = createContext(null);

const DEFAULT_THEME = {
  primaryColor:   "#f72585",
  secondaryColor: "#0f172a",
  accentColor:    "#7209b7",
  sidebarBgColor: "#ffffff",
  sidebarTextColor: "#1e293b",
  theme:          "light",
  fontFamily:     "Inter",
  logo:           "",
  name:           "",
  features: {
    hr:           true,
    inventory:    false,
    reports:      true,
    qrMenu:       true,
    onlineOrders: false,
    kitchenPanel: true,
    waiterPanel:  true,
    waiterCall:   true,
    billRequest:  true,
    accounting:   true,
    hrStaff:      true,
    hrAttendance: true,
    hrLeaves:     true,
    reservations: true,
  },
};

/** Merged with `branding.features` so missing keys keep defaults and `false` still hides modules (e.g. Accounting). */
export const DEFAULT_FEATURES = { ...DEFAULT_THEME.features };

/**
 * API/cache payloads often send a partial `features` object. Shallow-spreading would replace
 * the whole features map and drop disabled flags / defaults — sidebar then shows wrong modules.
 */
function mergeBrandingPayload(data) {
  if (!data || typeof data !== "object") {
    return { ...DEFAULT_THEME };
  }
  const { features: incomingFeatures, ...rest } = data;
  return {
    ...DEFAULT_THEME,
    ...rest,
    features: {
      ...DEFAULT_THEME.features,
      ...(incomingFeatures && typeof incomingFeatures === "object" ? incomingFeatures : {}),
    },
  };
}

/**
 * Load branding from any persistent cache (localStorage then sessionStorage).
 * Returns merged branding or null if nothing is cached.
 */
function loadCachedBranding(restaurantId) {
  if (!restaurantId) return null;
  const rid = restaurantId.toUpperCase().trim();
  let raw = null;
  try {
    const ls = localStorage.getItem(`restaurantBranding_${rid}`);
    if (ls) raw = JSON.parse(ls);
  } catch (_) {}
  if (!raw) {
    try {
      const ss = sessionStorage.getItem(`restaurantBranding_${rid}`);
      if (ss) raw = JSON.parse(ss);
    } catch (_) {}
  }
  if (!raw) return null;
  return mergeBrandingPayload(raw);
}

function persistBranding(restaurantId, data) {
  if (!restaurantId) return;
  const rid = restaurantId.toUpperCase().trim();
  const serialised = JSON.stringify(data);
  try { localStorage.setItem(`restaurantBranding_${rid}`, serialised); } catch (_) {}
  try { sessionStorage.setItem(`restaurantBranding_${rid}`, serialised); } catch (_) {}
}

/** Merged feature flags from last persisted branding (instant sidebar; API still refreshes). */
function getInitialFeaturesFromStorage() {
  const rid = typeof localStorage !== "undefined" ? localStorage.getItem("restaurantId") : null;
  if (!rid) return DEFAULT_FEATURES;
  const cached = loadCachedBranding(rid);
  if (!cached?.features || typeof cached.features !== "object") return DEFAULT_FEATURES;
  return { ...DEFAULT_FEATURES, ...cached.features };
}

/** True when we have saved branding for this tenant — sidebar can trust cached feature flags. */
function hasCachedBrandingSnapshot() {
  const rid = typeof localStorage !== "undefined" ? localStorage.getItem("restaurantId") : null;
  if (!rid) return false;
  return loadCachedBranding(rid) != null;
}

/**
 * Apply branding object to CSS custom properties on :root.
 * This powers the entire white-label system.
 */
const applyThemeToDom = (branding) => {
  const root = document.documentElement;
  if (branding.primaryColor)   root.style.setProperty("--primary",   branding.primaryColor);
  if (branding.secondaryColor) root.style.setProperty("--secondary", branding.secondaryColor);
  if (branding.accentColor)    root.style.setProperty("--accent",    branding.accentColor);
  if (branding.sidebarBgColor)   root.style.setProperty("--sidebar-bg", branding.sidebarBgColor);
  if (branding.sidebarTextColor) root.style.setProperty("--sidebar-text", branding.sidebarTextColor);
  if (branding.fontFamily)     root.style.setProperty("--font",      branding.fontFamily);

  // Dark/Light body class
  document.body.classList.toggle("dark", branding.theme === "dark");

  // Apply font family
  if (branding.fontFamily) {
    document.body.style.fontFamily = `'${branding.fontFamily}', sans-serif`;
  }
};

export const ThemeProvider = ({ children }) => {
  const location = useLocation();

  // Visual branding (name, colours, logo) — restored from cache for instant first paint.
  const [branding, setBranding] = useState(() => {
    const rid = localStorage.getItem("restaurantId");
    const cached = rid ? loadCachedBranding(rid) : null;
    if (cached) {
      applyThemeToDom(cached);
      // Strip cached features so stale flags never reach the sidebar.
      // Features are always set from the fresh API call below.
      return { ...cached, features: { ...DEFAULT_THEME.features } };
    }
    return DEFAULT_THEME;
  });

  /**
   * Feature flags: hydrate from persisted branding so the admin sidebar matches the last known
   * server state on first paint (no 2–3s “missing links”). loadBranding() always refreshes from API.
   */
  const [features, setFeatures] = useState(getInitialFeaturesFromStorage);
  /**
   * True if we have a cached branding snapshot OR the first loadBranding() has finished.
   * When false and there is no cache, AdminLayout shows gated modules until the fetch completes.
   */
  const [featuresReady, setFeaturesReady] = useState(hasCachedBrandingSnapshot);
  const [loading, setLoading] = useState(false);

  /** Concurrent loadBranding(restaurantId) calls (login + ThemeProvider mount, tab focus overlap) share one HTTP request. */
  const loadBrandingInflightRef = useRef(null);

  /** Clears Super Admin preview / stale tenant colours before loading a new restaurant theme */
  const resetBrandingToDefault = useCallback(() => {
    setBranding(DEFAULT_THEME);
    setFeatures(DEFAULT_FEATURES);
    setFeaturesReady(false);
    applyThemeToDom(DEFAULT_THEME);
    try { sessionStorage.removeItem("restaurantBranding"); } catch (_) {}
  }, []);

  const loadBranding = useCallback(async (restaurantId) => {
    if (!restaurantId) return;
    const dedupeKey = String(restaurantId).toUpperCase().trim();
    const inflight = loadBrandingInflightRef.current;
    if (inflight?.key === dedupeKey && inflight.promise) return inflight.promise;

    const run = async () => {
      setLoading(true);
      // Apply cached VISUAL branding instantly (name/colours) — prevents first-paint flash.
      const immediate = loadCachedBranding(restaurantId);
      if (immediate) {
        setBranding({ ...immediate, features: { ...DEFAULT_THEME.features } });
        setFeatures({ ...DEFAULT_FEATURES, ...immediate.features });
        setFeaturesReady(true);
        applyThemeToDom(immediate);
      }
      try {
        // Single call — branding endpoint returns all 13 feature flags when the
        // request carries a valid auth token (admin/kitchen/waiter panels).
        // Customer requests get only public flags (qrMenu, onlineOrders).
        const { data } = await API.get(`/restaurants/${restaurantId}/branding`);
        const merged = mergeBrandingPayload(data);

        setBranding(merged);
        applyThemeToDom(merged);
        persistBranding(restaurantId, merged);

        if (merged.receiptHeader && typeof merged.receiptHeader === "object") {
          saveReceiptHeader(restaurantId, {
            ...DEFAULT_RECEIPT_HEADER,
            ...merged.receiptHeader,
          });
        }

        // features state is always set from the fresh API response — never from cache.
        setFeatures({ ...DEFAULT_FEATURES, ...merged.features });
      } catch (err) {
        console.warn("[ThemeContext] Could not load branding:", err.message);
      } finally {
        setLoading(false);
        setFeaturesReady(true);
      }
    };

    const promise = run().finally(() => {
      const cur = loadBrandingInflightRef.current;
      if (cur?.promise === promise) loadBrandingInflightRef.current = null;
    });

    loadBrandingInflightRef.current = { key: dedupeKey, promise };
    return promise;
  }, []);

  /** Live preview: apply visual overrides without saving. Used in the Super Admin panel. */
  const previewBranding = useCallback((overrides) => {
    const merged = mergeBrandingPayload({ ...branding, ...overrides });
    setBranding(merged);
    applyThemeToDom(merged);
  }, [branding]);

  /** Cancel live preview — restore whatever is stored. */
  const resetPreview = useCallback(() => {
    applyThemeToDom(branding);
  }, [branding]);

  useEffect(() => {
    if (isSuperAdminSession()) return;
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get("restaurantId");
    if (fromUrl) syncRestaurantCache(fromUrl);
    const restaurantId = getCurrentRestaurantId();
    if (restaurantId) loadBranding(restaurantId);
  }, [location.pathname, location.search, loadBranding]);

  /** Re-fetch when the tab regains focus so feature changes by Super Admin are picked up. */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (isSuperAdminSession()) return;
      const rid = localStorage.getItem("restaurantId");
      if (rid) loadBranding(rid);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadBranding]);

  return (
    <ThemeContext.Provider
      value={{
        branding,
        features,
        featuresReady,
        loading,
        loadBranding,
        resetBrandingToDefault,
        previewBranding,
        resetPreview,
        applyThemeToDom,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
