import { Navigate, Outlet } from "react-router-dom";

/**
 * Guards /superadmin/* routes.
 * Checks localStorage synchronously so there is never a one-frame flash of
 * the dark super-admin sidebar for non-super-admin users.
 */
export default function ProtectedSuperAdminRoute() {
  const token = localStorage.getItem("token");
  let isSuperAdmin = false;
  try {
    const stored = localStorage.getItem("userInfo");
    if (stored) {
      const parsed = JSON.parse(stored);
      isSuperAdmin = parsed?.role === "superadmin";
    }
  } catch (_) {}

  if (!token || !isSuperAdmin) {
    return <Navigate to="/superadmin/login" replace />;
  }

  return <Outlet />;
}
