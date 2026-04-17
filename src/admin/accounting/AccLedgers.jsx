import React, { useEffect, useState } from "react";
import { BookOpen, Plus, Search, RefreshCw, Landmark, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";
import accApi from "../../api/accApi";
import toast from "react-hot-toast";

export default function AccLedgers() {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLedger, setNewLedger] = useState({ name: "", type: "asset" });

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const { data } = await accApi.getLedgers();
      setLedgers(data);
    } catch (err) {
      toast.error("Failed to load ledgers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await accApi.createLedger(newLedger);
      toast.success("Ledger created!");
      setShowAdd(false);
      setNewLedger({ name: "", type: "asset" });
      fetchLedgers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create ledger");
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ledgers</h1>
          <p className="text-slate-500 text-sm font-medium">Manage your accounts and categories</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchLedgers}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw size={20} />
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="px-5 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition"
          >
            <Plus size={20} /> Add Ledger
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 mb-6">New Ledger Account</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Account Name</label>
                <input 
                  required
                  type="text" 
                  value={newLedger.name}
                  onChange={(e) => setNewLedger({...newLedger, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. Petty Cash, ICICI Bank"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Account Type</label>
                <select 
                  value={newLedger.type}
                  onChange={(e) => setNewLedger({...newLedger, type: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="asset">Asset (Cash, Bank, Equipment)</option>
                  <option value="income">Income (Sales, Commissions)</option>
                  <option value="expense">Expense (Rent, Salary, Supplies)</option>
                  <option value="liability">Liability (Loans, Payables)</option>
                  <option value="equity">Equity (Capital)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Account Name</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {ledgers.map((ledger) => (
              <tr key={ledger._id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${ledger.type === 'asset' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                      {ledger.type === 'asset' ? <Wallet size={16} /> : <BookOpen size={16} />}
                    </div>
                    <NavLink
                      to={`/admin/accounting/ledgers/${ledger._id}`}
                      className="font-bold text-slate-800 hover:text-indigo-600 transition-colors"
                    >
                      {ledger.name}
                    </NavLink>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    {ledger.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-block w-2 h-2 rounded-full ${ledger.isDefault ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ledgers.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-400 font-medium">No ledgers found.</div>
        )}
      </div>
    </div>
  );
}
