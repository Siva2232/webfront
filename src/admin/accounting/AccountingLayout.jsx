import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ShoppingCart,
  Truck,
  Receipt,
  CreditCard,
  Landmark,
  FileText,
  ChevronRight,
} from "lucide-react";
import { seedChartOfAccounts } from "../../api/accApi";

const navItems = [
  { label: "Dashboard", path: "/admin/accounting/dashboard", icon: LayoutDashboard },
  { label: "Parties", path: "/admin/accounting/parties", icon: Users },
  { label: "Chart of Accounts", path: "/admin/accounting/accounts", icon: BookOpen },
  { label: "Sales Orders", path: "/admin/accounting/orders", icon: ShoppingCart },
  { label: "Purchases", path: "/admin/accounting/purchases", icon: Truck },
  { label: "Expenses", path: "/admin/accounting/expenses", icon: Receipt },
  { label: "Loans & Advances", path: "/admin/accounting/loans", icon: Landmark },
  { label: "Payments", path: "/admin/accounting/payments", icon: CreditCard },
  { label: "Ledger", path: "/admin/accounting/ledger", icon: FileText },
  { label: "Reports", path: "/admin/accounting/reports", icon: FileText },
];

export default function AccountingLayout() {
  // Auto-seed Chart of Accounts on first access (safe to call repeatedly — backend is idempotent)
  useEffect(() => {
    seedChartOfAccounts().catch(() => {/* silent — admin can seed manually from Accounts page */});
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Content only, as sidebar is already in AdminLayout */}
      <main className="flex-1 p-0">
        <Outlet />
      </main>
    </div>
  );
}
