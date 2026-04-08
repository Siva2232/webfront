import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { superAdminLogin } from "../api/restaurantApi";
import toast from "react-hot-toast";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";

export default function SuperAdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await superAdminLogin(form);
      login(data);
      localStorage.setItem("token", data.token);
      toast.success(`Welcome, ${data.name}!`);
      navigate("/superadmin/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-600 rounded-2xl shadow-lg shadow-pink-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Super Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Restaurant Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to continue</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition"
                placeholder="admin@platform.com"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type={show ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-9 text-slate-400 hover:text-white"
              >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Super Admin Portal — Restricted Access
        </p>
      </div>
    </div>
  );
}
