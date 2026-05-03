import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  ChevronLeft,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";
import { useCashiers } from "../hooks/useCashiers";
import { computeStats } from "./manualBill/utils";
import { printSplitReceipt } from "./manualBill/printSplitReceipt";
import BillDetailsCard from "./manualBill/components/BillDetailsCard";
import SelectCashierModal from "./manualBill/components/SelectCashierModal";
import ConfirmRemoveItemModal from "./manualBill/components/ConfirmRemoveItemModal";

export default function ManualBill() {
  const { bills, fetchBills, isLoading } = useOrders();
  const { cashiers } = useCashiers();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchedRef, setSearchedRef] = useState("");
  const [foundBill, setFoundBill] = useState(null);
  const [customItems, setCustomItems] = useState([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim().replace(/^#/, "");
    if (!q) return toast.error("Enter an order ref ID");

    setSearchedRef(q);

    const match = (bills || []).find((b) => {
      const id = (b._id || b.id || "").toString();
      const ref = (b.orderRef || "").toString();
      if (id === q || ref === q) return true;
      if (q.length >= 4 && (id.endsWith(q) || ref.endsWith(q))) return true;
      if (id.slice(-6) === q || ref.slice(-6) === q) return true;
      return false;
    });

    if (match) {
      setFoundBill(match);
      setCustomItems((match.items || []).map((item, i) => ({ ...item, _idx: i })));
    } else {
      setFoundBill(null);
      setCustomItems([]);
      toast.error(`No order found for "#${q}"`);
    }
  }, [searchQuery, bills]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const removeItemFromList = useCallback((idx) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== idx));
    setPendingDeleteIndex(null);
    toast.success("Item removed");
  }, []);

  const requestRemoveItem = (idx) => setPendingDeleteIndex(idx);
  const cancelRemoveItem = () => setPendingDeleteIndex(null);

  const resetItems = useCallback(() => {
    if (foundBill) {
      setCustomItems((foundBill.items || []).map((item, i) => ({ ...item, _idx: i })));
      toast.success("Items restored to original");
    }
  }, [foundBill]);

  const stats = useMemo(() => computeStats(customItems), [customItems]);

  const handleConfirmPrint = () => {
    if (!selectedCashier) return toast.error("Select cashier");
    if (!customItems.length) return toast.error("No items to print");

    const name =
      cashiers.find((c) => String(c.id) === String(selectedCashier))?.name ||
      "N/A";
    printSplitReceipt({ order: foundBill, items: customItems, cashierName: name, toast });
    setPrintModalOpen(false);
    setSelectedCashier(null);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchedRef("");
    setFoundBill(null);
    setCustomItems([]);
  };

  const isTA = foundBill && (foundBill.table === TAKEAWAY_TABLE || !foundBill.table);
  const isDelivery = foundBill && foundBill.table === DELIVERY_TABLE;
  const removedCount = foundBill ? (foundBill.items?.length || 0) - customItems.length : 0;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 p-4 font-sans text-zinc-900 sm:p-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />
      <div className="mx-auto max-w-3xl space-y-10">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="-ml-3 rounded-2xl p-3 text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <ChevronLeft size={28} />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm shadow-zinc-900/20">
              <Receipt size={26} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Billing</p>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-zinc-900 md:text-4xl">
                Split bill
              </h1>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                Customise &amp; print partial bills
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center rounded-[2rem] border border-zinc-200 bg-white p-2 shadow-sm shadow-zinc-900/5">
          <div className="flex flex-1 items-center gap-3 px-5 sm:px-6">
            <Search size={20} className="shrink-0 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter order reference # (e.g. aec38903f7)"
              className="flex-1 bg-transparent text-base outline-none placeholder:text-zinc-400 sm:text-lg"
            />
            {searchQuery && (
              <button onClick={handleClearSearch} className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-600">
                <X size={20} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="rounded-[1.75rem] bg-zinc-900 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-800 disabled:opacity-50 sm:px-10"
          >
            Search
          </button>
        </div>

        {/* Content Area */}
        {!searchedRef && (
          <div className="rounded-[3rem] border border-dashed border-zinc-200 bg-white/80 py-20 text-center shadow-sm shadow-zinc-900/5">
            <Receipt size={56} className="mx-auto mb-6 text-zinc-200" />
            <p className="text-sm font-black uppercase tracking-widest text-zinc-500">Search an order to split bill</p>
          </div>
        )}

        {searchedRef && !foundBill && (
          <div className="rounded-[3rem] border border-dashed border-zinc-200 bg-white/80 py-20 text-center shadow-sm shadow-zinc-900/5">
            <Search size={56} className="mx-auto mb-6 text-zinc-200" />
            <p className="font-black uppercase tracking-widest text-zinc-500">No order found for #{searchedRef}</p>
          </div>
        )}

        {foundBill && (
          <BillDetailsCard
            foundBill={foundBill}
            customItems={customItems}
            removedCount={removedCount}
            stats={stats}
            onResetItems={resetItems}
            onRequestRemoveItem={requestRemoveItem}
            onOpenPrint={() => setPrintModalOpen(true)}
          />
        )}
      </div>

      <SelectCashierModal
        open={printModalOpen}
        cashiers={cashiers}
        selectedCashier={selectedCashier}
        onChangeCashier={setSelectedCashier}
        onCancel={() => setPrintModalOpen(false)}
        onConfirm={handleConfirmPrint}
      />

      <ConfirmRemoveItemModal
        pendingIndex={pendingDeleteIndex}
        itemName={customItems[pendingDeleteIndex]?.name}
        onCancel={cancelRemoveItem}
        onConfirm={() => removeItemFromList(pendingDeleteIndex)}
      />
    </div>
  );
}