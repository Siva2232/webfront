import React, { useEffect, useState, useCallback } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import accApi from "../api/accApi";
import { AnimatePresence } from "framer-motion";
import { Receipt, RefreshCw } from "lucide-react";
import { useCashiers } from "../hooks/useCashiers";
import { BillCard } from "./orderBill/components/BillCard";
import { MarkPaidModal } from "./orderBill/components/MarkPaidModal";
import { PrintCashierModal } from "./orderBill/components/PrintCashierModal";
import { ReceiptPrintModal } from "./orderBill/components/ReceiptPrintModal";
import { CloseBillModal } from "./orderBill/components/CloseBillModal";
import { OrderBillHeader } from "./orderBill/components/OrderBillHeader";
import { useFilteredBills } from "./orderBill/hooks/useFilteredBills";
import { useTheme } from "../context/ThemeContext";
import { MarkPaidConfirmModal } from "./orderBill/components/MarkPaidConfirmModal";
import { useUI } from "../context/UIContext";
import { TAKEAWAY_TABLE } from "../context/CartContext";

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
  const {
    bills,
    orders,
    fetchBills,
    markBillPaid,
    closeBill,
    billsLoading,
    billsReady,
  } = useOrders();
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
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [dateFilter, setDateFilter] = useState(""); // "" = all
  const [customerSearch, setCustomerSearch] = useState("");
  const [takeawayOnly, setTakeawayOnly] = useState(false);
  const [displayLimit] = useState(20);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    fetchBills({ force: true }).catch(() => {});
  }, [fetchBills]);

  const hasActiveFilters = Boolean(dateFilter || customerSearch.trim() || takeawayOnly);
  const rawBillCount = (bills || []).length;

  const { uniqueBills } = useFilteredBills({
    bills,
    orders,
    dateFilter,
    displayLimit,
  });

  const displayBills = React.useMemo(() => {
    let list = uniqueBills;
    if (takeawayOnly) {
      list = list.filter(
        (b) =>
          b.table === TAKEAWAY_TABLE ||
          b.table === "TAKEAWAY" ||
          !b.table ||
          b.isTakeawayOrder
      );
    }
    const q = customerSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          String(b.tokenNumber ?? "").includes(q) ||
          String(b.customerName ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [uniqueBills, takeawayOnly, customerSearch]);

  const totalPages = Math.max(1, Math.ceil(displayBills.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedBills = displayBills.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  useEffect(() => { setPage(1); }, [dateFilter, takeawayOnly, customerSearch]);

  const handleRefresh = useCallback(() => {
    fetchBills({ force: true })
      .then(() => toast.success("Invoices updated"))
      .catch(() => toast.error("Could not refresh invoices — showing cached data"));
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

  const closeReceiptPreview = useCallback(() => {
    setReceiptPreview(null);
  }, []);

  const openReceiptPreview = useCallback((order, cashierName) => {
    setReceiptPreview({ order, cashierName });
  }, []);

  const openPrintModal = useCallback(
    async (order) => {
      const list = await reloadCashiers();
      const n = Array.isArray(list) ? list.length : 0;

      // Fewer than 2 POS cashiers: no picker — admin-only uses session name; one cashier uses their name
      if (n < 2) {
        const cashierName =
          n === 1 ? list[0].name : defaultCashierLabelFromSession();
        openReceiptPreview(order, cashierName);
        return;
      }

      setSelectedCashier(null);
      setPrintModalOrder(order);
    },
    [reloadCashiers, openReceiptPreview],
  );

  const handleConfirmPrint = useCallback(() => {
    if (!printModalOrder) return;
    const cashier = cashiers.find(
      (c) => String(c.id) === String(selectedCashier)
    );
    if (!cashier) {
      toast.error("Please select a cashier");
      return;
    }
    openReceiptPreview(printModalOrder, cashier.name);
    closePrintModal();
  }, [printModalOrder, selectedCashier, closePrintModal, cashiers, openReceiptPreview]);

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
        isLoading={billsLoading}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        onClearFilter={() => setDateFilter("")}
        recordCount={uniqueBills.length}
        onRefresh={handleRefresh}
      />
      {children}
    </div>
  );

  if (!uniqueBills.length && billsLoading && !billsReady) {
    return billShell("", (
      <main className="mx-auto flex max-w-7xl justify-center px-4 py-16 md:px-8">
        <RefreshCw size={28} className="animate-spin text-zinc-300" aria-hidden />
      </main>
    ));
  }

  if (!uniqueBills.length && !hasActiveFilters && rawBillCount === 0 && billsReady && !billsLoading) {
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
        isLoading={billsLoading}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        onClearFilter={() => setDateFilter("")}
        recordCount={displayBills.length}
        onRefresh={handleRefresh}
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-4 sm:pt-6 md:px-8">
        <button
          type="button"
          onClick={() => setTakeawayOnly((v) => !v)}
          className={`w-full sm:w-auto rounded-full border px-3 py-2 sm:py-1.5 text-[10px] font-black uppercase tracking-wider ${
            takeawayOnly
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-zinc-200 bg-white text-zinc-600"
          }`}
        >
          Takeaway only
        </button>
        <input
          type="search"
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          placeholder="Search customer name or token #"
          className="w-full min-w-0 flex-1 sm:max-w-md rounded-xl border border-zinc-200 bg-white px-4 py-2.5 sm:py-2 text-sm font-medium outline-none focus:border-zinc-400"
        />
      </div>

      {displayBills.length === 0 && uniqueBills.length > 0 && (
        <p className="mx-auto max-w-7xl px-3 text-center text-sm font-medium text-zinc-500 sm:px-4 md:px-8">
          No invoices match your filters. Clear search or filters to see all bills.
        </p>
      )}

      {/* Bills Grid */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-3 pb-10 pt-5 sm:grid-cols-2 sm:gap-8 sm:px-4 sm:pb-12 sm:pt-8 md:px-8 lg:grid-cols-3 xl:grid-cols-4">
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

      {displayBills.length > PER_PAGE && (
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 pb-10 sm:px-4 md:px-8">
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

        {receiptPreview && (
          <ReceiptPrintModal
            order={receiptPreview.order}
            cashierName={receiptPreview.cashierName}
            onClose={closeReceiptPreview}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
