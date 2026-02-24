import { Routes, Route, Navigate } from "react-router-dom";

/* Layouts */
import KitchenLayout from "../admin/KitchenLayout";

/* Auth */
// login is handled by the shared system login component
import ProtectedKitchenRoute from "./ProtectedKitchenRoute";

/* Kitchen Pages */
import KitchenDashboard from "../admin/KitchenDashboard";
import Orders from "../admin/Orders";
import OrderBill from "../admin/OrderBill";

// we no longer have a separate kitchen login page; forward to the shared system login
const ProtectedKitchenLogin = ({ children }) => {
  const isLoggedIn = localStorage.getItem("isKitchenLoggedIn") === "true";
  if (isLoggedIn) {
    return <Navigate to="/kitchen/dashboard" replace />;
  }
  // if not logged in, send user to the common login component
  return <Navigate to="/login" replace />;
};

export default function KitchenRoutes() {
  return (
    <Routes>
      {/* redirect base /kitchen to login */}
      <Route path="" element={<Navigate to="login" replace />} />
      <Route path="login" element={<ProtectedKitchenLogin />} />

      <Route element={<ProtectedKitchenRoute />}>
        <Route path="" element={<KitchenLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<KitchenDashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="bill" element={<OrderBill />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

      {/* catch-all within kitchen */}
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}
