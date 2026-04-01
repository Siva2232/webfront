import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllStaff, getAttendance, getLeaves, getPayrolls } from '../api/hrApi';
import { Users, CalendarCheck, CalendarX2, Wallet, TrendingUp, Clock } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function HRDashboard() {
  const [stats, setStats] = useState({
    totalStaff: null, activeStaff: null,
    todayPresent: null, pendingLeaves: null,
    pendingPayroll: null,
  });
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();

  useEffect(() => {
    const load = async () => {
      try {
        const [staffRes, attendRes, leaveRes, payrollRes] = await Promise.all([
          getAllStaff({ limit: 200 }),
          getAttendance({ date: today, limit: 200 }),
          getLeaves({ status: 'pending', limit: 5 }),
          getPayrolls({ month: m, year: y, status: 'pending', limit: 200 }),
        ]);

        const allStaff = staffRes.data.staff || [];
        setStats({
          totalStaff: staffRes.data.total,
          activeStaff: allStaff.filter((s) => s.status === 'active').length,
          todayPresent: (attendRes.data.records || []).filter((r) => r.status === 'present').length,
          pendingLeaves: leaveRes.data.total,
          pendingPayroll: payrollRes.data.total,
        });
        setRecentLeaves(leaveRes.data.leaves || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">HR Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Total Staff" value={stats.totalStaff} sub={`${stats.activeStaff} active`} color="bg-blue-600" />
        <StatCard icon={CalendarCheck} label="Today's Present" value={stats.todayPresent} sub="marked today" color="bg-emerald-500" />
        <StatCard icon={CalendarX2} label="Pending Leaves" value={stats.pendingLeaves} sub="awaiting approval" color="bg-amber-500" />
        <StatCard icon={Wallet} label="Pending Payroll" value={stats.pendingPayroll} sub={`${new Date(2000, m - 1).toLocaleString('en', { month: 'long' })} ${y}`} color="bg-violet-600" />
        <StatCard icon={TrendingUp} label="Active Staff" value={stats.activeStaff} sub="of total" color="bg-sky-500" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/hr/staff', label: 'Manage Staff', icon: Users, color: 'border-blue-200 hover:bg-blue-50' },
          { to: '/hr/attendance', label: 'Mark Attendance', icon: CalendarCheck, color: 'border-emerald-200 hover:bg-emerald-50' },
          { to: '/hr/leaves', label: 'Review Leaves', icon: CalendarX2, color: 'border-amber-200 hover:bg-amber-50' },
          { to: '/hr/payroll', label: 'Run Payroll', icon: Wallet, color: 'border-violet-200 hover:bg-violet-50' },
        ].map(({ to, label, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 p-4 bg-white rounded-xl border ${color} transition-colors`}
          >
            <Icon className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">{label}</span>
          </Link>
        ))}
      </div>

      {/* Pending Leaves Table */}
      {recentLeaves.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Pending Leave Applications</h3>
            <Link to="/hr/leaves" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Staff', 'Type', 'From', 'To', 'Days', 'Reason'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLeaves.map((l) => (
                  <tr key={l._id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.staff?.name}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">{l.type}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(l.startDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(l.endDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-600">{l.totalDays}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{l.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
