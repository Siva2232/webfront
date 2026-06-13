import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, logout } = useAuth();
  const isLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
  const token = localStorage.getItem("token");
  const isSuperAdmin = user?.role === "superadmin";
  const allowed = isLoggedIn && token && user && !isSuperAdmin;

  useEffect(() => {
    if (!allowed && (token || isLoggedIn)) {
      logout();
    }
  }, [allowed, token, isLoggedIn, logout]);

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
