import { Routes, Route, Navigate } from "react-router-dom";

/* Layouts */
import WaiterLayout from "../waiter/WaiterLayout";

/* Auth helpers */
import ProtectedWaiterRoute from "./ProtectedWaiterRoute";

/* Waiter Pages */
import WaiterDashboard from "../waiter/WaiterDashboard";
import OrderBill from "../admin/OrderBill";
import Tables from "../admin/Tables";
import WaiterOrders from "../waiter/WaiterOrders";

const ProtectedWaiterLogin = ({ children }) => {
  const isLoggedIn = localStorage.getItem("isWaiterLoggedIn") === "true";
  if (isLoggedIn) {
    return <Navigate to="/waiter/dashboard" replace />;
  }
  // if not logged in, redirect to general login page
  return <Navigate to="/login" replace />;
};

export default function WaiterRoutes() {
  return (
    <Routes>
      <Route path="" element={<Navigate to="login" replace />} />
      <Route path="login" element={<ProtectedWaiterLogin />} />

      <Route element={<ProtectedWaiterRoute />}>        <Route path="" element={<WaiterLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<WaiterDashboard />} />
          <Route path="tables" element={<Tables />} />
          <Route path="orders" element={<WaiterOrders />} />
          <Route path="bill" element={<OrderBill />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}
