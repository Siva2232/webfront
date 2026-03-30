import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Receipt,
  Search,
  Printer,
  Calendar,
  Star,
  CheckCircle,
  Wallet,
  User,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";
import { CASHIERS } from "../constants";

/* ─── helpers ─────────────────────────────────────────────── */

const isPaid = (s) =>
  ["paid", "succeeded", "success"].includes((s?.status || "").toLowerCase());

const computeStats = (items, sessions = []) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;
  return { subtotal, tax, grandTotal };
};

/* ─── print helper (split receipt) ────────────────────────── */

const printSplitReceipt = (order, items, cashierName = "N/A") => {
  const w = window.open("", "_blank");
  if (!w) { toast.error("Pop-up blocked – allow pop-ups to print"); return; }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const pad = (l, r, width = 32) => {
    const sp = width - l.length - r.length;
    return l + " ".repeat(sp > 0 ? sp : 1) + r;
  };

  const itemLine = (name, qty, price) => {
    const n = name.length > 18 ? name.substring(0, 18) : name;
    return n.padEnd(18) + qty.toString().padStart(4) + price.toFixed(2).padStart(10);
  };

  const itemsText = items
    .map((item) => {
      const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
      const base = item.price - addonsTotal;
      let line = itemLine(item.name, item.qty, base * item.qty);
      if (item.selectedPortion) line += "\n  Portion: " + item.selectedPortion;
      if (item.selectedAddons?.length) {
        item.selectedAddons.forEach((a) => {
          line += "\n" + ("  + " + a.name).padEnd(22) + ("Rs." + ((a.price || 0) * item.qty).toFixed(2)).padStart(10);
        });
        line += "\n  " + "-".repeat(28);
        line += "\n  " + "Item Total".padEnd(18) + ("Rs." + (item.price * item.qty).toFixed(2)).padStart(12);
      }
      return line;
    })
    .join("\n");

  const html = `<html><head><style>
@page{size:80mm auto;margin:0}
body{font-family:'Courier New',Courier,monospace;white-space:pre;font-size:13px;width:80mm;margin:0;padding:5mm;box-sizing:border-box}
.header{text-align:center;font-weight:bold;margin-bottom:2mm}
.line{border-bottom:1px dashed #000;margin:2mm 0}
.text-center{text-align:center}.text-right{text-align:right}.bold{font-weight:bold}
</style></head><body>
<div class="header">
MY CAFE
01 SKYLINE DRIVE, BUSINESS DISTRICT
+91 0000 000 000
GST: 18AABCT1234H1Z0
</div>
<div class="text-center bold">CUSTOM BILL (SPLIT)</div>
<div class="text-center">Cashier: ${cashierName}</div>
<div class="line"></div>

${pad("Order Ref", "#" + (order._id || "").slice(-6))}
${pad("Location", order.table === TAKEAWAY_TABLE ? "TAKEAWAY" : "TBL-" + order.table)}
${pad("Placed At", format(new Date(order.createdAt || order.billedAt || Date.now()), "dd/MM/yyyy  hh:mm a"))}

<div class="line"></div>
<div class="bold">Itemized Manifest</div>
<div class="line"></div>
${itemsText}

<div class="line"></div>
${pad("Subtotal", "Rs." + subtotal.toFixed(2))}
${pad("Tax (GST 5%)", "Rs." + tax.toFixed(2))}

<div class="line"></div>
<div class="bold">Total Due</div>
<div class="bold text-center">Rs.${total.toFixed(2)}</div>
<div class="line"></div>

<div class="text-center">Official Receipt</div>
<div class="text-center">THANK YOU</div>

<script>window.print();window.onafterprint=()=>window.close();</script>
</body></html>`;

  w.document.write(html);
  w.document.close();
};

/* ─── Main Component ──────────────────────────────────────── */

