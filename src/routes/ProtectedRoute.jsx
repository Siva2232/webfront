import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const isLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
  const token = localStorage.getItem("token");

  // Extra guard: if the stored user is a super-admin, they should not pass
  // through the restaurant admin ProtectedRoute even if isAdminLoggedIn was
  // left over from a previous session.
  let isSuperAdmin = false;
  try {
    const stored = localStorage.getItem("userInfo");
    if (stored) {
      const parsed = JSON.parse(stored);
      isSuperAdmin = parsed?.role === "superadmin";
    }
  } catch (_) {}

  if (!isLoggedIn || !token || isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
