import { Navigate, Outlet } from "react-router-dom";

const ProtectedSupportRoute = () => {
  const isSupportLoggedIn = localStorage.getItem("isSupportLoggedIn") === "true";
  const token = localStorage.getItem("token");

  if (!token || !isSupportLoggedIn) {
    return <Navigate to="/support-team/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedSupportRoute;
