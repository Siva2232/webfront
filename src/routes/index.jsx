import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

/* Feature Guard — blocks direct URL access to disabled features */
const FeatureGuard = ({ feature, children }) => {
  const { branding } = useTheme();
  const features = branding?.features || {};
  if (features[feature] === false) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};

/* Layouts */
import AdminLayout from "../admin/AdminLayout";
import CustomerLayout from "../customer/CustomerLayout";

/* Auth */
import Login from "../admin/Login";
import ProtectedRoute from "./ProtectedRoute";

/* Super Admin */
import SuperAdminLogin from "../superadmin/SuperAdminLogin";
import SuperAdminLayout from "../superadmin/SuperAdminLayout";
import SuperAdminDashboard from "../superadmin/SuperAdminDashboard";
import RestaurantList from "../superadmin/RestaurantList";
import PlanManager from "../superadmin/PlanManager";
import SuperAdminAnalytics from "../superadmin/SuperAdminAnalytics";
import SuperAdminNotifications from "../superadmin/SuperAdminNotifications";
import SupportTicketManager from "../superadmin/SupportTicketManager";
import SupportTeamManager from "../superadmin/SupportTeamManager";

/* Dedicated Support Team Panel */
import SupportLogin from "../support-team/SupportLogin";
import SupportLayout from "../support-team/SupportLayout";
import SupportDashboard from "../support-team/SupportDashboard";
import SupportProfile from "../support-team/SupportProfile";
import SupportTicketList from "../support-team/SupportTicketManager"; // reusing the manager
import ProtectedSupportRoute from "./ProtectedSupportRoute";

/* Admin Subscription Page */
import SubscriptionPage from "../admin/SubscriptionPage";

/* Admin Pages */
import Dashboard from "../admin/Dashboard";
import Products from "../admin/Products";
import Orders from "../admin/Orders";
import Tables from "../admin/Tables";
import QrGenerator from "../admin/QrGenerator";
import AddProduct from "../admin/AddProduct";
import EditForm from "../admin/EditForm";
import SubItemLibrary from "../admin/Subitem";
import OfferPanel from "../admin/OfferPanel";
import AdminProfile from "../admin/AdminProfile";
import BannerPanel from "../admin/BannerPanel";
import CustomerSupport from "../admin/CustomerSupport";
import Analytics from "../admin/Analytics";
import OrderBill from "../admin/OrderBill";
import KitchenBill from "../admin/KitchenBill";
import Reservations from "../admin/Reservations";
import ManualOrder from "../admin/ManualOrder";
import ManualBill from "../admin/ManualBill";
import Token from "../admin/Token";
import AdminProductsOrdering from "../admin/AdminProducts";
import AdminCart from "../admin/AdminCart";
import AdminOrderSummary from "../admin/AdminOrderSummary";
import KitchenRoutes from "./KitchenRoutes";
import WaiterRoutes from "./WaiterRoutes"; // added for waiter panel

/* HR Module — standalone portal (staff login, self-service) */
import HRLogin from "../hr/HRLogin";
import HRLayout from "../hr/HRLayout";
import HRDashboard from "../hr/HRDashboard";
import StaffList from "../hr/staff/StaffList";
import StaffProfile from "../hr/staff/StaffProfile";
import AttendanceManager from "../hr/attendance/AttendanceManager";
import LeaveManager from "../hr/leaves/LeaveManager";
import ShiftManager from "../hr/shifts/ShiftManager";
import PayrollManager from "../hr/payroll/PayrollManager";
import StaffPortal from "../hr/portal/StaffPortal";

/* HR Module — dedicated admin pages (inside AdminLayout) */
import AdminHRDashboard from "../admin/hr/AdminHRDashboard";
import AdminStaff from "../admin/hr/AdminStaff";
import AdminAttendance from "../admin/hr/AdminAttendance";
import AdminLeaves from "../admin/hr/AdminLeaves";
import AdminShifts from "../admin/hr/AdminShifts";
import AdminPayroll from "../admin/hr/AdminPayroll";

/* Accounting Module */
import AccDashboard from "../admin/accounting/AccDashboard";
import AccLedgers from "../admin/accounting/AccLedgers";
import AccLedgerDetail from "../admin/accounting/AccLedgerDetail";
import AccTransactions from "../admin/accounting/AccTransactions";
import AccReports from "../admin/accounting/AccReports";

/* Customer Pages */
import Menu from "../customer/Menu";
import Cart from "../customer/Cart";
import OrderStatus from "../customer/OrderStatus";
import OrderSummary from "../customer/OrderSummary";
import ChooseMode from "../customer/ChooseMode";
import TakeawayCart from "../customer/TakeawayCart";

