import React, { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { UserPlus, Users, ShieldCheck, Mail, Lock, PlusCircle } from "lucide-react";

export default function SupportTeamManager() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSupportTeam();
  }, []);

  const fetchSupportTeam = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/auth/support-team");
      setTeam(data);
    } catch (error) {
      toast.error("Failed to load support team");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      return toast.error("Name, email, and password are required");
    }

    setCreating(true);
    try {
      await API.post("/auth/support-team", { name, email, password });
      toast.success("Support agent created");
      setName("");
      setEmail("");
      setPassword("");
      fetchSupportTeam();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create agent");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">Support Team</h1>
                <p className="text-slate-400">Create and manage platform support agents in the superadmin panel.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="rounded-3xl bg-slate-900/80 border border-slate-700 p-5 shadow-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold">Agents</p>
              <p className="mt-4 text-3xl font-black text-white">{team.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-900/80 border border-slate-700 p-5 shadow-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold">Active</p>
              <p className="mt-4 text-3xl font-black text-white">{team.filter((agent) => agent.isActive !== false).length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-indigo-600 text-white">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Add New Agent</h2>
                <p className="text-slate-400 text-sm">Provide name, email, and password for the support team.</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <label className="block text-slate-300 text-sm font-semibold">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Agent name"
                />
              </label>

              <label className="block text-slate-300 text-sm font-semibold">
                Email
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-4 py-3 text-white focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="agent@example.com"
                  />
                </div>
              </label>

              <label className="block text-slate-300 text-sm font-semibold">
                Password
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-4 py-3 text-white focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Strong password"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition"
              >
                <PlusCircle size={18} />
                {creating ? "Creating..." : "Create Agent"}
              </button>
            </form>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-slate-800 text-white">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Team Members</h2>
                <p className="text-slate-400 text-sm">Support agents who can resolve customer issues.</p>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-500">Loading team...</div>
            ) : team.length === 0 ? (
              <div className="py-20 text-center text-slate-500">No support agents created yet.</div>
            ) : (
              <div className="space-y-4">
                {team.map((agent) => (
                  <div key={agent._id} className="rounded-3xl border border-slate-700 bg-slate-950 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{agent.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{agent.email}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-slate-500">
                        {agent.role?.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1">
                        <ShieldCheck size={12} /> Platform agent
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
