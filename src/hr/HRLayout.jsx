import { useState } from 'react';
import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useHR } from '../context/HRContext';
import {
  LayoutDashboard, Users, CalendarCheck, CalendarX2, Clock4,
  Wallet, LogOut, Menu, X, ChevronRight, Building2,
} from 'lucide-react';

const NAV = [
  { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: 'staff', label: 'Staff', icon: Users },
  { to: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { to: 'leaves', label: 'Leaves', icon: CalendarX2 },
  { to: 'shifts', label: 'Shifts', icon: Clock4 },
  { to: 'payroll', label: 'Payroll', icon: Wallet },
];

export default function HRLayout() {
  const { hrStaff, hrLoading, logout } = useHR();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (hrLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hrStaff) return <Navigate to="/hr/login" replace />;

  // Staff portal only — admins/managers see full layout
  if (hrStaff.role === 'staff') return <Navigate to="/hr/portal" replace />;

  const handleLogout = () => {
    logout();
    navigate('/hr/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">HR System</p>
            <p className="text-xs text-slate-400">Management Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
              {label}
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-30" />
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {hrStaff.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{hrStaff.name}</p>
              <p className="text-xs text-slate-400 capitalize">{hrStaff.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-slate-700">HR & Staff Management</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
