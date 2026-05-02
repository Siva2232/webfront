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
  const { cashiers, addCashier } = useCashiers();
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

  const handleAddCashier = (name) => {
    const r = addCashier(name);
    if (!r.ok) toast.error(r.error || "Could not add cashier");
    else toast.success("Cashier added");
    return r;
  };

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
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-10 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin/dashboard")} className="p-3 -ml-3 rounded-2xl hover:bg-slate-100">
            <ChevronLeft size={28} />
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Split Bill</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">
              CUSTOMISE &amp; PRINT PARTIAL BILLS
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-2 flex items-center shadow-sm">
          <div className="flex-1 flex items-center gap-3 px-6">
            <Search size={20} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter Order Reference # (e.g. aec38903f7)"
              className="bg-transparent outline-none flex-1 text-lg placeholder-slate-400"
            />
            {searchQuery && (
              <button onClick={handleClearSearch} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-[1.75rem] font-black uppercase tracking-widest text-sm transition-all"
          >
            Search
          </button>
        </div>

        {/* Content Area */}
        {!searchedRef && (
          <div className="py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <Receipt size={64} className="mx-auto text-slate-200 mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Search an order to split bill</p>
          </div>
        )}

        {searchedRef && !foundBill && (
          <div className="py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <Search size={64} className="mx-auto text-slate-200 mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-widest">No order found for #{searchedRef}</p>
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
        onAddCashier={handleAddCashier}
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