import { Navigate, Outlet } from "react-router-dom";
import toast from "react-hot-toast";

export default function ProtectedKitchenRoute() {
  const isLoggedIn = localStorage.getItem("isKitchenLoggedIn") === "true";
  const token = localStorage.getItem("token");

  if (!isLoggedIn || !token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
