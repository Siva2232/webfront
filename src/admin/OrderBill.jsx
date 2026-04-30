import React, { useEffect, useState, useCallback } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import accApi from "../api/accApi";
import { getCurrentRestaurantId, tenantKey } from "../utils/tenantCache";
import { AnimatePresence } from "framer-motion";
import { Receipt, RefreshCw } from "lucide-react";
import { CASHIERS } from "../constants";
import { BillCard } from "./orderBill/components/BillCard";
import { MarkPaidModal } from "./orderBill/components/MarkPaidModal";
import { PrintCashierModal } from "./orderBill/components/PrintCashierModal";
import { CloseBillModal } from "./orderBill/components/CloseBillModal";
import { OrderBillHeader } from "./orderBill/components/OrderBillHeader";
import { printReceipt } from "./orderBill/receiptPrint";
import { useFilteredBills } from "./orderBill/hooks/useFilteredBills";

/* ─── component ───────────────────────────────────────────── */

export default function OrderBill() {
  const { bills, fetchBills, markBillPaid, closeBill, isLoading, billsReady } =
    useOrders();
  const navigate = useNavigate();

  const [closedBillIds, setClosedBillIds] = useState(new Set());
  const [paidBillIds, setPaidBillIds] = useState(new Set());
  const [closeBillModal, setCloseBillModal] = useState(null); // { order }
  const [markPaidModal, setMarkPaidModal] = useState(null);
  const [paymentData, setPaymentData] = useState({ cash: 0, bank: 0, discount: 0, balance: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printModalOrder, setPrintModalOrder] = useState(null);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [dateFilter, setDateFilter] = useState(""); // "" = all
  const [displayLimit] = useState(20);

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

  /* print */
  const handleConfirmPrint = useCallback(() => {
    if (!printModalOrder || !selectedCashier) {
      toast.error("Please select a cashier");
      return;
    }
    const name = CASHIERS.find((c) => c.id === selectedCashier)?.name || "N/A";
    printReceipt(printModalOrder, name);
    setPrintModalOrder(null);
    setSelectedCashier(null);
  }, [printModalOrder, selectedCashier]);

  /* ─── empty state ────────────────────────────────────────── */
  if (!uniqueBills.length && isLoading && !billsReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <RefreshCw size={28} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (!uniqueBills.length && billsReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-[#F4F4F5]">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
          <Receipt size={32} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tighter uppercase">No Records</h2>
        <p className="text-slate-500 text-xs mb-8 uppercase tracking-widest font-bold">Clear of active invoices</p>
        <div className="flex gap-4">
          <button onClick={handleRefresh} className="text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-full uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95">
            <RefreshCw size={14} /> Refresh Bills
          </button>
          <button onClick={handleGoBack} className="text-[10px] font-black text-indigo-600 border-b-2 border-indigo-600 pb-1 uppercase tracking-widest">
            {dateFilter ? "Clear Filter" : "Go Back"}
          </button>
        </div>
      </div>
    );
  }

  /* ─── main render ────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-mono relative">
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
              onPrint={setPrintModalOrder}
              onClose={handleCloseBill}
              onMarkPaid={setMarkPaidModal}
            />
          );
        })}
      </main>

      {/* Modals */}
      <AnimatePresence>
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
          cashiers={CASHIERS}
          onCancel={() => setPrintModalOrder(null)}
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
