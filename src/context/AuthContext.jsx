import { createContext, useContext, useState, useCallback } from "react";
import API from "../api/axios";
import { syncRestaurantCache } from "../utils/tenantCache";

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
    if (userData.token)        localStorage.setItem("token", userData.token);
    if (userData.restaurantId) {
      syncRestaurantCache(userData.restaurantId); // wipe stale cache from previous restaurant
      localStorage.setItem("restaurantId", userData.restaurantId);
    }
    if (userData.role === "superadmin") localStorage.setItem("isSuperAdmin", "true");
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
    localStorage.removeItem("restaurantId");
    localStorage.removeItem("_cachedRestaurantId");
    localStorage.removeItem("isSuperAdmin");
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("products");
    localStorage.removeItem("categories");
    localStorage.removeItem("cachedOrders");
    localStorage.removeItem("cachedBills");
    localStorage.removeItem("cachedKitchenBills");
    localStorage.removeItem("cachedTokens");
    sessionStorage.removeItem("restaurantBranding");
  }, []);

  const isSuperAdmin = user?.role === "superadmin";
  const isAdmin      = user?.isAdmin || user?.role === "admin";
  const isKitchen    = user?.isKitchen || user?.role === "kitchen";
  const isWaiter     = user?.isWaiter || user?.role === "waiter";

  return (
    <AuthContext.Provider value={{ user, login, logout, isSuperAdmin, isAdmin, isKitchen, isWaiter }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
