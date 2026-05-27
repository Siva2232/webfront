import React, { useState, useMemo, useCallback } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
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
import StickyPageHeader from "./components/StickyPageHeader";

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

export default function ManualBill() {
  const { bills, fetchBills, isLoading } = useOrders();
  const { cashiers, reload: reloadCashiers } = useCashiers();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchedRef, setSearchedRef] = useState("");
  const [foundBill, setFoundBill] = useState(null);
  const [customItems, setCustomItems] = useState([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);

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

  const closePrintModal = useCallback(() => {
    setPrintModalOpen(false);
    setSelectedCashier(null);
  }, []);

  const printNow = useCallback(
    (cashierName) => {
      if (!foundBill) return;
      if (!customItems.length) return toast.error("No items to print");
      printSplitReceipt({ order: foundBill, items: customItems, cashierName, toast });
    },
    [foundBill, customItems],
  );

  const openPrintModal = useCallback(async () => {
    if (!foundBill) return;
    if (!customItems.length) return toast.error("No items to print");

    const list = await reloadCashiers();
    const n = Array.isArray(list) ? list.length : 0;

    // Fewer than 2 POS cashiers: no modal — admin-only setup uses session name; one cashier uses their name
    if (n < 2) {
      const cashierName = n === 1 ? list[0].name : defaultCashierLabelFromSession();
      printNow(cashierName);
      return;
    }

    setSelectedCashier(null);
    setPrintModalOpen(true);
  }, [foundBill, customItems.length, reloadCashiers, printNow]);

  const handleConfirmPrint = useCallback(() => {
    if (!selectedCashier) return toast.error("Select cashier");
    if (!customItems.length) return toast.error("No items to print");

    const name =
      cashiers.find((c) => String(c.id) === String(selectedCashier))?.name ||
      "N/A";
    printNow(name);
    closePrintModal();
  }, [selectedCashier, customItems.length, cashiers, printNow, closePrintModal]);

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
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 font-sans text-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />
      <StickyPageHeader
        icon={Receipt}
        title="Split bill"
        subtitle="Customise & print partial bills"
        onBack={() => navigate("/admin/bill")}
        breadcrumbItems={[
          { label: "Order bill", to: "/admin/bill" },
          { label: "Split bill" },
        ]}
        rightAddon={
          <button
            type="button"
            onClick={fetchBills}
            disabled={isLoading}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-zinc-900/15 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {isLoading ? "Syncing" : "Refresh"}
          </button>
        }
      />

      <div className="mx-auto max-w-3xl space-y-6 px-3 pb-10 pt-6 sm:space-y-10 sm:px-10 sm:pt-10">

        {/* Search Bar */}
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm shadow-zinc-900/5 sm:flex-row sm:items-center sm:rounded-[2rem]">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-5 sm:py-0 lg:px-6">
            <Search size={18} className="shrink-0 text-zinc-400 sm:h-5 sm:w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Order ref # (e.g. aec38903)"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 sm:text-base lg:text-lg"
            />
            {searchQuery && (
              <button onClick={handleClearSearch} className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-600">
                <X size={18} className="sm:h-5 sm:w-5" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full shrink-0 rounded-xl bg-zinc-900 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-800 disabled:opacity-50 sm:w-auto sm:rounded-[1.75rem] sm:px-8 sm:py-4 sm:text-sm lg:px-10"
          >
            Search
          </button>
        </div>

        {/* Content Area */}
        {!searchedRef && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 py-14 text-center shadow-sm shadow-zinc-900/5 sm:rounded-[3rem] sm:py-20">
            <Receipt size={56} className="mx-auto mb-6 text-zinc-200" />
            <p className="text-sm font-black uppercase tracking-widest text-zinc-500">Search an order to split bill</p>
          </div>
        )}

        {searchedRef && !foundBill && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 py-14 text-center shadow-sm shadow-zinc-900/5 sm:rounded-[3rem] sm:py-20">
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
            onOpenPrint={openPrintModal}
          />
        )}
      </div>

      <SelectCashierModal
        open={printModalOpen}
        cashiers={cashiers}
        selectedCashier={selectedCashier}
        onChangeCashier={setSelectedCashier}
        onCancel={closePrintModal}
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