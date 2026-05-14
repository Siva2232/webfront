import React, { useEffect, useState, useCallback } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import accApi from "../api/accApi";
import { getCurrentRestaurantId, tenantKey } from "../utils/tenantCache";
import { AnimatePresence } from "framer-motion";
import { Receipt, RefreshCw } from "lucide-react";
import { useCashiers } from "../hooks/useCashiers";
import { BillCard } from "./orderBill/components/BillCard";
import { MarkPaidModal } from "./orderBill/components/MarkPaidModal";
import { PrintCashierModal } from "./orderBill/components/PrintCashierModal";
import { CloseBillModal } from "./orderBill/components/CloseBillModal";
import { OrderBillHeader } from "./orderBill/components/OrderBillHeader";
import { printReceipt } from "./orderBill/receiptPrint";
import { useFilteredBills } from "./orderBill/hooks/useFilteredBills";
import { useTheme } from "../context/ThemeContext";
import { MarkPaidConfirmModal } from "./orderBill/components/MarkPaidConfirmModal";
import { useUI } from "../context/UIContext";

/** POS cashier picker: only when 2+ HR staff have POS cashier enabled. 0 = admin-only → print as logged-in user; 1 = print as that cashier */
function defaultCashierLabelFromSession() {
  try {
    const u = JSON.parse(localStorage.getItem("userInfo") || "{}");
    const n = u?.name != null ? String(u.name).trim() : "";
    return n || "Admin";
  } catch {
    return "Admin";
  }
}

/* ─── component ───────────────────────────────────────────── */

