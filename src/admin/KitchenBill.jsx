import React, { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useOrders } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import { AnimatePresence } from "framer-motion";
import { KitchenBillHeader } from "./kitchenBill/components/KitchenBillHeader";
import KitchenBillEmptyState from "./kitchenBill/components/KitchenBillEmptyState";
import KitchenBillCard from "./kitchenBill/components/KitchenBillCard";
import { KitchenReceiptPrintModal } from "./kitchenBill/components/KitchenReceiptPrintModal";
import { statusColors } from "./kitchenBill/utils/statusColors";
import { isTakeawayOrder } from "./kitchenBill/utils/isTakeawayOrder";
import {
  getKitchenPrintMode,
  setKitchenPrintMode,
  KITCHEN_PRINT_MODE_CHANGED_EVENT,
} from "./kitchenBill/kitchenPrintMode";
import { getCurrentRestaurantId } from "../utils/tenantCache";

export default function KitchenBill({ embedded = false }) {
  const { kitchenBills, fetchActiveKitchenBills, isLoading } = useOrders();
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || getCurrentRestaurantId();
  const [dateFilter, setDateFilter] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [takeawayOnly, setTakeawayOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [printMode, setPrintModeState] = useState(() => getKitchenPrintMode());
  const [printPreviewKb, setPrintPreviewKb] = useState(null);
  const PER_PAGE = 15;

  useEffect(() => {
    setPrintModeState(getKitchenPrintMode(restaurantId));

    const syncPrintMode = () => {
      setPrintModeState(getKitchenPrintMode(restaurantId));
    };

    window.addEventListener(KITCHEN_PRINT_MODE_CHANGED_EVENT, syncPrintMode);
    window.addEventListener("storage", syncPrintMode);
    return () => {
      window.removeEventListener(KITCHEN_PRINT_MODE_CHANGED_EVENT, syncPrintMode);
      window.removeEventListener("storage", syncPrintMode);
    };
  }, [restaurantId]);

  const handlePrintModeChange = useCallback(
    (mode) => {
      const saved = setKitchenPrintMode(mode, restaurantId);
      if (saved) {
        setPrintModeState(mode);
        toast.success(mode === "auto" ? "Auto print enabled" : "Manual print enabled");
        return;
      }
      toast.error("Could not save print mode. Try again.");
    },
    [restaurantId]
  );

  const openPrintPreview = useCallback((kb) => {
    if (!kb) return;
    setPrintPreviewKb(kb);
  }, []);

  const sortedBills = [...kitchenBills].sort((a, b) => {
    if (a.status === "Served" && b.status !== "Served") return 1;
    if (a.status !== "Served" && b.status === "Served") return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filteredBills = useMemo(() => {
    let list = sortedBills;
    if (takeawayOnly) {
      list = list.filter((kb) => isTakeawayOrder(kb));
    }
    if (dateFilter) {
      list = list.filter((kb) => {
        const d = kb.createdAt ? new Date(kb.createdAt) : null;
        if (!d || Number.isNaN(d.getTime())) return false;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}` === dateFilter;
      });
    }
    const q = customerSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (kb) =>
          String(kb.tokenNumber ?? "").includes(q) ||
          String(kb.customerName ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [sortedBills, dateFilter, takeawayOnly, customerSearch]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, takeawayOnly, customerSearch]);
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedBills = filteredBills.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const recordCount = filteredBills?.length ?? 0;

  const headerEl = (
    <KitchenBillHeader
      compact={embedded}
      isLoading={isLoading}
      recordCount={recordCount}
      dateFilter={dateFilter}
      onDateChange={setDateFilter}
      onClearFilter={() => setDateFilter("")}
      onRefresh={fetchActiveKitchenBills}
      customerSearch={customerSearch}
      onCustomerSearchChange={setCustomerSearch}
      takeawayOnly={takeawayOnly}
      onTakeawayOnlyChange={setTakeawayOnly}
      printMode={printMode}
      onPrintModeChange={handlePrintModeChange}
    />
  );

  if ((!filteredBills || filteredBills.length === 0) && embedded) {
    return (
      <div className="relative pb-8 font-sans text-zinc-900">
        {headerEl}
        <KitchenBillEmptyState embedded />
      </div>
    );
  }

  return (
    <div
      className={`relative font-sans text-zinc-900 ${
        embedded ? "pb-8" : "min-h-full bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-12"
      }`}
    >
      {!embedded && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
          aria-hidden
        />
      )}
      {headerEl}

      {(!filteredBills || filteredBills.length === 0) && !embedded ? (
        <KitchenBillEmptyState embedded={false} />
      ) : (
        <main
          className={`mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 ${
            embedded ? "px-3 pb-8 pt-4 sm:px-4 md:px-6" : "px-3 pb-12 pt-6 sm:px-4 sm:pt-8 md:px-8"
          }`}
        >
          {pagedBills.map((kb, index) => {
            const batchTotal =
              kb.batchTotal ||
              kb.items?.reduce((sum, i) => sum + i.price * i.qty, 0) ||
              0;
            const billTimestamp = kb.createdAt ? new Date(kb.createdAt) : new Date();
            const colors = statusColors[kb.status] || statusColors.Pending;

            return (
              <KitchenBillCard
                key={kb._id || index}
                kb={kb}
                colors={colors}
                batchTotal={batchTotal}
                billTimestamp={billTimestamp}
                onPrint={() => openPrintPreview(kb)}
              />
            );
          })}
        </main>
      )}

      {!embedded && filteredBills.length > PER_PAGE && (
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

      <AnimatePresence>
        {printPreviewKb && (
          <KitchenReceiptPrintModal
            kb={printPreviewKb}
            onClose={() => setPrintPreviewKb(null)}
            autoPrintOnOpen={false}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
