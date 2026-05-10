import { createContext, useContext, useState, useCallback } from "react";
import API from "../api/axios";
import { syncRestaurantCache, getCurrentRestaurantId, tenantRemove } from "../utils/tenantCache";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("userInfo");
      return stored ? JSON.parse(stored) : null;
    } catch (_) { return null; }
  });

  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem("userInfo", JSON.stringify(userData));
    if (userData.token) localStorage.setItem("token", userData.token);

    if (userData.role === "superadmin") {
      localStorage.setItem("isSuperAdmin", "true");
      // Super-admin JWT is not scoped to a tenant — drop stale restaurant id so axios does not call admin POS APIs.
      localStorage.removeItem("restaurantId");
      localStorage.removeItem("_cachedRestaurantId");
    } else {
      localStorage.removeItem("isSuperAdmin");
      if (userData.restaurantId) {
        syncRestaurantCache(userData.restaurantId);
        localStorage.setItem("restaurantId", userData.restaurantId);
      }
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem("userInfo", JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    const rid = getCurrentRestaurantId();
    setUser(null);
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
    localStorage.removeItem("restaurantId");
    localStorage.removeItem("_cachedRestaurantId");
    localStorage.removeItem("isSuperAdmin");
    localStorage.removeItem("isAdminLoggedIn");
    // Clear tenant-namespaced caches for the current restaurant
    tenantRemove("products", rid);
    tenantRemove("categories", rid);
    tenantRemove("cachedOrders", rid);
    tenantRemove("cachedBills", rid);
    tenantRemove("cachedKitchenBills", rid);
    tenantRemove("cachedTokens", rid);
    sessionStorage.removeItem("restaurantBranding");
    if (rid) sessionStorage.removeItem(`restaurantBranding_${rid}`);
  }, []);

  const isSuperAdmin = user?.role === "superadmin";
  const isAdmin      = user?.isAdmin || user?.role === "admin";
  const isKitchen    = user?.isKitchen || user?.role === "kitchen";
  const isWaiter     = user?.isWaiter || user?.role === "waiter";

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isSuperAdmin, isAdmin, isKitchen, isWaiter }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