export default function OrderBill() {
  const { bills, fetchBills, markBillPaid, closeBill, isLoading, billsReady } =
    useOrders();
  const { notifications, markNotificationAsRead } = useUI();
  const { cashiers, reload: reloadCashiers } = useCashiers();
  const { features } = useTheme();
  const navigate = useNavigate();

  // features comes directly from ThemeContext (always fresh from API, never from stale cache)
  const accountingEnabled = features.accounting !== false;

  const [closedBillIds, setClosedBillIds] = useState(new Set());
  const [paidBillIds, setPaidBillIds] = useState(new Set());
  const [closeBillModal, setCloseBillModal] = useState(null); // { order }
  /** Confirm-only modal when accounting is off */
  const [confirmMarkPaid, setConfirmMarkPaid] = useState(null);
  /** Record payment (cash/bank) — only when accounting is on */
  const [markPaidModal, setMarkPaidModal] = useState(null);
  const [paymentData, setPaymentData] = useState({ cash: 0, bank: 0, discount: 0, balance: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printModalOrder, setPrintModalOrder] = useState(null);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [dateFilter, setDateFilter] = useState(""); // "" = all
  const [displayLimit] = useState(100);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  // Bills load globally from OrderContext (mount + socket + focus); no duplicate GET here.

  const { uniqueBills } = useFilteredBills({
    bills,
    dateFilter,
    displayLimit,
  });

  const totalPages = Math.max(1, Math.ceil(uniqueBills.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedBills = uniqueBills.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  useEffect(() => { setPage(1); }, [dateFilter]);

  /* refresh */
  const handleRefresh = useCallback(() => {
    try { const rid = getCurrentRestaurantId(); localStorage.removeItem(tenantKey("cachedBills", rid)); } catch (_) {}
    fetchBills();
    toast.success("Refreshing invoices...");
  }, [fetchBills]);

  const handleGoBack = useCallback(() => {
    if (dateFilter) {
      setDateFilter("");
      return;
    }
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const base = path.startsWith("/waiter")
      ? "/waiter"
      : path.startsWith("/kitchen")
        ? "/kitchen"
        : "/admin";
    navigate(`${base}/dashboard`);
  }, [dateFilter, navigate]);

  /* Record payment (accounting on): dismiss UI immediately; sync bill + ledger in background */
  const handleConfirmMarkPaid = useCallback(() => {
    if (!markPaidModal) return;

    const billId = markPaidModal.billId;
    const total = markPaidModal.amount;
    const orderRef = markPaidModal.orderRef;
    const { cash, bank, discount, balance } = paymentData;

    const netPaid = Number(cash) + Number(bank) + Number(discount) - Number(balance);
    if (Number(netPaid) < 0 || Math.abs(netPaid - total) > 0.01) {
      toast.error(`Payment mismatch! Net entered: ₹${netPaid}, Required: ₹${total}`);
      return;
    }

    const accPayload = {
      billId,
      cash,
      bank,
      discount,
      balance,
      total,
      description: `Payment for Bill #${billId}`,
    };

    setMarkPaidModal(null);
    setPaymentData({ cash: 0, bank: 0, discount: 0, balance: 0 });
    setIsSubmitting(false);
    setPaidBillIds((prev) => new Set(prev).add(billId));
    toast.success("Payment recorded");

    void (async () => {
      try {
        await markBillPaid(billId, orderRef);
      } catch (err) {
        setPaidBillIds((prev) => {
          const next = new Set(prev);
          next.delete(billId);
          return next;
        });
        const msg = err?.response?.data?.message || err?.message || "Could not mark bill paid";
        toast.error(msg);
        try {
          await fetchBills();
        } catch (_) {}
        return;
      }
      try {
        await accApi.payBill(accPayload);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Accounting entry failed";
        toast.error(`Bill is paid. ${msg}`);
      }
    })();
  }, [markPaidModal, markBillPaid, paymentData, fetchBills]);

  const handleCancelConfirmMarkPaid = useCallback(() => {
    if (!isSubmitting) setConfirmMarkPaid(null);
  }, [isSubmitting]);

  /** Mark paid with no ledger (accounting off) — dismiss first, then sync */
  const handleConfirmSimpleMarkPaid = useCallback(() => {
    if (!confirmMarkPaid) return;
    const { billId, orderRef } = confirmMarkPaid;

    setConfirmMarkPaid(null);
    setIsSubmitting(false);
    setPaidBillIds((prev) => new Set(prev).add(billId));
    toast.success("Bill marked as paid");

    void (async () => {
      try {
        await markBillPaid(billId, orderRef);
      } catch (err) {
        setPaidBillIds((prev) => {
          const next = new Set(prev);
          next.delete(billId);
          return next;
        });
        const msg =
          err?.response?.data?.message || err?.message || "Failed to mark bill paid";
        toast.error(msg);
        try {
          await fetchBills();
        } catch (_) {}
      }
    })();
  }, [confirmMarkPaid, markBillPaid, fetchBills]);

  /** Accounting on: open Record Payment directly; off: only the small confirm */
  const requestMarkPaid = useCallback(
    (payload) => {
      if (accountingEnabled) {
        setMarkPaidModal(payload);
      } else {
        setConfirmMarkPaid(payload);
      }
    },
    [accountingEnabled],
  );

  /* close bill – opens confirmation modal */
  const handleCloseBill = useCallback((order) => {
    setCloseBillModal({ order });
  }, []);

  /* confirmed close — close modal & mark instantly, sync to server in background */
  const handleConfirmCloseBill = useCallback(async () => {
    if (!closeBillModal) return;
    const order = closeBillModal.order;
    const billId = order._id || order.id;
    const tableId = order.table;
    setCloseBillModal(null);
    
    // Optimistic Update: Add to closed IDs immediately
    setClosedBillIds((prev) => new Set(prev).add(billId));
    
    toast.success("Order closed & table freed!", { duration: 3000 });
    
    try {
      await closeBill(billId);
      // Clear any pending "Bill" / "Call" alerts for this table
      // (Tables.jsx / Dashboard "Kitchen Floor" derive these badges from UIContext notifications).
      if (tableId != null) {
        const pending = (notifications || []).filter(
          (n) =>
            n &&
            n.status === "Pending" &&
            String(n.table) === String(tableId) &&
            (n.type === "WaiterCall" || n.type === "BillRequested" || n.type === "BillRequest")
        );
        if (pending.length) {
          await Promise.all(pending.map((n) => markNotificationAsRead(n._id)));
        }
      }
      // On success, no need to do anything, the ID is already in closedBillIds
    } catch (err) {
      // Revert optimistic close on failure
      setClosedBillIds((prev) => { 
        const next = new Set(prev); 
        next.delete(billId); 
        return next; 
      });
      const msg = err?.response?.data?.message || err?.message || "Failed to close bill";
      toast.error(msg);
    }
  }, [closeBillModal, closeBill, notifications, markNotificationAsRead]);

  const closePrintModal = useCallback(() => {
    setPrintModalOrder(null);
    setSelectedCashier(null);
  }, []);

  const openPrintModal = useCallback(
    async (order) => {
      const list = await reloadCashiers();
      const n = Array.isArray(list) ? list.length : 0;

      // Fewer than 2 POS cashiers: no modal — admin-only setup uses session name; one cashier uses their name
      if (n < 2) {
        try {
          const cashierName =
            n === 1 ? list[0].name : defaultCashierLabelFromSession();
          printReceipt(order, cashierName);
        } catch (err) {
          console.error(err);
          toast.error(err?.message || "Could not open print preview");
        }
        return;
      }

      setSelectedCashier(null);
      setPrintModalOrder(order);
    },
    [reloadCashiers],
  );

  /* print */
  const handleConfirmPrint = useCallback(() => {
    if (!printModalOrder) return;
    const cashier = cashiers.find(
      (c) => String(c.id) === String(selectedCashier)
    );
    if (!cashier) {
      toast.error("Please select a cashier");
      return;
    }
    try {
      printReceipt(printModalOrder, cashier.name);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Could not open print preview");
    } finally {
      closePrintModal();
    }
  }, [printModalOrder, selectedCashier, closePrintModal, cashiers]);

  /* ─── empty / loading (same chrome as Analytics — header always present to avoid layout jump) ── */
  const billShell = (
    className,
    children
  ) => (
    <div className={`relative min-h-full bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-12 font-sans text-zinc-900 ${className || ""}`}>
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />
      <OrderBillHeader
        isLoading={isLoading}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        onClearFilter={() => setDateFilter("")}
        recordCount={uniqueBills.length}
        onRefresh={handleRefresh}
      />
      {children}
    </div>
  );

  if (!uniqueBills.length && isLoading && !billsReady) {
    return billShell("", (
      <main className="mx-auto flex max-w-7xl justify-center px-4 py-16 md:px-8">
        <RefreshCw size={28} className="animate-spin text-zinc-300" aria-hidden />
      </main>
    ));
  }

  if (!uniqueBills.length && billsReady) {
    return billShell("", (
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 text-center md:px-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/5">
          <Receipt size={32} className="text-zinc-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold uppercase tracking-tighter text-zinc-900">No records</h2>
        <p className="mb-8 text-xs font-bold uppercase tracking-widest text-zinc-500">No active invoices</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm shadow-zinc-900/15 transition-all hover:bg-zinc-800 active:scale-95"
          >
            <RefreshCw size={14} /> Refresh bills
          </button>
          <button
            type="button"
            onClick={handleGoBack}
            className="border-b-2 border-zinc-900 pb-1 text-[10px] font-black uppercase tracking-widest text-zinc-800"
          >
            {dateFilter ? "Clear filter" : "Go back"}
          </button>
        </div>
      </main>
    ));
  }

  /* ─── main render ────────────────────────────────────────── */
  return (
    <div className="relative min-h-full bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-12 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />
      <OrderBillHeader
        isLoading={isLoading}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        onClearFilter={() => setDateFilter("")}
        recordCount={uniqueBills.length}
        onRefresh={handleRefresh}
      />

      {/* Bills Grid */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-12 pt-8 sm:grid-cols-2 md:px-8 lg:grid-cols-3 xl:grid-cols-4">
        {pagedBills.map((order, index) => {
          const billId = order._id || order.id || index;
          const orderRefId = order.orderRef || order._id || order.id;
          
          return (
            <BillCard
              key={billId}
              order={order}
              isClosed={order.status === "Closed" || closedBillIds.has(billId) || closedBillIds.has(orderRefId)}
              isMarkedPaid={paidBillIds.has(billId) || paidBillIds.has(orderRefId)}
              isClosing={false}
              onPrint={openPrintModal}
              onClose={handleCloseBill}
              onMarkPaid={requestMarkPaid}
            />
          );
        })}
      </main>

      {uniqueBills.length > PER_PAGE && (
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pb-10 md:px-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Page {safePage} / {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        <MarkPaidConfirmModal
          payload={confirmMarkPaid}
          onCancel={handleCancelConfirmMarkPaid}
          onConfirm={handleConfirmSimpleMarkPaid}
          loading={isSubmitting}
        />

        <MarkPaidModal
          markPaidModal={markPaidModal}
          paymentData={paymentData}
          setPaymentData={setPaymentData}
          isSubmitting={isSubmitting}
          onClose={() => (!isSubmitting ? setMarkPaidModal(null) : null)}
          onConfirm={handleConfirmMarkPaid}
        />

        <PrintCashierModal
          isOpen={!!printModalOrder}
          selectedCashier={selectedCashier}
          setSelectedCashier={setSelectedCashier}
          cashiers={cashiers}
          onCancel={closePrintModal}
          onConfirm={handleConfirmPrint}
        />

        <CloseBillModal
          closeBillModal={closeBillModal}
          onCancel={() => setCloseBillModal(null)}
          onConfirm={handleConfirmCloseBill}
        />
      </AnimatePresence>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
          div[id^="bill-"] { page-break-after: always; width: 80mm; margin: 0 auto !important; padding: 5mm !important; }
        }
      `}</style>
    </div>
  );
}
