import { Navigate, Outlet } from "react-router-dom";
import toast from "react-hot-toast";

export default function ProtectedRoute() {
  const isLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
  const token = localStorage.getItem("token");

  if (!isLoggedIn || !token) {
    toast.error("Please log in to continue");
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
