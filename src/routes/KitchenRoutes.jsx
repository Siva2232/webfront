import { Routes, Route, Navigate } from "react-router-dom";

/* Layouts */
import KitchenLayout from "../admin/KitchenLayout";

/* Auth */
import ProtectedKitchenRoute from "./ProtectedKitchenRoute";

/* Kitchen Pages */
import KitchenDashboard from "../admin/KitchenDashboard";
import Orders from "../admin/Orders";
import OrderBill from "../admin/OrderBill";


export default function KitchenRoutes() {
  return (
    <Routes>
      {/* redirect base /kitchen to login page (centralized) */}
      <Route path="" element={<Navigate to="/login" replace />} />
      <Route path="login" element={<Navigate to="/login" replace />} />

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
