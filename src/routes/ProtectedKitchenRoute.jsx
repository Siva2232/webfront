import { Navigate, Outlet } from "react-router-dom";
import toast from "react-hot-toast";

export default function ProtectedKitchenRoute() {
  const isLoggedIn = localStorage.getItem("isKitchenLoggedIn") === "true";
  const token = localStorage.getItem("token");

  if (!isLoggedIn || !token) {
    toast.error("Please log in to access kitchen features");
    return <Navigate to="/kitchen/login" replace />;
  }

  return <Outlet />;
}
