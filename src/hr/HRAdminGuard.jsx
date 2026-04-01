import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useHR } from '../context/HRContext';
import { Building2, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * HRAdminGuard — renders inside AdminLayout.
 * If the admin hasn't logged into the HR module yet, shows
 * a compact inline login card instead of a full-page redirect.
 */
export default function HRAdminGuard() {
  const { hrStaff, hrLoading, login } = useHR();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (hrLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Already authenticated → render the requested HR page
  if (hrStaff) return <Outlet />;

  // Not authenticated → inline login card
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return toast.error('Email and password required');
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('HR module unlocked');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid HR credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh] bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">HR Module</h2>
            <p className="text-slate-400 text-xs">Enter your HR credentials to continue</p>
          </div>
          <Lock className="ml-auto w-5 h-5 text-slate-500" />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-8 py-7 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              HR Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@company.com"
              autoComplete="username"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Unlock HR Module
          </button>
        </form>
      </div>
    </div>
  );
}
