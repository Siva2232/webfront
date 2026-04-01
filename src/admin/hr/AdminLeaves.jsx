import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarX2, Check, X, Clock, Search, Filter, Loader2,
  ChevronDown, RefreshCw, MessageSquare, Calendar, User, Tag, 
  Trash2, AlertCircle, CalendarDays, MoreHorizontal
} from "lucide-react";
import { getLeaves, updateLeave, deleteLeave } from "../../api/hrApi";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Check },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700 border-rose-200", icon: X },
};

const LEAVE_TYPES = ["sick", "casual", "annual", "maternity", "paternity", "unpaid", "other"];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cfg.color}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState(null); 
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      
      const res = await getLeaves(params);
      const resData = res.data?.leaves || (Array.isArray(res.data) ? res.data : []);
      setLeaves(resData);
    } catch (err) {
      toast.error("Network synchronization failed");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setActing(id);
    try {
      await updateLeave(id, { status: "approved" });
      toast.success("Request Approved");
      load();
    } catch {
      toast.error("Action failed");
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActing(rejectTarget._id);
    try {
      await updateLeave(rejectTarget._id, { status: "rejected", rejectionNote: rejectNote });
      toast.success("Request Declined");
      setShowRejectModal(false);
      load();
    } catch {
      toast.error("Action failed");
    } finally {
      setActing(null);
    }
  };

  const filtered = leaves.filter(l => {
    const q = search.toLowerCase();
    return !q || 
      l.staff?.name?.toLowerCase().includes(q) || 
      l.type?.toLowerCase().includes(q) || 
      l.reason?.toLowerCase().includes(q);
  });

  const pendingCount = leaves.filter(l => l.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Leave Requests</h1>
          <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-widest text-[10px]">
            Human Resources Management System
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
            {["all", "pending", "approved", "rejected"].map(key => (
              <button 
                key={key} 
                onClick={() => setStatusFilter(key)}
                className={`relative px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                  statusFilter === key ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                }`}>
                {key}
                {key === "pending" && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[8px] flex items-center justify-center animate-bounce">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all shadow-sm">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, reason, or leave type..."
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-sm"
          >
            <option value="">All Categories</option>
            {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Syncing Records</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white border-2 border-dashed border-slate-200 rounded-[2rem]">
          <CalendarX2 className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <h3 className="text-lg font-bold text-slate-800">No requests found</h3>
          <p className="text-sm text-slate-400">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(leave => (
            <div key={leave._id} className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-indigo-200">
                    {leave.staff?.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 tracking-tight">{leave.staff?.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{leave.staff?.designation || "Staff Member"}</p>
                  </div>
                </div>
                <StatusBadge status={leave.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Duration</p>
                  <p className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <CalendarDays size={14} className="text-indigo-500" /> {leave.totalDays || '—'} Days
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Type</p>
                  <p className="text-sm font-black text-slate-700 capitalize">{leave.type || leave.leaveType}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-xs font-bold px-1">
                  <span className="text-slate-400 uppercase">Period</span>
                  <span className="text-slate-800 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {new Date(leave.startDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} → {new Date(leave.endDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                
                {leave.reason && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative">
                    <MessageSquare size={12} className="absolute -top-1.5 -right-1.5 text-indigo-400 fill-white" />
                    <p className="text-xs leading-relaxed text-slate-600 italic">"{leave.reason}"</p>
                  </div>
                )}
              </div>

              {leave.status === "pending" ? (
                <div className="flex gap-3">
                  <button onClick={() => handleApprove(leave._id)} disabled={acting === leave._id}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                    {acting === leave._id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                  </button>
                  <button onClick={() => { setRejectTarget(leave); setRejectNote(""); setShowRejectModal(true); }} disabled={acting === leave._id}
                    className="flex-1 py-3 bg-slate-900 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-100 flex items-center justify-center gap-2">
                    <X size={14} /> Reject
                  </button>
                </div>
              ) : (
                <button onClick={() => deleteLeave(leave._id)} className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  Archive Record
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modern Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 flex justify-between items-center">
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                <AlertCircle size={24} />
              </div>
              <button onClick={() => setShowRejectModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 pt-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Decline Request?</h2>
              <p className="text-sm text-slate-500 mt-2">You are declining the <b>{rejectTarget?.type}</b> leave for <b>{rejectTarget?.staff?.name}</b>.</p>
              
              <div className="mt-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Internal Note</label>
                <textarea 
                  value={rejectNote} 
                  onChange={e => setRejectNote(e.target.value)}
                  rows={4} 
                  placeholder="e.g., Critical project deadline..."
                  className="w-full mt-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-rose-500/5 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowRejectModal(false)} className="flex-1 py-4 text-xs font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest">
                  Nevermind
                </button>
                <button onClick={handleReject} disabled={acting}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-100 transition-all flex items-center justify-center gap-2">
                  {acting ? <Loader2 size={14} className="animate-spin" /> : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}