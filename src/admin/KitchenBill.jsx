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

  if (!filteredBills || filteredBills.length === 0) {
    return <KitchenBillEmptyState embedded={embedded} />;
  }

  return (
    <div
      className={`relative font-sans ${
        embedded ? "pb-8" : "min-h-full bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-10"
      }`}
    >
      {!embedded && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
          aria-hidden
        />
      )}
      {/* Header */}
      {!embedded && (
        <KitchenBillHeader
          isLoading={isLoading}
          recordCount={filteredBills.length}
          dateFilter={dateFilter}
          onDateChange={setDateFilter}
          onClearFilter={() => setDateFilter("")}
          onRefresh={fetchActiveKitchenBills}
        />
      )}

      {/* Main Grid - Changed to 4 cards per row on large screens */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 p-4 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredBills.map((kb, index) => {
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
    </div>
  );
}