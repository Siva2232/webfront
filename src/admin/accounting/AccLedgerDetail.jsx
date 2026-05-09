import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, FileText, Wallet, RefreshCw } from "lucide-react";
import accApi from "../../api/accApi";
import toast from "react-hot-toast";
import StickyPageHeader from "../components/StickyPageHeader";

export default function AccLedgerDetail() {
  const { ledgerId } = useParams();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data } = await accApi.getLedgerHistory(ledgerId);
      setLedger(data.ledger);
      setTransactions(data.transactions || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load ledger history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ledgerId) fetchHistory();
  }, [ledgerId]);

  const totalBalance = transactions.reduce((acc, tx) => {
    const entry = tx.entries.find((e) => e.ledger?._id === ledgerId);
    if (!entry) return acc;
    return acc + (entry.type === "debit" ? entry.amount : -entry.amount);
  }, 0);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />

      <StickyPageHeader
        icon={Wallet}
        eyebrow="Accounting"
        title={ledger?.name || "Ledger details"}
        subtitle="Full history for this ledger account"
        onBack={() => navigate(-1)}
        rightAddon={
          <button
            type="button"
            onClick={fetchHistory}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Syncing" : "Refresh"}
          </button>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">

      <div className="grid gap-4 lg:grid-cols-[1.5fr_2fr] mb-8">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-black">Ledger</p>
              <h2 className="text-xl font-black text-slate-900">{ledger?.name}</h2>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold">Type</span>
              <span className="capitalize">{ledger?.type}</span>
            </div>
            {ledger?.code && (
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold">Code</span>
                <span>{ledger.code}</span>
              </div>
            )}
            {ledger?.bankDetails?.accountNumber && (
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-3">
                <span className="font-bold">Bank Details</span>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <div>
                    <p className="text-slate-400">Account</p>
                    <p>{ledger.bankDetails.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">IFSC</p>
                    <p>{ledger.bankDetails.ifsc}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Branch</p>
                    <p>{ledger.bankDetails.branch}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Mobile</p>
                    <p>{ledger.bankDetails.mobile}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between pt-3">
              <span className="font-black">Running Balance</span>
              <span className={`font-black ${totalBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                ₹{totalBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-black">History Summary</p>
              <h2 className="text-xl font-black text-slate-900">{transactions.length} entries</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-[0.3em] mb-2">Total Debits</p>
              <p className="text-lg font-black">
                ₹{transactions.reduce((sum, tx) => {
                  const entry = tx.entries.find((e) => e.ledger?._id === ledgerId);
                  return entry?.type === "debit" ? sum + entry.amount : sum;
                }, 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-[0.3em] mb-2">Total Credits</p>
              <p className="text-lg font-black">
                ₹{transactions.reduce((sum, tx) => {
                  const entry = tx.entries.find((e) => e.ledger?._id === ledgerId);
                  return entry?.type === "credit" ? sum + entry.amount : sum;
                }, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Transaction History</p>
            <p className="text-slate-500 text-sm">Detailed ledger movements with debit and credit entries.</p>
          </div>
          <div className="text-sm text-slate-400">{loading ? "Loading..." : `${transactions.length} records`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-[0.18em]">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Particulars</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Counterpart</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const entry = tx.entries.find((e) => e.ledger?._id === ledgerId);
                const counterpart = tx.entries
                  .filter((e) => e.ledger?._id !== ledgerId)
                  .map((e) => `${e.ledger?.name || "Unknown"} (${e.type} ₹${e.amount.toLocaleString()})`)
                  .join(", ");

                return (
                  <tr key={tx._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 align-top text-slate-600">
                      <div className="font-bold text-slate-900">{new Date(tx.date).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-400">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-4 align-top text-slate-700">
                      <div className="font-bold">{tx.description}</div>
                      <div className="text-xs text-slate-500">Ref: {tx.referenceType || 'Manual'} {tx.referenceId || ''}</div>
                    </td>
                    <td className={`px-6 py-4 align-top font-black ${entry?.type === 'debit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry?.type?.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 align-top text-right font-bold text-slate-900">₹{entry?.amount?.toLocaleString()}</td>
                    <td className="px-6 py-4 align-top text-slate-600">{counterpart || '—'}</td>
                  </tr>
                );
              })}
              {!transactions.length && !loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    No ledger history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
