import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarX2, Check, X, Clock, Search, Filter, Loader2,
  ChevronDown, RefreshCw, MessageSquare, Calendar, User, Tag
} from "lucide-react";
import { getLeaves, updateLeave, deleteLeave } from "../../api/hrApi";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "bg-amber-50 text-amber-700 border-amber-200"  },
  approved: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200"  },
};

const LEAVE_TYPES = ["sick", "casual", "annual", "maternity", "paternity", "unpaid", "other"];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>{cfg.label}</span>;
}

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState(null); // id being approved/rejected
  const [selected, setSelected] = useState(null); // for detail modal
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      // Remove status filter if it is 'all' to fetch all records
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      
      console.log("Fetching leaves with params:", params);
      const res = await getLeaves(params);
      console.log("Leaves API Response:", res.data);

      // The backend returns { leaves: [...], total, ... } 
      // or sometimes just an array directly. We check for both.
      const resData = res.data?.leaves || (Array.isArray(res.data) ? res.data : []);
      setLeaves(resData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setActing(id);
    try {
      await updateLeave(id, { status: "approved" });
      toast.success("Leave approved");
      load();
    } catch {
      toast.error("Failed to approve leave");
    } finally {
      setActing(null);
    }
  };

  const openRejectModal = (leave) => {
    setRejectTarget(leave);
    setRejectNote("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActing(rejectTarget._id);
    try {
      await updateLeave(rejectTarget._id, { status: "rejected", rejectionNote: rejectNote });
      toast.success("Leave rejected");
      setShowRejectModal(false);
      load();
    } catch {
      toast.error("Failed to reject leave");
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leave record?")) return;
    try {
      await deleteLeave(id);
      toast.success("Leave deleted");
      setLeaves(prev => prev.filter(l => l._id !== id));
    } catch {
      toast.error("Failed to delete leave");
    }
  };

  const filtered = (leaves || []).filter(l => {
    // Apply search filter
    const matchesSearch = !search || 
      l.staff?.name?.toLowerCase().includes(search.toLowerCase()) || 
      l.type?.toLowerCase().includes(search.toLowerCase()) || 
      l.reason?.toLowerCase().includes(search.toLowerCase());

    // Ensure status filter is applied locally as well for safety
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const tabs = [
    { key: "pending", label: "Pending", count: (leaves || []).filter(l => l.status === "pending").length },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="p-6 space-y-5 shadow-sm bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">Review and manage leave requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className={`p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all ${loading ? 'animate-spin cursor-not-allowed' : ''}`}>
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200/50 backdrop-blur-sm">
        {tabs.map(tab => (
          <button 
            key={tab.key} 
            onClick={() => setStatusFilter(tab.key)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 relative whitespace-nowrap ${
              statusFilter === tab.key 
                ? "bg-white text-indigo-600 shadow-md ring-1 ring-black/5" 
                : "text-slate-600 hover:text-indigo-600 hover:bg-white/50"
            }`}>
            {tab.label}
            {tab.count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold px-1 border-2 border-white shadow-sm animate-pulse">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search staff or reason…"
            className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400" />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-slate-400" /></button>}
        </div>
        <div className="relative">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-sm text-slate-700 outline-none cursor-pointer">
            <option value="">All Types</option>
            {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Leave cards */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl text-slate-400">
          <CalendarX2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No leave requests found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(leave => (
            <div key={leave._id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 hover:shadow-md transition-shadow">
              {/* Staff info + status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {leave.staff?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{leave.staff?.name || "Unknown"}</p>
                    <p className="text-xs text-slate-400">{leave.staff?.designation || leave.staff?.department || leave.staff?.role || ""}</p>
                  </div>
                </div>
                <StatusBadge status={leave.status} />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400 mb-0.5">Leave Type</p>
                  <p className="font-medium text-slate-700 capitalize">{leave.type || leave.leaveType}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400 mb-0.5">Duration</p>
                  <p className="font-medium text-slate-700">{leave.totalDays || (leave.startDate && leave.endDate ? Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1 : 0)} day{leave.totalDays !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400 mb-0.5">From</p>
                  <p className="font-medium text-slate-700">{new Date(leave.startDate).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400 mb-0.5">To</p>
                  <p className="font-medium text-slate-700">{new Date(leave.endDate).toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              {/* Reason */}
              {leave.reason && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />Reason
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-2">{leave.reason}</p>
                </div>
              )}

              {/* Rejection note if exists */}
              {leave.rejectionNote && (
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                  <p className="text-xs text-rose-500 mb-1">Rejection Note</p>
                  <p className="text-xs text-rose-700">{leave.rejectionNote}</p>
                </div>
              )}

              {/* Applied on */}
              <p className="text-xs text-slate-400">
                Applied: {new Date(leave.createdAt || leave.appliedOn || Date.now()).toLocaleDateString("en-IN")}
              </p>

              {/* Actions */}
              {leave.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleApprove(leave._id)} disabled={acting === leave._id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                    {acting === leave._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Approve
                  </button>
                  <button onClick={() => openRejectModal(leave)} disabled={acting === leave._id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                    <X className="w-3 h-3" />Reject
                  </button>
                </div>
              )}
              {leave.status !== "pending" && (
                <button onClick={() => handleDelete(leave._id)}
                  className="w-full px-3 py-1.5 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-500 rounded-lg text-xs transition-colors">
                  Delete Record
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Reject Leave Request</h2>
              <button onClick={() => setShowRejectModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-sm text-slate-700">
                Rejecting leave for <strong>{rejectTarget?.staff?.name}</strong> ({rejectTarget?.totalDays} day{rejectTarget?.totalDays !== 1 ? "s" : ""})
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rejection Reason (optional)</label>
                <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                  rows={3} placeholder="Explain why the leave is being rejected…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 resize-none text-slate-700 placeholder-slate-400" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-200">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleReject} disabled={!!acting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
