import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Download,
  Trash2,
  DollarSign,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";

// Helper hook with unique IDs
function useExpenses(key) {
  const [list, setList] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(list));
  }, [key, list]);

  const add = (item) =>
    setList((prev) => [
      ...prev,
      { ...item, id: Date.now() + Math.random().toString(36).slice(2) },
    ]);

  const remove = (id) =>
    setList((prev) => prev.filter((item) => item.id !== id));

  return { list, add, remove };
}

export default function ExpenseTracker() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeTab = params.get("tab") || "purchase";

  useEffect(() => {
    if (!params.get("tab")) {
      navigate("/admin/expense?tab=purchase", { replace: true });
    }
  }, [navigate, params]);

  const purchase = useExpenses("expense_purchase");
  const utility = useExpenses("expense_utility");
  const direct = useExpenses("expense_direct");
  const indirect = useExpenses("expense_indirect");

  const currentMap = { purchase, utility, direct, indirect };
  const current = currentMap[activeTab] || purchase;

  const [filterDates, setFilterDates] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredList = useMemo(() => {
    return current.list.filter((x) => {
      let ok = true;

      if (filterDates.start) {
        const start = new Date(filterDates.start);
        const itemDate = new Date(x.date);
        ok = ok && isValid(start) && isValid(itemDate) && itemDate >= start;
      }

      if (filterDates.end) {
        const end = new Date(filterDates.end);
        const itemDate = new Date(x.date);
        ok = ok && isValid(end) && isValid(itemDate) && itemDate <= end;
      }

      if (searchTerm.trim()) {
        ok = ok && x.desc?.toLowerCase().includes(searchTerm.toLowerCase().trim());
      }

      return ok;
    });
  }, [current.list, filterDates, searchTerm]);

  const total = useMemo(
    () => filteredList.reduce((sum, x) => sum + Number(x.amount || 0), 0),
    [filteredList]
  );

  const chartData = useMemo(() => {
    const map = {};
    filteredList.forEach((x) => {
      const date = format(new Date(x.date), "yyyy-MM-dd");
      if (!map[date]) map[date] = { date, amount: 0 };
      map[date].amount += Number(x.amount || 0);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredList]);

  const handleExport = () => {
    if (filteredList.length === 0) {
      toast.error("Nothing to export");
      return;
    }

    const header = ["Date", "Description", "Amount"];
    const rows = filteredList.map((r) => [r.date, `"${r.desc.replace(/"/g, '""')}"`, r.amount]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTab}-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const [form, setForm] = useState({ date: "", desc: "", amount: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date || !form.desc.trim() || !form.amount || Number(form.amount) <= 0) {
      toast.error("Please fill all fields correctly");
      return;
    }

    current.add({
      date: form.date,
      desc: form.desc.trim(),
      amount: Number(form.amount),
    });

    setForm({ date: "", desc: "", amount: "" });
    toast.success("Added");
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-8 lg:p-12 font-sans text-slate-950">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-4xl font-black tracking-tight">Expense Tracker</h1>

          <div className="flex flex-wrap gap-2">
            {["purchase", "utility", "direct", "indirect"].map((key) => (
              <button
                key={key}
                onClick={() => navigate(`/admin/expense?tab=${key}`)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                  activeTab === key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Summary + Chart */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow">
            <p className="text-sm text-slate-500 uppercase tracking-wide">
              Total {activeTab} cost
            </p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              ₹{total.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="md:col-span-2 h-64 bg-white rounded-2xl shadow p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="amount" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Filters + Form + List */}
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2">
              <label className="text-sm whitespace-nowrap">From:</label>
              <input
                type="date"
                value={filterDates.start}
                onChange={(e) => setFilterDates((f) => ({ ...f, start: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-1.5"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm whitespace-nowrap">To:</label>
              <input
                type="date"
                value={filterDates.end}
                onChange={(e) => setFilterDates((f) => ({ ...f, end: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-1.5"
              />
            </div>

            <div className="flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="Search description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>

            <button
              onClick={() => {
                setFilterDates({ start: "", end: "" });
                setSearchTerm("");
              }}
              className="text-sm text-indigo-600 hover:underline whitespace-nowrap"
            >
              Clear
            </button>
          </div>

          {/* Form + Entries */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-2xl shadow space-y-5"
            >
              <h2 className="text-xl font-semibold">Add New Entry</h2>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Description</label>
                <input
                  type="text"
                  value={form.desc}
                  onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  placeholder="e.g. Office stationery"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Amount (₹)</label>
                <div className="relative">
                  <DollarSign
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-2"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Expense
                </button>

                <button
                  type="button"
                  onClick={handleExport}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-full font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Export CSV
                </button>
              </div>
            </form>

            {/* Entries List */}
            <div className="bg-white p-6 rounded-2xl shadow flex flex-col">
              <h2 className="text-xl font-semibold mb-4">Entries</h2>

              {filteredList.length === 0 ? (
                <p className="text-sm text-slate-500 py-10 text-center">
                  No records found
                </p>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-[55vh]">
                  {filteredList.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {format(parseISO(r.date), "dd MMM yyyy")}
                        </p>
                        <p className="text-[13px] text-slate-600 mt-0.5 truncate max-w-[220px] md:max-w-[300px]">
                          {r.desc}
                        </p>
                      </div>
                      <div className="flex items-center gap-5 shrink-0">
                        <p className="font-medium whitespace-nowrap">
                          ₹{Number(r.amount).toLocaleString("en-IN")}
                        </p>
                        <button
                          onClick={() => current.remove(r.id)}
                          className="text-rose-500 hover:text-rose-700 transition-colors"
                          aria-label="Delete entry"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}