import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, CalendarCheck2, CalendarX2, Banknote, TrendingUp,
  Clock4, AlertCircle, CheckCircle2, XCircle, ChevronRight,
  UserCheck, UserX, Loader2
} from "lucide-react";
import { getAllStaff, getAttendance, getLeaves, getPayrolls } from "../../api/hrApi";
import toast from "react-hot-toast";

export default function AdminHRDashboard() {
  const [stats, setStats] = useState({ staff: 0, presentToday: 0, absentToday: 0, pendingLeaves: 0, paidPayroll: 0, pendingPayroll: 0 });
  const [recentStaff, setRecentStaff] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [staffRes, attRes, leaveRes, payrollRes] = await Promise.all([
          getAllStaff({ limit: 100 }),
          getAttendance({ date: today }),
          getLeaves({ status: "pending", limit: 5 }),
          getPayrolls({ month: currentMonth, year: currentYear }),
        ]);

        const allStaff = Array.isArray(staffRes.data) ? staffRes.data : staffRes.data?.staff || [];
        const attendance = Array.isArray(attRes.data)
          ? attRes.data
          : attRes.data?.records || attRes.data?.attendance || [];
        const leaves = Array.isArray(leaveRes.data) ? leaveRes.data : leaveRes.data?.leaves || [];
        const payrolls = Array.isArray(payrollRes.data) ? payrollRes.data : payrollRes.data?.payrolls || [];

        const presentToday = attendance.filter(a => a.status === "present").length;
        const absentToday = attendance.filter(a => a.status === "absent").length;
        const pendingLeaveCount = leaves.length;
        const paidCount = payrolls.filter(p => p.status === "paid").length;
        const pendingCount = payrolls.filter(p => p.status === "pending").length;

        setStats({
          staff: allStaff.length,
          presentToday,
          absentToday,
          pendingLeaves: pendingLeaveCount,
          paidPayroll: paidCount,
          pendingPayroll: pendingCount,
        });
        setRecentStaff(allStaff.slice(0, 6));
        setPendingLeaves(leaves.slice(0, 5));
      } catch (err) {
        toast.error("Failed to load HR data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Staff", value: stats.staff, icon: Users, color: "bg-indigo-50 text-indigo-600", border: "border-indigo-100", link: "/admin/hr/staff" },
    { label: "Present Today", value: stats.presentToday, icon: UserCheck, color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100", link: "/admin/hr/attendance" },
    { label: "Absent Today", value: stats.absentToday, icon: UserX, color: "bg-rose-50 text-rose-600", border: "border-rose-100", link: "/admin/hr/attendance" },
    { label: "Pending Leaves", value: stats.pendingLeaves, icon: CalendarX2, color: "bg-amber-50 text-amber-600", border: "border-amber-100", link: "/admin/hr/leaves" },
    { label: "Payroll Paid", value: stats.paidPayroll, icon: CheckCircle2, color: "bg-teal-50 text-teal-600", border: "border-teal-100", link: "/admin/hr/payroll" },
    { label: "Payroll Pending", value: stats.pendingPayroll, icon: Banknote, color: "bg-violet-50 text-violet-600", border: "border-violet-100", link: "/admin/hr/payroll" },
  ];

  const quickLinks = [
    { label: "Manage Staff", icon: Users, path: "/admin/hr/staff", desc: "Add, edit, or remove staff members" },
    { label: "Mark Attendance", icon: CalendarCheck2, path: "/admin/hr/attendance", desc: "Record daily attendance" },
    { label: "Leave Requests", icon: CalendarX2, path: "/admin/hr/leaves", desc: "Review and approve leaves" },
    { label: "Manage Shifts", icon: Clock4, path: "/admin/hr/shifts", desc: "Create and assign shifts" },
    { label: "Run Payroll", icon: Banknote, path: "/admin/hr/payroll", desc: "Generate and send payslips" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">HR Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.link}
              className={`bg-white border ${card.border} rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow`}>
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Links */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />Quick Actions
          </h2>
          <div className="space-y-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.path} to={link.path}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">{link.label}</p>
                    <p className="text-xs text-slate-400 truncate">{link.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Staff */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />Staff Members
            </h2>
            <Link to="/admin/hr/staff" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          {recentStaff.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No staff found</div>
          ) : (
            <div className="space-y-3">
              {recentStaff.map((s) => (
                <div key={s._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {s.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400 truncate">{s.designation || s.department || s.role}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Leaves */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />Pending Leaves
            </h2>
            <Link to="/admin/hr/leaves" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          {pendingLeaves.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No pending leaves</div>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((leave) => (
                <div key={leave._id} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{leave.staff?.name || "Staff"}</p>
                      <p className="text-xs text-slate-500">{leave.leaveType} · {leave.totalDays} day{leave.totalDays !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium whitespace-nowrap">
                      Pending
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{leave.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
