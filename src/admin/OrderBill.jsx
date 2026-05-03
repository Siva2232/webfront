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

/** When true, skip “Select cashier” if exactly one POS cashier exists — print immediately */
const SKIP_CASHIER_MODAL_WHEN_SINGLE = true;

/* ─── component ───────────────────────────────────────────── */

export default function OrderBill() {
  const { bills, fetchBills, markBillPaid, closeBill, isLoading, billsReady } =
    useOrders();
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

  // No background sync timer - relies on WebSocket for real-time and initial fetch only
  useEffect(() => {
    // Only fetch if we don't already have bills or it's been more than 5 minutes
    const rid = getCurrentRestaurantId();
    const lastFetch = localStorage.getItem(tenantKey("lastBillsFetch", rid));
    const now = Date.now();
    
    if (!billsReady || !bills.length || !lastFetch || (now - parseInt(lastFetch)) > 300000) {
      fetchBills();
      localStorage.setItem(tenantKey("lastBillsFetch", rid), now.toString());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { uniqueBills } = useFilteredBills({
    bills,
    dateFilter,
    displayLimit,
  });

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
    navigate("/admin/dashboard");
  }, [dateFilter, navigate]);

  /* mark paid — close modal & toast instantly, sync to server in background */
  const handleConfirmMarkPaid = useCallback(async () => {
    if (!markPaidModal) return;
    
    const billId = markPaidModal.billId;
    const total = markPaidModal.amount;
    const { cash, bank, discount, balance } = paymentData;

    const netPaid = Number(cash) + Number(bank) + Number(discount) - Number(balance);
    if (Number(netPaid) < 0 || Math.abs(netPaid - total) > 0.01) {
      toast.error(`Payment mismatch! Net entered: ₹${netPaid}, Required: ₹${total}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Mark as paid in main system
      await markBillPaid(billId, markPaidModal.orderRef);
      
      // 2. Create accounting transaction
      await accApi.payBill({
        billId,
        cash,
        bank,
        discount,
        balance,
        total,
        description: `Payment for Bill #${billId}`
      });

      setPaidBillIds(prev => new Set(prev).add(billId));
      toast.success("Payment recorded in accounting!");
      setMarkPaidModal(null);
      setPaymentData({ cash: 0, bank: 0, discount: 0, balance: 0 });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Payment sync failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [markPaidModal, markBillPaid, paymentData]);

  const handleCancelConfirmMarkPaid = useCallback(() => {
    if (!isSubmitting) setConfirmMarkPaid(null);
  }, [isSubmitting]);

  /** Mark paid with no ledger (accounting off) — small confirm modal only */
  const handleConfirmSimpleMarkPaid = useCallback(async () => {
    if (!confirmMarkPaid) return;
    setIsSubmitting(true);
    try {
      await markBillPaid(confirmMarkPaid.billId, confirmMarkPaid.orderRef);
      setPaidBillIds((prev) => new Set(prev).add(confirmMarkPaid.billId));
      toast.success("Bill marked as paid");
      setConfirmMarkPaid(null);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to mark bill paid";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [confirmMarkPaid, markBillPaid]);

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
    setCloseBillModal(null);
    
    // Optimistic Update: Add to closed IDs immediately
    setClosedBillIds((prev) => new Set(prev).add(billId));
    
    toast.success("Order closed & table freed!", { duration: 3000 });
    
    try {
      await closeBill(billId);
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
  }, [closeBillModal, closeBill]);

  const closePrintModal = useCallback(() => {
    setPrintModalOrder(null);
    setSelectedCashier(null);
  }, []);

  const openPrintModal = useCallback(
    async (order) => {
      const list = await reloadCashiers();
      if (
        SKIP_CASHIER_MODAL_WHEN_SINGLE &&
        Array.isArray(list) &&
        list.length === 1
      ) {
        try {
          printReceipt(order, list[0].name);
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

  /* ─── empty state ────────────────────────────────────────── */
  if (!uniqueBills.length && isLoading && !billsReady) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
          aria-hidden
        />
        <RefreshCw size={28} className="animate-spin text-zinc-300" />
      </div>
    );
  }

  if (!uniqueBills.length && billsReady) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 px-8 text-center font-sans">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
          aria-hidden
        />
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/5">
          <Receipt size={32} className="text-zinc-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold uppercase tracking-tighter text-zinc-900">No records</h2>
        <p className="mb-8 text-xs font-bold uppercase tracking-widest text-zinc-500">No active invoices</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm shadow-zinc-900/15 transition-all hover:bg-zinc-800 active:scale-95"
          >
            <RefreshCw size={14} /> Refresh bills
          </button>
          <button
            onClick={handleGoBack}
            className="border-b-2 border-zinc-900 pb-1 text-[10px] font-black uppercase tracking-widest text-zinc-800"
          >
            {dateFilter ? "Clear filter" : "Go back"}
          </button>
        </div>
      </div>
    );
  }

  /* ─── main render ────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-20 font-sans">
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
        onBack={() => navigate(-1)}
        onRefresh={handleRefresh}
      />

      {/* Bills Grid */}
      <main className="max-w-7xl mx-auto p-4 mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {uniqueBills.map((order, index) => {
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
