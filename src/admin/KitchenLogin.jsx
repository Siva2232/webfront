import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import toast from "react-hot-toast";
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Info,
  Loader2,
  ShieldCheck,
  Zap,
  Coffee,
} from "lucide-react";

export default function KitchenLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      localStorage.getItem("token") &&
      localStorage.getItem("isKitchenLoggedIn") === "true"
    ) {
      navigate("/kitchen/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);


    try {
      const { data } = await API.post("/auth/login", { email, password });

      // ensure this user has kitchen rights
      if (!data.isKitchen) {
        throw { response: { data: { message: "Not a kitchen account" } } };
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("userInfo", JSON.stringify(data));
      localStorage.setItem("isKitchenLoggedIn", "true");
      localStorage.setItem("showWelcomeMessage", "true");
      toast.success("Kitchen access granted");
      navigate("/kitchen/dashboard", { replace: true });
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Invalid credentials. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-orange-100/40 rounded-[10rem] blur-[120px]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[500px] h-[500px] bg-yellow-100/40 rounded-[10rem] blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="relative rounded-[3rem] bg-white border border-slate-100 shadow-[0_30px_100px_rgba(0,0,0,0.08)] p-8 md:p-12">
          <div className="text-center space-y-4 mb-10">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse" />
              <div className="relative mx-auto h-16 w-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center shadow-2xl">
                <ShieldCheck className="text-white" size={30} />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                Kitchen <span className="text-slate-400">Login</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">
                Restricted Staff Portal
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Staff Email
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors"
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 pl-14 pr-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white focus:border-orange-200 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Security Key
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors"
                  size={18}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 pl-14 pr-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white focus:border-orange-200 transition-all"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-[11px] text-rose-600 font-black uppercase tracking-widest flex items-center gap-3"
                >
                  <Info size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden rounded-2xl bg-orange-500 py-4 font-black text-white shadow-xl shadow-slate-200 transition-all hover:bg-orange-600 hover:shadow-orange-200 active:scale-95 disabled:opacity-70"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase tracking-[0.2em]">Initialize Session</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
