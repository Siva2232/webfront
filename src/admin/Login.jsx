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
  Coffee
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token") &&
        (localStorage.getItem("isAdminLoggedIn") === "true" ||
         localStorage.getItem("isKitchenLoggedIn") === "true")) {
      const isKitchen = localStorage.getItem("isKitchenLoggedIn") === "true";
      navigate(isKitchen ? "/kitchen/dashboard" : "/admin/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data } = await API.post("/auth/login", { email, password });
      
      // verify role and redirect accordingly
      let redirectPath = "/admin/dashboard";
      if (data.isAdmin) {
        localStorage.setItem("isAdminLoggedIn", "true");
        toast.success("Logged in successfully");
      } else if (data.isKitchen) {
        localStorage.setItem("isKitchenLoggedIn", "true");
        toast.success("Kitchen access granted");
        redirectPath = "/kitchen/dashboard";
      } else {
        throw { response: { data: { message: "Unauthorized account" } } };
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("userInfo", JSON.stringify(data));
      localStorage.setItem("showWelcomeMessage", "true");
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const msg = error.response?.data?.message || "Invalid credentials. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 overflow-hidden relative">
      {/* --- Abstract Background Decor --- */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-100/40 rounded-[10rem] blur-[120px]" 
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[500px] h-[500px] bg-purple-100/40 rounded-[10rem] blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Decorative Floating Icons */}
        <div className="absolute -top-12 -left-12 text-indigo-200 animate-bounce hidden md:block">
          <Zap size={48} strokeWidth={1} />
        </div>
        <div className="absolute -bottom-12 -right-12 text-purple-200 animate-pulse hidden md:block" style={{ animationDuration: '4s' }}>
          <Coffee size={48} strokeWidth={1} />
        </div>

        <div className="relative rounded-[3rem] bg-white border border-slate-100 shadow-[0_30px_100px_rgba(0,0,0,0.08)] p-8 md:p-12">
          
          {/* Header */}
          <div className="text-center space-y-4 mb-10">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse" />
              <div className="relative mx-auto h-16 w-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center shadow-2xl">
                <ShieldCheck className="text-white" size={30} />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                System <span className="text-slate-400">Login</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">
                Enterprise Resource Gateway
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@demo.com"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 pl-14 pr-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-200 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Security Key</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 pl-14 pr-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-200 transition-all"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
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
              className="group relative w-full overflow-hidden rounded-2xl bg-slate-900 py-4 font-black text-white shadow-xl shadow-slate-200 transition-all hover:bg-indigo-600 hover:shadow-indigo-200 active:scale-95 disabled:opacity-70"
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

          {/* Demo Info - Refined for 2026 */}
          {/* <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 mb-4">Quick Access Credentials</p>
            <div className="flex justify-center gap-2">
              <button 
                onClick={() => {setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD);}}
                className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-100"
              >
                Auto-fill Demo
              </button>
            </div>
          </div> */}

        </div>
      </motion.div>
    </div>
  );
}