export default function ManualBill() {
  const { bills, fetchBills, isLoading } = useOrders();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchedRef, setSearchedRef] = useState("");           // what was last searched
  const [foundBill, setFoundBill] = useState(null);             // original bill from API
  const [customItems, setCustomItems] = useState([]);           // editable items list
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);

  // ensure bills are loaded
  useEffect(() => { fetchBills(); }, []);

  /* ─── search ─────────────────────────────────────────────── */
  const handleSearch = useCallback(() => {
    const q = searchQuery.trim().replace(/^#/, "");
    if (!q) { toast.error("Enter an order ref ID"); return; }
    setSearchedRef(q);

    // search through bills by _id, orderRef (full or last N chars)
    const match = (bills || []).find((b) => {
      const id = (b._id || b.id || "").toString();
      const ref = (b.orderRef || "").toString();
      // exact match on full ID or orderRef
      if (id === q || ref === q) return true;
      // match on last N chars (user types partial)
      if (q.length >= 4 && (id.endsWith(q) || ref.endsWith(q))) return true;
      // last 6 chars match
      if (id.slice(-6) === q || ref.slice(-6) === q) return true;
      return false;
    });

    if (match) {
      setFoundBill(match);
      setCustomItems((match.items || []).map((item, i) => ({ ...item, _idx: i })));
    } else {
      setFoundBill(null);
      setCustomItems([]);
      toast.error(`No order found for "#${q}". Try the full ID or last 6 characters.`);
    }
  }, [searchQuery, bills]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  /* ─── remove item ────────────────────────────────────────── */
  const removeItemFromList = useCallback((idx) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== idx));
    setPendingDeleteIndex(null);
    toast.success("Item removed from manual bill");
  }, []);

  const requestRemoveItem = useCallback((idx) => {
    setPendingDeleteIndex(idx);
  }, []);

  const cancelRemoveItem = useCallback(() => {
    setPendingDeleteIndex(null);
  }, []);

  /* ─── reset to original ─────────────────────────────────── */
  const resetItems = useCallback(() => {
    if (foundBill) {
      setCustomItems((foundBill.items || []).map((item, i) => ({ ...item, _idx: i })));
      toast.success("Items restored");
    }
  }, [foundBill]);

  /* ─── stats for current custom items ─────────────────────── */
  const stats = useMemo(() => computeStats(customItems), [customItems]);

  /* ─── print ──────────────────────────────────────────────── */
  const handleConfirmPrint = () => {
    if (!selectedCashier) return toast.error("Select cashier");
    if (!customItems.length) return toast.error("No items to print");
    const name = CASHIERS.find((c) => c.id === selectedCashier)?.name || "N/A";
    printSplitReceipt(foundBill, customItems, name);
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
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="top-0 z-50 bg-white border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/admin/dashboard")} className="p-2 -ml-2">
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Receipt size={22} className="text-indigo-600" />
            <h1 className="font-bold text-lg tracking-tight">Manual Bill</h1>
          </div>
          <div className="w-8" />
        </div>
        <p className="max-w-3xl mx-auto text-xs text-slate-500 mt-1 px-1">
          Search an order, remove items, and print a customised split bill
        </p>
      </header>

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto px-4 pt-5">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white border rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm shadow-sm">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter order ref ID (e.g. #aec38903f7)"
              className="bg-transparent outline-none flex-1 text-sm"
            />
            {searchQuery && (
              <button onClick={handleClearSearch} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-6">
        {/* No result message */}
        {searchedRef && !foundBill && (
          <div className="text-center py-16 text-slate-400">
            <Search size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-sm">No order found for &quot;#{searchedRef}&quot;. Try the full ID or last 6 characters.</p>
          </div>
        )}

        {/* Empty state */}
        {!searchedRef && (
          <div className="text-center py-16 text-slate-400">
            <Receipt size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-sm">Search an order ref to get started</p>
          </div>
        )}

        {/* Bill Found */}
        {foundBill && (
          <div className="space-y-5">
            {/* Bill Card */}
            <div className="bg-white rounded-3xl overflow-hidden border shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />

              <div className="p-5">
                {/* Header info */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-900 rounded-xl flex items-center justify-center">
                        <Star size={15} className="text-amber-400" fill="currentColor" />
                      </div>
                      <span className="font-bold text-lg tracking-tight">MyCafe</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      01 SKYLINE DRIVE, BUSINESS DISTRICT
                    </p>
                    <p className="text-[10px] text-slate-500">+91 0000 000 000</p>
                    <p className="text-[10px] text-slate-500">GST: 18AABCT1234H1Z0</p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">TYPE</div>
                    <div className="font-semibold text-sm">
                      {isDelivery ? "DELIVERY" : isTA ? "TAKEAWAY" : `TBL ${foundBill.table}`}
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-slate-700">Order Ref</span>
                    <span className="font-mono">#{(foundBill._id || foundBill.id || "").slice(-10)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-slate-700">Location</span>
                    <span>{isDelivery ? "DELIVERY" : isTA ? "TAKEAWAY" : `TBL-${foundBill.table}`}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={13} />
                    <span>
                      {format(new Date(foundBill.createdAt || foundBill.billedAt || Date.now()), "dd/MM/yyyy • hh:mm a")}
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed my-4" />

                {/* Itemized Manifest heading + Reset */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Itemized Manifest</h3>
                  {removedCount > 0 && (
                    <button
                      onClick={resetItems}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Reset ({removedCount} removed)
                    </button>
                  )}
                </div>

                {/* Items list */}
                <div className="space-y-0">
                  <AnimatePresence>
                    {customItems.map((item, idx) => (
                      <motion.div
                        key={`${item.name}-${item._idx}`}
                        initial={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{item.name}</span>
                          </div>
                          {item.selectedPortion && (
                            <p className="text-[10px] text-slate-500 mt-0.5">Portion: {item.selectedPortion}</p>
                          )}
                          {item.selectedAddons?.length > 0 && (
                            <div className="mt-0.5">
                              {item.selectedAddons.map((a, ai) => (
                                <p key={ai} className="text-[10px] text-slate-500">+ {a.name} (₹{a.price})</p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-slate-500">{item.qty} × ₹{item.price}</p>
                            <p className="font-semibold text-sm">₹{(item.price * item.qty).toLocaleString("en-IN")}</p>
                          </div>
                          <button
                            onClick={() => requestRemoveItem(idx)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition"
                            title="Remove from bill"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {customItems.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      All items removed.{" "}
                      <button onClick={resetItems} className="text-indigo-600 hover:underline">
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed my-4" />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{stats.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (GST 5%)</span>
                    <span>₹{stats.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium opacity-75">Total Due</span>
                    <span className="text-lg font-bold">₹{stats.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Payment sessions info */}
                {foundBill.paymentSessions?.length > 0 && (
                  <>
                    <div className="border-t border-dashed my-4" />
                    <h4 className="text-xs font-semibold text-slate-500 mb-2">Total Summary</h4>
                    <div className="space-y-1.5">
                      {foundBill.paymentSessions.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{(s.method || "cod").toUpperCase()}</span>
                          <div className="flex items-center gap-2">
                            {isPaid(s) ? (
                              <span className="text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle size={12} /> PAID
                              </span>
                            ) : (
                              <span className="text-orange-500 font-medium">⚠️ DUE</span>
                            )}
                            <span className="font-medium">₹{(s.amount || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => { if (!customItems.length) { toast.error("No items to print"); return; } setPrintModalOpen(true); }}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
                  >
                    <Printer size={16} /> Print Custom Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Print Modal */}
      <AnimatePresence>
        {printModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center p-4"
            onClick={() => setPrintModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-xl"
            >
              <div className="text-center">
                <User size={40} className="mx-auto text-indigo-600 mb-4" />
                <h3 className="font-semibold mb-4">Select Cashier</h3>
                <select
                  value={selectedCashier || ""}
                  onChange={(e) => setSelectedCashier(Number(e.target.value))}
                  className="w-full p-3 border rounded-2xl mb-4 text-sm"
                >
                  <option value="">Choose Cashier</option>
                  {CASHIERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="text-xs text-slate-500 mb-6">
                  {customItems.length} item{customItems.length !== 1 ? "s" : ""} • ₹{stats.grandTotal.toFixed(2)}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setPrintModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-2xl">Cancel</button>
                  <button
                    onClick={handleConfirmPrint}
                    disabled={!selectedCashier}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl disabled:opacity-50"
                  >
                    Print
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteIndex != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center p-4"
            onClick={cancelRemoveItem}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="text-lg font-semibold mb-3">Confirm remove item?</h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to remove <strong>{customItems[pendingDeleteIndex]?.name}</strong> from this bill?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelRemoveItem}
                  className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeItemFromList(pendingDeleteIndex)}
                  className="flex-1 py-2 rounded-lg bg-rose-600 text-white"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
