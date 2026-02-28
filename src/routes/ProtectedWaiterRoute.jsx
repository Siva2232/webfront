import { Navigate, Outlet } from "react-router-dom";
import toast from "react-hot-toast";

export default function ProtectedWaiterRoute() {
  const isLoggedIn = localStorage.getItem("isWaiterLoggedIn") === "true";
  const token = localStorage.getItem("token");

  if (!isLoggedIn || !token) {
    toast.error("Please log in to access waiter panel");
    return <Navigate to="/waiter/login" replace />;
  }

  return <Outlet />;
}
