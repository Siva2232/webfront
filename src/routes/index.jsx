import { Routes, Route, Navigate } from "react-router-dom";

/* Layouts */
import AdminLayout from "../admin/AdminLayout";
import CustomerLayout from "../customer/CustomerLayout";

/* Auth */
import Login from "../admin/Login";
import ProtectedRoute from "./ProtectedRoute";

/* Admin Pages */
import Dashboard from "../admin/Dashboard";
import Products from "../admin/Products";
import Orders from "../admin/Orders";
import Tables from "../admin/Tables";
import AddProduct from "../admin/AddProduct";
import EditForm from "../admin/EditForm";
import OfferPanel from "../admin/OfferPanel";
import BannerPanel from "../admin/BannerPanel";
import CustomerSupport from "../admin/CustomerSupport";
import Analytics from "../admin/Analytics";
import OrderBill from "../admin/OrderBill";

/* Customer Pages */
import Menu from "../customer/Menu";
import Cart from "../customer/Cart";
import OrderStatus from "../customer/OrderStatus";
import OrderSummary from "../customer/OrderSummary";

/* Optional: Prevent logged-in users from seeing login */
const ProtectedLogin = ({ children }) => {
  const isLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
  if (isLoggedIn) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/menu" replace />} />

      {/* Login */}
      <Route
        path="/login"
        element={
          <ProtectedLogin>
            <Login />
          </ProtectedLogin>
        }
      />

      {/* Customer Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/order-status/:orderId" element={<OrderStatus />} />
        <Route path="/order-summary" element={<OrderSummary />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="customer" element={<CustomerSupport />} />
          <Route path="bill" element={<OrderBill />} />
          <Route path="products" element={<Products />} />
          <Route path="products/add" element={<AddProduct />} />
          <Route path="products/edit/:id" element={<EditForm />} />
          <Route path="orders" element={<Orders />} />
          <Route path="tables" element={<Tables />} />
          <Route path="offers" element={<OfferPanel />} />
          <Route path="banner" element={<BannerPanel />} />
          <Route path="reports" element={<Analytics />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/menu" replace />} />
    </Routes>
  );
}
