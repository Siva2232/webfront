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
import ManualOrder from "../admin/ManualOrder";
import AddStaff from "../admin/AddStaff";
import ExpenseTracker from "../admin/ExpenseTracker"; // temporary redirect component (can be removed later)
import PurchaseExpense from "../admin/expenses/PurchaseExpense";
import UtilityExpense from "../admin/expenses/UtilityExpense";
import DirectExpense from "../admin/expenses/DirectExpense";
import IndirectExpense from "../admin/expenses/IndirectExpense";
import KitchenRoutes from "./KitchenRoutes";
import WaiterRoutes from "./WaiterRoutes"; // added for waiter panel

/* Customer Pages */
import Menu from "../customer/Menu";
import Cart from "../customer/Cart";
import OrderStatus from "../customer/OrderStatus";
import OrderSummary from "../customer/OrderSummary";
import ChooseMode from "../customer/ChooseMode";
import TakeawayCart from "../customer/TakeawayCart";

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
        <Route path="/takeaway-cart" element={<TakeawayCart />} />
        <Route path="/order-status/:orderId" element={<OrderStatus />} />
        <Route path="/order-summary" element={<OrderSummary />} />
        <Route path="/choose-mode" element={<ChooseMode />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Route>

      {/* Kitchen-specific Routes */}
      <Route path="/kitchen/*" element={<KitchenRoutes />} />
      {/* New waiter panel routes */}
      <Route path="/waiter/*" element={<WaiterRoutes />} />

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
          <Route path="manual-order" element={<ManualOrder />} />
          <Route path="tables" element={<Tables />} />
          <Route path="offers" element={<OfferPanel />} />
          <Route path="banner" element={<BannerPanel />} />
          <Route path="staff" element={<AddStaff />} />
          {/* legacy single tracker route redirects to purchase for compatibility */}
          <Route path="expense" element={<Navigate to="expense/purchase" replace />} />
          <Route path="expense/purchase" element={<PurchaseExpense />} />
          <Route path="expense/utility" element={<UtilityExpense />} />
          <Route path="expense/direct" element={<DirectExpense />} />
          <Route path="expense/indirect" element={<IndirectExpense />} />
          <Route path="reports" element={<Analytics />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/menu" replace />} />
    </Routes>
  );
}
