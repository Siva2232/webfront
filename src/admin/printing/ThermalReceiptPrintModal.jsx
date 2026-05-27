import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Printer, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

/**
 * Shared thermal receipt preview + direct print (no browser print dialog).
 */
export function ThermalReceiptPrintModal({
  title,
  subtitle,
  icon: Icon,
  preview,
  onPrint,
  onClose,
  autoPrintOnOpen = true,
  successToast = "Sent to printer",
}) {
  const [printState, setPrintState] = useState("idle");
  const [printError, setPrintError] = useState("");
  const autoStarted = useRef(false);

  const runPrint = useCallback(async () => {
    setPrintState("printing");
    setPrintError("");
    try {
      await onPrint();
      setPrintState("done");
      toast.success(successToast);
    } catch (err) {
      const msg = err?.message || "Could not print";
      setPrintState("error");
      setPrintError(msg);
      toast.error(msg);
    }
  }, [onPrint, successToast]);

  useEffect(() => {
    autoStarted.current = false;
  }, [preview, onPrint]);

  useEffect(() => {
    if (!autoPrintOnOpen || autoStarted.current) return;
    autoStarted.current = true;
    void runPrint();
  }, [autoPrintOnOpen, runPrint]);

  if (!preview) return null;

  const IconComp = Icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(96vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-zinc-100 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
              {IconComp ? <IconComp size={18} /> : null}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black uppercase tracking-tight text-zinc-900">
                {title}
              </h3>
              {subtitle ? (
                <p className="truncate text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={`mx-4 mt-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-bold ${
            printState === "printing"
              ? "border-zinc-200 bg-white text-zinc-600"
              : printState === "done"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : printState === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-zinc-200 bg-white text-zinc-500"
          }`}
        >
          {printState === "printing" && (
            <>
              <Loader2 size={14} className="animate-spin shrink-0" />
              Sending to thermal printer…
            </>
          )}
          {printState === "done" && (
            <>
              <CheckCircle2 size={14} className="shrink-0" />
              Printed — no browser dialog needed
            </>
          )}
          {printState === "error" && (
            <>
              <AlertCircle size={14} className="shrink-0" />
              <span className="min-w-0">{printError}</span>
            </>
          )}
          {printState === "idle" &&
            (autoPrintOnOpen ? "Preparing print…" : "Review ticket, then send to printer")}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
          {preview}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-zinc-200 bg-white p-3 sm:gap-3 sm:p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-700 transition hover:bg-zinc-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void runPrint()}
            disabled={printState === "printing"}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm shadow-zinc-900/20 transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60"
          >
            {printState === "printing" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Printer size={14} />
            )}
            Send to printer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
