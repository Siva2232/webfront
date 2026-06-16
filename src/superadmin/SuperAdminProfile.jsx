import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getSuperAdminMe,
  updateSuperAdminProfile,
  changeSuperAdminPassword,
} from "../api/restaurantApi";

export default function SuperAdminProfile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "superadmin",
    isActive: true,
    createdAt: null,
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
      const { data } = await getSuperAdminMe();
      setProfile({
        name: data.name || "",
        email: data.email || "",
        role: data.role || "superadmin",
        isActive: data.isActive !== false,
        createdAt: data.createdAt || null,
      });
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const { data } = await updateSuperAdminProfile({
        name: profile.name,
        email: profile.email,
      });
      setProfile((prev) => ({
        ...prev,
        name: data.name,
        email: data.email,
      }));
      updateUser({ name: data.name, email: data.email });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
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
      await changeSuperAdminPassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 pb-20">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Account</p>
          <h1 className="mt-1 text-3xl font-black text-white tracking-tight">Security Profile</h1>
          <p className="mt-1.5 text-sm text-slate-400">Manage your super admin identity and password.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-pink-600 text-4xl font-black text-white shadow-lg shadow-pink-500/20">
                {profile.name?.charAt(0)?.toUpperCase() || "S"}
              </div>
              <h3 className="font-black text-white">{profile.name}</h3>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-pink-400">
                Super Admin
              </p>

              <div className="mt-8 space-y-4 border-t border-slate-800 pt-8 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tighter text-slate-500">Status</p>
                    <p className="text-xs font-bold text-slate-200">
                      {profile.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400">
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tighter text-slate-500">Access</p>
                    <p className="text-xs font-bold text-slate-200">Platform owner</p>
                  </div>
                </div>
                {profile.createdAt && (
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Member since {new Date(profile.createdAt).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8 lg:col-span-2">
            <form
              onSubmit={handleUpdateProfile}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                  <User size={20} />
                </div>
                <h3 className="text-lg font-black text-white">Profile details</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                    <input
                      type="text"
                      required
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3.5 pl-11 pr-4 text-sm font-semibold text-white outline-none focus:border-pink-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                    <input
                      type="email"
                      required
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3.5 pl-11 pr-4 text-sm font-semibold text-white outline-none focus:border-pink-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-pink-500 disabled:opacity-50"
                >
                  {updatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save profile
                </button>
              </div>
            </form>

            <form
              onSubmit={handleUpdatePassword}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                  <Lock size={20} />
                </div>
                <h3 className="text-lg font-black text-white">Change password</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Current password
                  </label>
                  <input
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white outline-none focus:border-pink-500/50"
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                      New password
                    </label>
                    <input
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white outline-none focus:border-pink-500/50"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white outline-none focus:border-pink-500/50"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingPassword || !passwords.currentPassword || !passwords.newPassword}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-200 hover:bg-slate-900 disabled:opacity-50"
                >
                  {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Update password
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
