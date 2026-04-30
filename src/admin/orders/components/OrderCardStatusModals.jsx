import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, BellRing, Clock, Flame } from "lucide-react";

export default function OrderCardStatusModals({
  openConfirm,
  openSuccess,
  order,
  currentStatus,
  selectedStatus,
  confirmedStatus,
  onCancelConfirm,
  onConfirmStatus,
  onCloseSuccess,
}) {
  return (
    <>
      <AnimatePresence>
        {openConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center space-y-8 border border-slate-100"
            >
              <div className="mx-auto w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-500">
                <Activity size={40} strokeWidth={2.5} className="animate-pulse" />
              </div>

              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Update Status?</h3>
                <p className="text-slate-500 font-bold mt-3 text-sm leading-relaxed px-4">
                  Change order{" "}
                  <span className="text-slate-900">#{(order?._id || order?.id || "").slice(-5)}</span> from{" "}
                  <span className="text-orange-500 uppercase tracking-wider">{currentStatus}</span> to{" "}
                  <span className="text-indigo-600 uppercase tracking-wider">{selectedStatus}</span>?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={onCancelConfirm}
                  className="py-5 rounded-[2rem] bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmStatus}
                  className="py-5 rounded-[2rem] bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center space-y-6 border border-slate-100"
            >
              <div
                className={`mx-auto w-24 h-24 rounded-3xl flex items-center justify-center ${
                  confirmedStatus === "Served"
                    ? "bg-emerald-50"
                    : confirmedStatus === "Ready"
                      ? "bg-indigo-50 text-indigo-500"
                      : confirmedStatus === "Preparing"
                        ? "bg-orange-50 text-orange-500"
                        : "bg-amber-50 text-amber-500"
                }`}
              >
                {confirmedStatus === "Served" ? (
                  <motion.div className="relative">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200"
                    >
                      <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none">
                        <motion.path
                          d="M5 13l4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        />
                      </svg>
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.3, 0], opacity: [0, 0.6, 0] }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="absolute inset-0 rounded-full border-4 border-emerald-400"
                    />
                  </motion.div>
                ) : confirmedStatus === "Ready" ? (
                  <BellRing size={48} strokeWidth={2.5} className="animate-bounce" />
                ) : confirmedStatus === "Preparing" ? (
                  <Flame size={48} strokeWidth={2.5} className="animate-bounce" />
                ) : (
                  <Clock size={48} strokeWidth={2.5} className="animate-bounce" />
                )}
              </div>

              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">
                  {confirmedStatus === "Served"
                    ? "Order Served!"
                    : confirmedStatus === "Ready"
                      ? "Order Ready!"
                      : confirmedStatus === "Preparing"
                        ? "Now Preparing!"
                        : "Preparing!"}
                </h3>
                <p className="text-slate-500 font-bold mt-3 text-sm leading-relaxed">
                  Order <span className="text-slate-900">#{(order?._id || order?.id || "").slice(-5)}</span> has been
                  updated to{" "}
                  <span
                    className={`uppercase tracking-wider font-black ${
                      confirmedStatus === "Served"
                        ? "text-emerald-500"
                        : confirmedStatus === "Ready"
                          ? "text-indigo-500"
                          : confirmedStatus === "Preparing"
                            ? "text-orange-500"
                            : "text-amber-500"
                    }`}
                  >
                    {confirmedStatus}
                  </span>
                </p>
              </div>

              <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2 }}
                  className={`h-full ${
                    confirmedStatus === "Served"
                      ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                      : confirmedStatus === "Ready"
                        ? "bg-gradient-to-r from-indigo-400 to-purple-500"
                        : confirmedStatus === "Cooking"
                          ? "bg-gradient-to-r from-orange-400 to-rose-500"
                          : "bg-gradient-to-r from-amber-400 to-orange-500"
                  }`}
                />
              </div>

              <button
                onClick={onCloseSuccess}
                className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                  confirmedStatus === "Served"
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : confirmedStatus === "Ready"
                      ? "bg-indigo-500 text-white hover:bg-indigo-600"
                      : confirmedStatus === "Cooking"
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-amber-500 text-white hover:bg-amber-600"
                }`}
              >
                Got it!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

