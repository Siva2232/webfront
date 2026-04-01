import React, { useState, useEffect } from "react";
import { getMyLeaves, applyLeave } from "../api/hrApi";
import toast from "react-hot-toast";
import { CalendarX2, Plus } from "lucide-react";

export default function WaiterLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ type: "casual", startDate: "", endDate: "", reason: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyLeaves();
      const data = Array.isArray(res.data) ? res.data : res.data?.leaves || [];
      setLeaves(data);
    } catch (err) {
      console.error(err);
      toast.error("Unable to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onApply = async (e) => {
    e.preventDefault();
    try {
      await applyLeave(form);
      toast.success("Leave request submitted");
      setShowApply(false);
      setForm({ type: "casual", startDate: "", endDate: "", reason: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply leave");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Leave Requests</h1>
          <p className="text-sm text-slate-500">Check status and apply for leave (pending/approved/rejected).</p>
        </div>
        <button onClick={() => setShowApply(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Apply Leave
        </button>
      </div>

      {showApply && (
        <form onSubmit={onApply} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select required className="border border-slate-300 rounded-lg px-3 py-2" value={form.type} onChange={(e) => setForm(s => ({ ...s, type: e.target.value }))}>
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="annual">Annual</option>
              <option value="unpaid">Unpaid</option>
              <option value="other">Other</option>
            </select>
            <input type="date" required className="border border-slate-300 rounded-lg px-3 py-2" value={form.startDate} onChange={(e) => setForm(s => ({ ...s, startDate: e.target.value }))} />
            <input type="date" required className="border border-slate-300 rounded-lg px-3 py-2" value={form.endDate} onChange={(e) => setForm(s => ({ ...s, endDate: e.target.value }))} />
          </div>
          <textarea required rows={3} className="border border-slate-300 rounded-lg px-3 py-2 w-full" placeholder="Reason for leave" value={form.reason} onChange={(e) => setForm(s => ({ ...s, reason: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowApply(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Submit</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Leave Requests</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : leaves.length === 0 ? (
          <p className="text-sm text-slate-500">No leave requests found.</p>
        ) : (
          <div className="space-y-2">
            {leaves.map((leave) => {
              const statusClasses =
                leave.status === 'approved'
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                  : leave.status === 'rejected'
                  ? 'bg-rose-100 border-rose-200 text-rose-700'
                  : 'bg-amber-100 border-amber-200 text-amber-700';
              return (
                <div key={leave._id} className="p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 capitalize">{leave.type || leave.leaveType || 'Leave'}</p>
                    <p className="text-xs text-slate-500">{new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}</p>
                  </div>
                  <div className={`text-xs font-bold px-3 py-1 rounded-full border ${statusClasses}`}>
                    {leave.status || 'pending'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
