import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, CalendarCheck2, CalendarX2, Banknote, TrendingUp,
  Clock4, AlertCircle, CheckCircle2, XCircle, ChevronRight,
  UserCheck, UserX, Loader2, ArrowUpRight
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
    { label: "Total Staff", value: stats.staff, icon: Users, color: "text-indigo-600 bg-indigo-50", border: "border-indigo-100", link: "/admin/hr/staff" },
    { label: "Present Today", value: stats.presentToday, icon: UserCheck, color: "text-emerald-600 bg-emerald-50", border: "border-emerald-100", link: "/admin/hr/attendance" },
    { label: "Absent Today", value: stats.absentToday, icon: UserX, color: "text-rose-600 bg-rose-50", border: "border-rose-100", link: "/admin/hr/attendance" },
    { label: "Pending Leaves", value: stats.pendingLeaves, icon: CalendarX2, color: "text-amber-600 bg-amber-50", border: "border-amber-100", link: "/admin/hr/leaves" },
    { label: "Payroll Paid", value: stats.paidPayroll, icon: CheckCircle2, color: "text-teal-600 bg-teal-50", border: "border-teal-100", link: "/admin/hr/payroll" },
    { label: "Payroll Pending", value: stats.pendingPayroll, icon: Banknote, color: "text-violet-600 bg-violet-50", border: "border-violet-100", link: "/admin/hr/payroll" },
  ];

  const quickLinks = [
    { label: "Manage Staff", icon: Users, path: "/admin/hr/staff", desc: "Add or edit staff" },
    { label: "Attendance", icon: CalendarCheck2, path: "/admin/hr/attendance", desc: "Daily records" },
    { label: "Leave Requests", icon: CalendarX2, path: "/admin/hr/leaves", desc: "Review leaves" },
    { label: "Manage Shifts", icon: Clock4, path: "/admin/hr/shifts", desc: "Create schedules" },
    { label: "Run Payroll", icon: Banknote, path: "/admin/hr/payroll", desc: "Generate payslips" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50/50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 md:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">HR Management</h1>
          <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
            <CalendarCheck2 className="w-4 h-4" />
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all">Export Report</button>
            <Link to="/admin/hr/staff" className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all">Add Staff</Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.link}
              className={`group bg-white border ${card.border} rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 transform hover:-translate-y-1`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <Icon className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{card.value}</p>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider text-[10px] mt-1">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Quick Actions - 3 Columns */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" /> Quick Operations
            </h2>
          </div>
          <div className="p-4 space-y-1">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.path} to={link.path}
                  className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-indigo-50/50 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{link.label}</p>
                    <p className="text-xs text-slate-400 font-medium">{link.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Staff Members - 4 Columns */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 flex items-center justify-between border-b border-slate-50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> Staff Overview
            </h2>
            <Link to="/admin/hr/staff" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 bg-indigo-50 rounded-md">View All</Link>
          </div>
          <div className="p-5">
            {recentStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="w-10 h-10 text-slate-200 mb-2" />
                <p className="text-slate-400 text-sm font-medium">No staff members</p>
              </div>
            ) : (
              <div className="space-y-5">
                {recentStaff.map((s) => (
                  <div key={s._id} className="flex items-center gap-4 group cursor-default">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white shadow-sm transition-transform group-hover:scale-110">
                      {s.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 font-medium truncate italic">{s.designation || s.department || s.role}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Leaves - 4 Columns */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 flex items-center justify-between border-b border-slate-50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" /> Pending Requests
            </h2>
            <Link to="/admin/hr/leaves" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 bg-indigo-50 rounded-md">Review</Link>
          </div>
          <div className="p-5">
            {pendingLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="w-10 h-10 text-emerald-100 mb-2" />
                <p className="text-slate-400 text-sm font-medium">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingLeaves.map((leave) => (
                  <div key={leave._id} className="p-4 bg-white border border-slate-100 rounded-xl hover:border-amber-200 hover:bg-amber-50/30 transition-all shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{leave.staff?.name || "Employee"}</p>
                        <p className="text-[11px] font-bold text-amber-600 uppercase mt-0.5">{leave.leaveType} • {leave.totalDays} Day(s)</p>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[10px] font-bold text-slate-400">PENDING</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 italic bg-slate-50 p-2 rounded-md border border-slate-100">"{leave.reason}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}