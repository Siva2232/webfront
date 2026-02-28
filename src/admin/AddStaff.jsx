import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, UserPlus, DollarSign, Clock, LayoutDashboard } from "lucide-react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { useOrders } from "../context/OrderContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

export default function AddStaff() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, fetchOrders } = useOrders();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "kitchen",
    salary: "",
    advance: "",
  });

  const [status, setStatus] = useState("");

  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [salaryMode, setSalaryMode] = useState(false);
  const [salaryInputs, setSalaryInputs] = useState({});
  const [advanceInputs, setAdvanceInputs] = useState({});
  const [paidInputs, setPaidInputs] = useState({});

  // derive active tab from query parameter instead of state
  const params = new URLSearchParams(location.search);
  const activeTab = params.get("tab") || "overview";

  const fetchUsers = async () => {
    try {
      const { data } = await API.get("/auth/users");
      setUsers(data);
    } catch (err) {
      console.error("failed to fetch users", err);
      toast.error(err.response?.data?.message || "Unable to load users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ensure there is always a tab query parameter when arriving
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (!tab) {
      params.set("tab", "overview");
      navigate(`/admin/staff?${params.toString()}`, { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (activeTab === "overview" || activeTab === "salaryHistory") {
      fetchUsers();
    }
    if (activeTab === "overview") {
      fetchOrders();
    }
    if (activeTab !== "overview") {
      setEditingUser(null);
    }
  }, [activeTab, fetchOrders]);

  useEffect(() => {
    if (salaryMode) {
      if (Object.keys(salaryInputs).length === 0) {
        const mapping = {};
        users
          .filter((u) => !u.isAdmin)
          .forEach((u) => {
            mapping[u._id] = "";
          });
        setSalaryInputs(mapping);
        setAdvanceInputs(mapping);
      }
    } else {
      setSalaryInputs({});
      setAdvanceInputs({});
    }
  }, [salaryMode, users]);

  const filteredUsers = users
    .filter((u) => !u.isAdmin)
    .filter(
      (u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const kitchenUsers = filteredUsers.filter((u) => u.isKitchen);
  const waiterUsers = filteredUsers.filter((u) => u.isWaiter);

  const waiterStats = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    const oneYear = 365 * oneDay;

    const stats = {};
    waiterUsers.forEach((u) => {
      stats[u._id] = { today: 0, week: 0, month: 0, year: 0 };
    });

    orders.forEach((o) => {
      if (!o.waiter) return;
      const st = stats[o.waiter];
      if (!st) return;
      const diff = now - new Date(o.createdAt).getTime();
      if (diff < oneYear) st.year++;
      if (diff < oneMonth) st.month++;
      if (diff < oneWeek) st.week++;
      if (diff < oneDay) st.today++;
    });

    return stats;
  }, [orders, waiterUsers]);

  const growthData = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      if (!u.createdAt) return;
      const key = format(new Date(u.createdAt), "yyyy-MM");
      if (!map[key]) map[key] = { month: key, kitchen: 0, waiter: 0 };
      if (u.isKitchen) map[key].kitchen++;
      if (u.isWaiter) map[key].waiter++;
    });

    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        ...item,
        month: format(parseISO(item.month + "-01"), "MMM yyyy"),
      }));
  }, [users]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!name || !email || !password) {
      toast.error("Please fill all required fields");
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      toast.error("A user with that email already exists");
      return;
    }

    try {
      setStatus("Creating...");
      const payload = {
        name,
        email,
        password,
        isKitchen: form.role === "kitchen",
        isWaiter: form.role === "waiter",
        salary: Number(form.salary) || 0,
        advance: Number(form.advance) || 0,
      };

      await API.post("/auth/staff", payload);
      toast.success("Staff created successfully");

      setForm({
        name: "",
        email: "",
        password: "",
        role: "kitchen",
        salary: "",
        advance: "",
      });
      setStatus("");
      fetchUsers();
    } catch (err) {
      console.error("staff creation error", err);
      toast.error(err.response?.data?.message || "Failed to create staff");
      setStatus(err.response?.data?.message || "Failed to create staff");
    }
  };

  const handleUpdate = async (user) => {
    try {
      const payload = {
        name: user.name,
        email: user.email,
        isKitchen: user.isKitchen,
        isWaiter: user.isWaiter,
        salary: salaryMode
          ? Number(salaryInputs[user._id] || 0)
          : Number(user.salary) || 0,
        advance: salaryMode
          ? Number(advanceInputs[user._id] || 0)
          : Number(user.advance) || 0,
      };

      if (user.newPassword?.trim()) {
        payload.password = user.newPassword.trim();
      }

      await API.put(`/auth/users/${user._id}`, payload);
      toast.success("User updated");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error("update error", err);
      toast.error(err.response?.data?.message || "Failed to update user");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;

    try {
      await API.delete(`/auth/users/${id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      console.error("delete error", err);
      toast.error(err.response?.data?.message || "Failed to delete user");
    }
  };

  const updateHistoryEntry = async (userId, index, newPaid) => {
    // use the amount the admin typed (allow partial or full payment)
    const origUser = users.find((u) => u._id === userId);
    if (!origUser) return;

    const list = [...(origUser.salaryHistory || [])];
    list[index] = { ...list[index], paid: Number(newPaid) || 0 };

    // update UI immediately
    setUsers((prev) =>
      prev.map((u) => {
        if (u._id !== userId) return u;
        return { ...u, salaryHistory: list };
      })
    );

    // clear input buffer
    setPaidInputs((prev) => {
      const key = `${userId}_${index}`;
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      await API.put(`/auth/users/${userId}`, { salaryHistory: list });
      toast.success("Payment recorded");
      // we already updated the local state optimistically above; no
      // need to refresh from server, which can occasionally return stale
      // data and revert the change.
    } catch (err) {
      console.error("update history error", err);
      toast.error(err.response?.data?.message || "Failed to update history");
    }
  };

  const removeHistoryEntry = async (userId, index) => {
    const user = users.find((u) => u._id === userId);
    if (!user) return;

    const list = [...(user.salaryHistory || [])];
    list.splice(index, 1);

    try {
      await API.put(`/auth/users/${userId}`, { salaryHistory: list });
      toast.success("History entry deleted");
      fetchUsers();
    } catch (err) {
      console.error("delete history error", err);
      toast.error(err.response?.data?.message || "Failed to delete history");
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 bg-white p-6 rounded-xl shadow-sm mb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Staff Management</h1>
        <button
          onClick={fetchUsers}
          className="text-xs font-bold text-indigo-600 hover:underline"
        >
          Refresh
        </button>
      </div>



      {activeTab === "overview" && (
        <div className="space-y-8">
          {editingUser && (
            <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-200">
              <h3 className="font-bold mb-4">Edit {editingUser.name}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={editingUser.name || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="email"
                  value={editingUser.email || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <select
                  value={
                    editingUser.isKitchen
                      ? "kitchen"
                      : editingUser.isWaiter
                      ? "waiter"
                      : ""
                  }
                  onChange={(e) => {
                    const role = e.target.value;
                    setEditingUser((prev) => ({
                      ...prev,
                      isKitchen: role === "kitchen",
                      isWaiter: role === "waiter",
                    }));
                  }}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="">-- role --</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="waiter">Waiter</option>
                </select>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={editingUser.newPassword || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Salary"
                  value={editingUser.salary || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => ({
                      ...prev,
                      salary: e.target.value,
                    }))
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Advance"
                  value={editingUser.advance || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => ({
                      ...prev,
                      advance: e.target.value,
                    }))
                  }
                  className="border rounded-lg px-3 py-2"
                />
              </div>

              <div className="mt-6">
                <h4 className="font-bold mb-2">Salary History</h4>
                <ul className="text-sm space-y-2">
                  {(editingUser.salaryHistory || []).map((h, i) => {
                    const adv = h.advance || 0;
                    const pay = (h.amount || 0) - adv;
                    return (
                      <li key={i} className="flex justify-between items-center">
                        <span>
                          {new Date(h.date).toLocaleDateString()} → ₹
                          {h.amount} (adv ₹{adv}, pay ₹{pay})
                        </span>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            value={
                              paidInputs[`${editingUser._id}_${i}`] ?? h.paid ?? ""
                            }
                            onChange={(e) => {
                              setPaidInputs((prev) => ({
                                ...prev,
                                [`${editingUser._id}_${i}`]: e.target.value,
                              }));
                            }}
                            className="w-20 border rounded px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() =>
                              updateHistoryEntry(
                                editingUser._id,
                                i,
                                paidInputs[`${editingUser._id}_${i}`] ?? h.paid
                              )
                            }
                            className="text-xs px-3 py-1 bg-indigo-600 text-white rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() =>
                              removeHistoryEntry(editingUser._id, i)
                            }
                            className="text-xs text-rose-600"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  {(editingUser.salaryHistory || []).length === 0 && (
                    <li className="text-slate-500">No history</li>
                  )}
                </ul>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleUpdate(editingUser)}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2 bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold mb-4">
              Staff Growth (total {users.length})
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="kitchen" fill="#8884d8" name="Kitchen" />
                <Bar dataKey="waiter" fill="#82ca9d" name="Waiter" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2"
            />
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm mb-6">
            <h4 className="font-bold mb-3">Waiter Order Performance</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border px-3 py-2 text-left">Waiter</th>
                    <th className="border px-3 py-2">Today</th>
                    <th className="border px-3 py-2">Week</th>
                    <th className="border px-3 py-2">Month</th>
                    <th className="border px-3 py-2">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {waiterUsers.map((u) => {
                    const s = waiterStats[u._id] || {
                      today: 0,
                      week: 0,
                      month: 0,
                      year: 0,
                    };
                    return (
                      <tr key={u._id} className="even:bg-slate-50">
                        <td className="border px-3 py-2">{u.name}</td>
                        <td className="border px-3 py-2 text-center">{s.today}</td>
                        <td className="border px-3 py-2 text-center">{s.week}</td>
                        <td className="border px-3 py-2 text-center">{s.month}</td>
                        <td className="border px-3 py-2 text-center">{s.year}</td>
                      </tr>
                    );
                  })}
                  {waiterUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-500">
                        No waiters yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-bold mb-3">Kitchen Staff ({kitchenUsers.length})</h3>
              <ul className="space-y-2 text-sm">
                {kitchenUsers.map((u) => (
                  <li
                    key={u._id}
                    className="flex justify-between items-center py-1"
                  >
                    <span>
                      {u.name} <span className="text-slate-500">({u.email})</span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser({ ...u, newPassword: "" })}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                ))}
                {kitchenUsers.length === 0 && (
                  <li className="text-slate-500">No kitchen staff yet.</li>
                )}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-bold mb-3">Waiters ({waiterUsers.length})</h3>
              <ul className="space-y-2 text-sm">
                {waiterUsers.map((u) => (
                  <li
                    key={u._id}
                    className="flex justify-between items-center py-1"
                  >
                    <span>
                      {u.name} <span className="text-slate-500">({u.email})</span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser({ ...u, newPassword: "" })}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                ))}
                {waiterUsers.length === 0 && (
                  <li className="text-slate-500">No waiters yet.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === "salary" && (
        <div className="space-y-6">
          <div>
            <button
              onClick={() => setSalaryMode((prev) => !prev)}
              className={`px-5 py-2.5 rounded-lg font-medium ${
                salaryMode
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {salaryMode ? "Cancel Editing" : "Enter Salaries"}
            </button>
          </div>

          {salaryMode && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border px-4 py-2 text-left">Name</th>
                    <th className="border px-4 py-2">Role</th>
                    <th className="border px-4 py-2">Salary</th>
                    <th className="border px-4 py-2">Advance</th>
                    <th className="border px-4 py-2">Payable</th>
                    <th className="border px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const sal = Number(salaryInputs[u._id] ?? u.salary ?? 0);
                    const adv = Number(advanceInputs[u._id] ?? u.advance ?? 0);
                    const payable = sal - adv;

                    return (
                      <tr key={u._id} className="even:bg-slate-50">
                        <td className="border px-4 py-2">{u.name}</td>
                        <td className="border px-4 py-2">
                          {u.isKitchen ? "Kitchen" : u.isWaiter ? "Waiter" : "-"}
                        </td>
                        <td className="border px-4 py-2">
                          <input
                            type="number"
                            value={salaryInputs[u._id] ?? ""}
                            onChange={(e) =>
                              setSalaryInputs((prev) => ({
                                ...prev,
                                [u._id]: e.target.value,
                              }))
                            }
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="border px-4 py-2">
                          <input
                            type="number"
                            value={advanceInputs[u._id] ?? ""}
                            onChange={(e) =>
                              setAdvanceInputs((prev) => ({
                                ...prev,
                                [u._id]: e.target.value,
                              }))
                            }
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                        <td className="border px-4 py-2 text-center">
                          ₹{payable}
                        </td>
                        <td className="border px-4 py-2 text-center">
                          <button
                            onClick={() => handleUpdate(u)}
                            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No staff found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "salaryHistory" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold">Salary History</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border px-4 py-2 text-left">Name</th>
                  <th className="border px-4 py-2">Date</th>
                  <th className="border px-4 py-2">Amount</th>
                  <th className="border px-4 py-2">Advance</th>
                  <th className="border px-4 py-2">Paid</th>
                  <th className="border px-4 py-2">Remaining</th>
                  <th className="border px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.flatMap((u) =>
                  (u.salaryHistory || []).map((h, i) => {
                    // determine paid amount using input if user is editing, otherwise use stored value
                    const key = `${u._id}_${i}`;
                    const entered = paidInputs[key];
                    const paidValue =
                      typeof entered !== "undefined" && entered !== ""
                        ? Number(entered)
                        : h.paid || 0;
                    let remaining =
                      (h.amount || 0) - (h.advance || 0) - paidValue;
                    if (remaining < 0) {
                      // prevent negative remaining
                      remaining = 0;
                    }

                    return (
                      <tr key={`${u._id}_${i}`} className="even:bg-slate-50">
                        <td className="border px-4 py-2">{u.name}</td>
                        <td className="border px-4 py-2">
                          {new Date(h.date).toLocaleDateString()}
                        </td>
                        <td className="border px-4 py-2">₹{h.amount || 0}</td>
                        <td className="border px-4 py-2">₹{h.advance || 0}</td>
                        <td className="border px-4 py-2">
                          <input
                            type="number"
                            // always start empty; record of past payments is
                            // shown in the "Remaining" column and persists in
                            // history, not inside this input
                            value={paidInputs[`${u._id}_${i}`] ?? ""}
                            onChange={(e) =>
                              setPaidInputs((prev) => ({
                                ...prev,
                                [`${u._id}_${i}`]: e.target.value,
                              }))
                            }
                            className="w-20 border rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="border px-4 py-2 text-center">
                          ₹{remaining}
                        </td>
                        <td className="border px-4 py-2 text-center">
                          {(() => {
                            const payKey = `${u._id}_${i}`;
                            const currentInput = paidInputs[payKey] ?? "";
                            return (
                              <button
                                disabled={currentInput === ""}
                                onClick={() =>
                                  updateHistoryEntry(u._id, i, currentInput)
                                }
                                className="text-xs px-3 py-1 bg-indigo-600 text-white rounded mr-1 disabled:opacity-50"
                              >
                                Save
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => removeHistoryEntry(u._id, i)}
                            className="text-xs px-3 py-1 bg-rose-100 text-rose-700 rounded hover:bg-rose-200"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}

                {filteredUsers.every(
                  (u) => !u.salaryHistory || u.salaryHistory.length === 0
                ) && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      No salary history records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          <input
            type="text"
            placeholder="Full Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email"
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Password *"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role *
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="kitchen">Kitchen Staff</option>
              <option value="waiter">Waiter</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Starting Salary
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Advance Payment
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.advance}
              onChange={(e) => setForm({ ...form, advance: e.target.value })}
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
          >
            Create Staff
          </button>

          {status && <p className="text-sm text-rose-600">{status}</p>}
        </form>
      )}
    </div>
  );
}