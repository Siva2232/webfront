import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, X } from "lucide-react";

/** Collect customer name before placing a takeaway order (swipe checkout). */
export default function TakeawayCustomerNameModal({
  open,
  initialName = "",
  onConfirm,
  onCancel,
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError("");
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, initialName]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Enter your name (at least 2 characters)");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div className="bg-slate-900 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-300">
                    Takeaway order
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight">Your name for pickup</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Shown on your token so staff can call you when ready.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-full p-2 hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <User size={14} /> Customer name
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="e.g. Rahul, Anita"
                  autoComplete="name"
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-4 text-base font-bold text-slate-900 outline-none transition-colors focus:border-orange-500"
                />
              </label>
              {error && (
                <p className="text-center text-xs font-bold text-rose-500">{error}</p>
              )}
              <button
                type="submit"
                className="w-full rounded-2xl bg-orange-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/30 transition-colors hover:bg-orange-600"
              >
                Continue to place order
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
