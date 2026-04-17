import React, { useEffect, useState } from "react";
import { PieChart, TrendingUp, TrendingDown, RefreshCw, Calendar, Download } from "lucide-react";
import accApi from "../../api/accApi";
import toast from "react-hot-toast";

export default function AccReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data: res } = await accApi.getDashboard(); // Reusing dashboard data for simple P&L
      setData(res);
    } catch (err) {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Reports</h1>
          <p className="text-slate-500 text-sm font-medium">Profit & Loss Statement (Cumulative)</p>
        </div>
        <div className="flex gap-3">
           <button onClick={fetchReport} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600"><RefreshCw size={20}/></button>
           <button className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200"><Download size={20}/> Export PDF</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">Statement of Profit & Loss</p>
              <h2 className="text-2xl font-black">Consolidated Report</h2>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs font-bold">As of</p>
              <p className="font-black">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="p-8 space-y-12">
            {/* Income Section */}
            <div>
              <h3 className="flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest text-xs mb-6 px-4">
                <TrendingUp size={14}/> Revenue / Income
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center px-4 py-4 rounded-2xl hover:bg-slate-50 transition">
                  <span className="font-bold text-slate-700">Gross Sales</span>
                  <span className="font-black text-slate-900 text-lg">₹{data?.totalSales?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-4 px-4">
                  <span className="font-black text-slate-900 text-sm">TOTAL INCOME (A)</span>
                  <span className="font-black text-emerald-600 text-xl">₹{data?.totalSales?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Expense Section */}
            <div>
              <h3 className="flex items-center gap-2 text-rose-600 font-black uppercase tracking-widest text-xs mb-6 px-4">
                <TrendingDown size={14}/> Operational Expenses
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center px-4 py-4 rounded-2xl hover:bg-slate-50 transition">
                  <span className="font-bold text-slate-700">Direct Expenses</span>
                  <span className="font-black text-slate-900 text-lg">₹{data?.totalExpenses?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-4 px-4">
                  <span className="font-black text-slate-900 text-sm">TOTAL EXPENSE (B)</span>
                  <span className="font-black text-rose-600 text-xl">₹{data?.totalExpenses?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Bottom Line */}
            <div className="bg-slate-50 rounded-3xl p-8 flex justify-between items-center border-2 border-dashed border-slate-200">
              <div>
                <p className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] mb-1">Net Income (A - B)</p>
                <h2 className="text-3xl font-black text-slate-900">Final Balance</h2>
              </div>
              <div className="text-right">
                <p className={`text-4xl font-black ${(data?.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{data?.profit?.toLocaleString()}
                </p>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${(data?.profit || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {(data?.profit || 0) >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
