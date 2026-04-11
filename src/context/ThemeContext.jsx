import { createContext, useContext, useEffect, useState, useCallback } from "react";
import API from "../api/axios";

const ThemeContext = createContext(null);

const DEFAULT_THEME = {
  primaryColor:   "#f72585",
  secondaryColor: "#0f172a",
  accentColor:    "#7209b7",
  theme:          "light",
  fontFamily:     "Inter",
  logo:           "",
  name:           "",
  features: {
    hr:           true,
    accounting:   true,
    inventory:    false,
    reports:      true,
    qrMenu:       true,
    onlineOrders: false,
    kitchenPanel: true,
    waiterPanel:  true,
  },
};

/**
 * Apply branding object to CSS custom properties on :root.
 * This powers the entire white-label system.
 */
const applyThemeToDom = (branding) => {
  const root = document.documentElement;
  if (branding.primaryColor)   root.style.setProperty("--primary",   branding.primaryColor);
  if (branding.secondaryColor) root.style.setProperty("--secondary", branding.secondaryColor);
  if (branding.accentColor)    root.style.setProperty("--accent",    branding.accentColor);
  if (branding.fontFamily)     root.style.setProperty("--font",      branding.fontFamily);

  // Dark/Light body class
  document.body.classList.toggle("dark", branding.theme === "dark");

  // Apply font family
  if (branding.fontFamily) {
    document.body.style.fontFamily = `'${branding.fontFamily}', sans-serif`;
  }
};

export const ThemeProvider = ({ children }) => {
  const [branding, setBranding] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(false);

  /**
   * Fetches branding from backend and applies it.
   * Called on login or page refresh when restaurantId is in localStorage.
   */
  const loadBranding = useCallback(async (restaurantId) => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const { data } = await API.get(`/restaurants/${restaurantId}/branding`);
      const merged = { ...DEFAULT_THEME, ...data };
      setBranding(merged);
      applyThemeToDom(merged);
      // Persist to session storage so reloads are instant (namespaced by restaurant)
      sessionStorage.setItem(`restaurantBranding_${restaurantId}`, JSON.stringify(merged));
    } catch (err) {
      console.warn("[ThemeContext] Could not load branding:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Live preview: Apply branding without saving to backend.
   * Used in the Super Admin customization panel.
   */
  const previewBranding = useCallback((overrides) => {
    const merged = { ...branding, ...overrides };
    setBranding(merged);
    applyThemeToDom(merged);
  }, [branding]);

  /**
   * Reset branding to whatever is stored (cancel live preview).
   */
  const resetPreview = useCallback(() => {
    applyThemeToDom(branding);
  }, [branding]);

  // On mount: restore from sessionStorage for instant paint
  useEffect(() => {
    const restaurantId = localStorage.getItem("restaurantId");
    const cacheKey = restaurantId ? `restaurantBranding_${restaurantId}` : "restaurantBranding";
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setBranding(parsed);
        applyThemeToDom(parsed);
      } catch (_) {}
    } else {
      // Apply defaults
      applyThemeToDom(DEFAULT_THEME);
    }

    // Also load fresh from backend if restaurantId is known
    if (restaurantId) loadBranding(restaurantId);
  }, [loadBranding]);

  return (
    <ThemeContext.Provider value={{ branding, loading, loadBranding, previewBranding, resetPreview, applyThemeToDom }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
