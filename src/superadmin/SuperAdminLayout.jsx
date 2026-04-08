import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Building2, CreditCard, BarChart3,
  Shield, LogOut, Settings, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const nav = [
  { label: "Dashboard",    icon: LayoutDashboard, to: "/superadmin/dashboard" },
  { label: "Restaurants",  icon: Building2,       to: "/superadmin/restaurants" },
  { label: "Plans",        icon: CreditCard,      to: "/superadmin/plans" },
  { label: "Analytics",   icon: BarChart3,       to: "/superadmin/analytics" },
];

export default function SuperAdminLayout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !isSuperAdmin) {
      navigate("/superadmin/login");
    }
  }, [user, isSuperAdmin, navigate]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    navigate("/superadmin/login");
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-9 h-9 bg-pink-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight">Super Admin</p>
            <p className="text-slate-400 text-xs">Platform Control</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-pink-600/20 text-pink-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-pink-400">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
