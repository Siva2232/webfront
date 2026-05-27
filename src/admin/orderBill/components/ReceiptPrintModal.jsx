import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Printer, X, Receipt, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { buildReceiptModel } from "../buildReceiptModel";
import { directPrintReceipt } from "../receiptPrint";

function MetaRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-[11px] leading-snug text-zinc-700">
      <span className="shrink-0 font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-right font-mono font-medium text-zinc-900">{value}</span>
    </div>
  );
}

function DashedRule() {
  return <div className="my-3 border-b border-dashed border-zinc-300" aria-hidden />;
}

export function ReceiptPrintModal({ order, cashierName, onClose }) {
  const model = useMemo(
    () => (order ? buildReceiptModel(order, cashierName) : null),
    [order, cashierName]
  );

  const [printState, setPrintState] = useState("idle");
  const [printError, setPrintError] = useState("");
  const autoStarted = useRef(false);

  const runPrint = useCallback(async () => {
    if (!order) return;
    setPrintState("printing");
    setPrintError("");
    try {
      await directPrintReceipt(order, cashierName);
      setPrintState("done");
      toast.success("Sent to printer");
    } catch (err) {
      const msg = err?.message || "Could not print";
      setPrintState("error");
      setPrintError(msg);
      toast.error(msg);
    }
  }, [order, cashierName]);

  useEffect(() => {
    if (!order || autoStarted.current) return;
    autoStarted.current = true;
    void runPrint();
  }, [order, runPrint]);

  if (!order || !model) return null;

  const { header } = model;

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
              <Receipt size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black uppercase tracking-tight text-zinc-900">
                Bill receipt
              </h3>
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {model.orderRef} · {model.tableLabel}
              </p>
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
          {printState === "idle" && "Preparing print…"}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
          <div className="mx-auto w-full max-w-[320px] rounded-sm border border-zinc-200/80 bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-zinc-900 shadow-md shadow-zinc-900/10">
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-tight">
                {header.restaurantName}
              </p>
              {header.address ? (
                <p className="mt-1 text-[10px] leading-snug text-zinc-600">{header.address}</p>
              ) : null}
              {header.phone ? (
                <p className="text-[10px] text-zinc-600">{header.phone}</p>
              ) : null}
              {header.gstNumber ? (
                <p className="text-[10px] text-zinc-500">GST: {header.gstNumber}</p>
              ) : null}
            </div>

            <DashedRule />

            <div
              className={`mb-2 text-center text-[10px] font-black uppercase tracking-widest ${
                model.isPaid ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {model.statusLabel}
            </div>
            <p className="text-center text-[10px] text-zinc-600">
              Cashier: <span className="font-semibold text-zinc-800">{model.cashierName}</span>
            </p>

            <DashedRule />

            <div className="space-y-1.5">
              <MetaRow label="Order ref" value={model.orderRef} />
              <MetaRow label="Table" value={model.tableLabel} />
              {model.takeawayMeta.map((row) => (
                <MetaRow key={row.label} label={row.label} value={row.value} />
              ))}
              <MetaRow label="Placed at" value={model.placedAt} />
            </div>

            {model.hasTakeawayItemsInDineIn ? (
              <p className="mt-3 text-center text-[10px] font-black uppercase tracking-wide text-orange-700">
                Takeaway items included
              </p>
            ) : null}

            <DashedRule />

            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-800">
              Itemized manifest
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-snug text-zinc-800">
              {model.itemsManifest || "—"}
            </pre>

            <DashedRule />

            <div className="space-y-1">
              <MetaRow label="Subtotal" value={`Rs.${model.subtotal.toFixed(2)}`} />
              <MetaRow label={model.taxLabel} value={`Rs.${model.tax.toFixed(2)}`} />
            </div>

            <DashedRule />

            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-800">
              Total summary
            </p>
            <div className="mt-2 space-y-1">
              <MetaRow label="Method" value={model.paymentMethod} />
              <div
                className={`py-1 text-center text-[10px] font-black uppercase tracking-widest ${
                  model.isPaid ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {model.paymentStatusText}
              </div>
              <MetaRow label="Total" value={`Rs.${model.total.toFixed(2)}`} />
            </div>

            <DashedRule />

            <p
              className={`text-center text-[11px] font-black uppercase leading-snug ${
                model.isPaid ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {model.amountDueLabel}
            </p>

            <DashedRule />

            <p className="text-center text-[10px] font-black uppercase tracking-wide text-zinc-700">
              {model.footerLabel}
            </p>
            <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Thank you
            </p>
          </div>
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
            Print again
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
