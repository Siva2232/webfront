import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  CreditCard,
  CalendarDays,
  ArrowRight,
  Save,
  Loader2,
  Shield,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminProfile() {
  const navigate = useNavigate();
  const { branding } = useTheme();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "",
    restaurantId: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await API.get("/auth/profile");
      setProfile({
        name: data.name || "",
        email: data.email || "",
        role: data.role || "Administrator",
        restaurantId: data.restaurantId || "",
      });
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);

    try {
      const { data } = await API.put("/auth/profile", {
        name: profile.name,
        email: profile.email,
      });

      setProfile((current) => ({
        ...current,
        name: data.name,
        email: data.email,
      }));

      updateUser({ name: data.name, email: data.email });

      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    if (passwords.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setUpdatingPassword(true);

    try {
      await API.put("/auth/profile/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const planName = typeof branding.subscriptionPlan === "object"
    ? branding.subscriptionPlan?.name
    : branding.subscriptionPlan;

  const expiresOn = branding.subscriptionExpiry
    ? new Date(branding.subscriptionExpiry).toLocaleDateString()
    : "Not set";

  const status = branding.subscriptionStatus || "trial";

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-700 text-3xl font-black">
              {profile.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-black mb-2">
                Admin Profile
              </p>
              <h1 className="text-2xl font-black text-slate-900">
                {profile.name || "Admin User"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {profile.role || "Administrator"}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3 text-slate-600 mb-3">
                <User className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.3em] font-black">Account</span>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <p className="font-semibold">{profile.name || "Unknown Administrator"}</p>
                <p className="text-slate-500">{profile.email || "Not available"}</p>
                {profile.restaurantId && (
                  <p className="text-slate-500">Restaurant ID: {profile.restaurantId}</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3 text-slate-600 mb-3">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.3em] font-black">Subscription</span>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-black">Current Plan</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{planName || "No Plan"}</p>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status === "active" ? "bg-emerald-100 text-emerald-700" : status === "expired" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      <span className="uppercase tracking-[0.25em]">{status}</span>
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{branding.subscriptionExpiry ? `Renewal / expiry: ${expiresOn}` : "Expiry not configured"}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-[0.3em] font-black">Branding</span>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold w-24 text-slate-500">Theme</span>
                      <span>{branding.theme || "default"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold w-24 text-slate-500">Primary</span>
                      <span>{branding.primaryColor || "#f72585"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 transition"
            onClick={() => navigate("/admin/subscription")}
          >
            Manage Subscription
            <ArrowRight size={16} />
          </button>
        </section>

        <section className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                <User size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">My Profile</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="text"
                      required
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="email"
                      required
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  disabled={updatingProfile}
                  type="submit"
                  className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  {updatingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Account Security</h3>
                <p className="text-sm text-slate-500">Update your password without changing your profile details.</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 text-slate-500 text-sm">
                  <AlertTriangle size={18} className="mt-1 text-amber-500" />
                  <div>
                    <div className="font-semibold">Secure your admin account</div>
                    <p className="text-slate-400">Use a strong password and keep it private.</p>
                  </div>
                </div>

                <button
                  disabled={updatingPassword}
                  type="submit"
                  className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                >
                  {updatingPassword ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Change Password
                </button>
              </div>
            </form>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
