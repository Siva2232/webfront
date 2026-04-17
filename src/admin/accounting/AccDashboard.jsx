import React, { useEffect, useState } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw 
} from "lucide-react";
import accApi from "../../api/accApi";
import toast from "react-hot-toast";

export default function AccDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data: res } = await accApi.getDashboard();
      setData(res);
    } catch (err) {
      toast.error("Failed to load accounting data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  const stats = [
    { label: "Cash Balance", value: data?.cashBalance, icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Bank Balance", value: data?.bankBalance, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Sales", value: data?.totalSales, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Total Expenses", value: data?.totalExpenses, icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Accounting Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium">Real-time financial overview</p>
        </div>
        <button 
          onClick={fetchDashboard}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
            <h2 className="text-2xl font-black text-slate-900">₹{stat.value?.toLocaleString()}</h2>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs mb-2">Net Profit/Loss</p>
          <div className="flex items-baseline gap-4">
            <h2 className="text-5xl font-black tracking-tighter">₹{data?.profit?.toLocaleString()}</h2>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${data?.profit >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
              {data?.profit >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {data?.profit >= 0 ? "PROFIT" : "LOSS"}
            </div>
          </div>
        </div>
        
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
      </div>
    </div>
  );
}
