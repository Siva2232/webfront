import React, { useEffect, useMemo, useState } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import { KitchenBillHeader } from "./kitchenBill/components/KitchenBillHeader";
import KitchenBillEmptyState from "./kitchenBill/components/KitchenBillEmptyState";
import KitchenBillCard from "./kitchenBill/components/KitchenBillCard";
import { statusColors } from "./kitchenBill/utils/statusColors";
import { printKitchenBillReceipt } from "./kitchenBill/utils/printKitchenBillReceipt";

export default function KitchenBill({ embedded = false }) {
  const { kitchenBills, fetchActiveKitchenBills, updateKitchenBillStatus, isLoading } = useOrders();
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    fetchActiveKitchenBills();
  }, []);

  const handlePrintSingle = (billId) => {
    const kb = kitchenBills.find((bill) => (bill._id || bill.id) === billId);
    printKitchenBillReceipt({ kb });
  };

  const sortedBills = [...kitchenBills].sort((a, b) => {
    if (a.status === "Served" && b.status !== "Served") return 1;
    if (a.status !== "Served" && b.status === "Served") return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filteredBills = useMemo(() => {
    if (!dateFilter) return sortedBills;
    return sortedBills.filter((kb) => {
      const d = kb.createdAt ? new Date(kb.createdAt) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}` === dateFilter;
    });
  }, [sortedBills, dateFilter]);

  useEffect(() => { setPage(1); }, [dateFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedBills = filteredBills.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  if ((!filteredBills || filteredBills.length === 0) && embedded) {
    return <KitchenBillEmptyState embedded />;
  }

  const recordCount = filteredBills?.length ?? 0;

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
      {!embedded && (
        <KitchenBillHeader
          isLoading={isLoading}
          recordCount={recordCount}
          dateFilter={dateFilter}
          onDateChange={setDateFilter}
          onClearFilter={() => setDateFilter("")}
          onRefresh={fetchActiveKitchenBills}
        />
      )}

      {(!filteredBills || filteredBills.length === 0) && !embedded ? (
        <KitchenBillEmptyState embedded={false} />
      ) : (
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 pb-12 pt-8 sm:grid-cols-2 md:px-8 lg:grid-cols-3 xl:grid-cols-4">
        {pagedBills.map((kb, index) => {
          const batchTotal = kb.batchTotal || kb.items?.reduce((sum, i) => sum + (i.price * i.qty), 0) || 0;
          const billTimestamp = kb.createdAt ? new Date(kb.createdAt) : new Date();
          const colors = statusColors[kb.status] || statusColors.Pending;

          return (
            <KitchenBillCard
              key={kb._id || index}
              kb={kb}
              colors={colors}
              batchTotal={batchTotal}
              billTimestamp={billTimestamp}
              onPrint={() => handlePrintSingle(kb._id || index)}
            />
          );
        })}
      </main>
      )}

      {!embedded && filteredBills.length > PER_PAGE && (
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
    </div>
  );
}