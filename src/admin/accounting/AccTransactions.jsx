import React, { useEffect, useState } from "react";
import { ArrowLeftRight, Search, RefreshCw, Calendar, FileText } from "lucide-react";
import accApi from "../../api/accApi";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function AccTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data } = await accApi.getTransactions();
      setTransactions(data);
    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 text-sm font-medium">Audit trail of all financial movements</p>
        </div>
        <button 
          onClick={fetchTransactions}
          className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {transactions.map((tx) => (
          <div key={tx._id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                  <ArrowLeftRight size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800">{tx.description}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Calendar size={12} /> {format(new Date(tx.date), "dd MMM yyyy, hh:mm a")}
                    </span>
                    {tx.referenceId && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                        <FileText size={12} /> REF: {tx.referenceId.slice(-6).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl overflow-hidden">
               <table className="w-full text-sm">
                 <tbody className="divide-y divide-white">
                   {tx.entries.map((entry, idx) => (
                     <tr key={idx} className="bg-transparent">
                       <td className="px-6 py-3 font-bold text-slate-600">{entry.ledger?.name || "Unknown Account"}</td>
                       <td className="px-6 py-3">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${entry.type === 'debit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                           {entry.type}
                         </span>
                       </td>
                       <td className={`px-6 py-3 text-right font-black ${entry.type === 'debit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                         ₹{entry.amount.toLocaleString()}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        ))}
        {transactions.length === 0 && !loading && (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-slate-400 font-medium">
            No transactions found.
          </div>
        )}
      </div>
    </div>
  );
}