/* Optional: Prevent logged-in users from seeing login */
const ProtectedLogin = ({ children }) => {
  const isAdminLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
  const isKitchenLoggedIn =
    localStorage.getItem("isKitchenLoggedIn") === "true";
  const isWaiterLoggedIn = localStorage.getItem("isWaiterLoggedIn") === "true";

  if (isAdminLoggedIn) return <Navigate to="/admin/dashboard" replace />;
  if (isKitchenLoggedIn) return <Navigate to="/kitchen/dashboard" replace />;
  if (isWaiterLoggedIn) return <Navigate to="/waiter/dashboard" replace />;

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
          <Route path="kitchen-bill" element={<KitchenBill />} />
          <Route path="customer" element={<CustomerSupport />} />
          <Route path="bill" element={<OrderBill />} />
          <Route path="accounting">
            <Route index element={<AccDashboard />} />
            <Route path="ledgers" element={<AccLedgers />} />
            <Route path="ledgers/:ledgerId" element={<AccLedgerDetail />} />
            <Route path="transactions" element={<AccTransactions />} />
            <Route path="reports" element={<AccReports />} />
          </Route>
          <Route path="manual-bill" element={<ManualBill />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="products" element={<Products />} />
          <Route path="products/add" element={<AddProduct />} />
          <Route path="products/edit/:id" element={<EditForm />} />
          <Route path="sub-items" element={<SubItemLibrary />} />
          <Route path="orders" element={<Orders />} />
          <Route path="manual-order" element={<ManualOrder />} />
          <Route path="tokens" element={<Token />} />
          <Route path="products-ordering" element={<AdminProductsOrdering />} />
          <Route path="cart" element={<AdminCart />} />
          <Route path="order-summary" element={<AdminOrderSummary />} />
          <Route path="tables" element={<Tables />} />
          <Route path="qr-generator" element={<QrGenerator />} />
          <Route path="offers" element={<OfferPanel />} />
          <Route path="banner" element={<BannerPanel />} />
          <Route path="reports" element={<Analytics />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="profile" element={<AdminProfile />} />

          {/* HR Management — guarded by hr feature flag */}
          <Route
            path="hr"
            element={
              <FeatureGuard feature="hr">
                <div>
                  <Outlet />
                </div>
              </FeatureGuard>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminHRDashboard />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="leaves" element={<AdminLeaves />} />
            <Route path="shifts" element={<AdminShifts />} />
            <Route path="payroll" element={<AdminPayroll />} />
          </Route>

          <Route
            path="*"
            element={<Navigate to="/admin/dashboard" replace />}
          />
        </Route>
      </Route>

      {/* ── HR Module Routes ── */}
      <Route path="/hr/login" element={<HRLogin />} />
      {/* Staff self-service portal (role=staff) */}
      <Route path="/hr/portal" element={<StaffPortal />} />
      {/* Admin/Manager HR panel */}
      <Route path="/hr" element={<HRLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<HRDashboard />} />
        <Route path="staff" element={<StaffList />} />
        <Route path="staff/:id" element={<StaffProfile />} />
        <Route path="attendance" element={<AttendanceManager />} />
        <Route path="leaves" element={<LeaveManager />} />
        <Route path="shifts" element={<ShiftManager />} />
        <Route path="payroll" element={<PayrollManager />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/menu" replace />} />

      {/* ── Super Admin Routes ── */}
      <Route path="/superadmin/login" element={<SuperAdminLogin />} />
      <Route path="/superadmin" element={<SuperAdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="restaurants" element={<RestaurantList />} />
        <Route path="plans" element={<PlanManager />} />
        <Route path="analytics" element={<SuperAdminAnalytics />} />
        <Route path="support-team" element={<SupportTeamManager />} />
        <Route path="notifications" element={<SuperAdminNotifications />} />
        <Route path="support" element={<SupportTicketManager />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* ── Dedicated Support Team Panel ── */}
      <Route path="/support-team/login" element={<SupportLogin />} />
      <Route element={<ProtectedSupportRoute />}>
        <Route path="/support-team" element={<SupportLayout />}>
          <Route
            index
            element={<Navigate to="/support-team/dashboard" replace />}
          />
          <Route path="dashboard" element={<SupportDashboard />} />
          <Route path="profile" element={<SupportProfile />} />
          <Route path="tickets" element={<SupportTicketList />} />
          <Route path="service" element={<SupportTicketList />} />
          <Route
            path="*"
            element={<Navigate to="/support-team/dashboard" replace />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
