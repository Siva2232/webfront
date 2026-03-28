import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Search,
  Printer,
  Trash2,
  RotateCcw,
  Receipt,
  MapPin,
  Hash,
  Package,
  CheckCircle,
  X,
  
} from "lucide-react";
import { CASHIERS, RESTAURANT_INFO } from "../constants";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";

/* ─── print helper (customised items only) ───────────────── */

const printCustomReceipt = (order, customItems, cashierName = "N/A") => {
  const w = window.open("", "_blank");
  if (!w) { toast.error("Pop-up blocked – allow pop-ups to print"); return; }

  const subtotal = customItems.reduce((s, i) => s + i.price * i.qty, 0);
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

  const itemsText = customItems
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
${RESTAURANT_INFO.name}
${RESTAURANT_INFO.address}
+91 ${RESTAURANT_INFO.phone}
GST: ${RESTAURANT_INFO.gst}
</div>
<div class="text-center bold">BILL</div>
<div class="text-center">Cashier: ${cashierName}</div>
<div class="line"></div>

${pad("Order Ref", "#" + (order.orderRef || order._id || "").slice(-6))}
${pad("Location", order.table === TAKEAWAY_TABLE ? "TAKEAWAY" : "TBL-" + order.table)}
${pad("Placed At", format(new Date(order.createdAt || order.billedAt || Date.now()), "dd/MM/yyyy • hh:mm a"))}

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

/* ─── component ───────────────────────────────────────────── */

export default function ManualBill() {
  const { bills, orders, fetchBills, fetchOrders, isLoading } = useOrders();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [foundOrder, setFoundOrder] = useState(null);
  const [customItems, setCustomItems] = useState([]);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [removeCandidate, setRemoveCandidate] = useState(null);
  const [notFound, setNotFound] = useState(false);

  /* fetch on mount so search works even if user lands here directly */
  useEffect(() => {
    fetchBills();
    fetchOrders();
  }, []);

  /* combine bills + live orders into one searchable pool */
  const allRecords = useMemo(() => {
    const seen = new Set();
    const result = [];
    [...(bills || []), ...(orders || [])].forEach((r) => {
      const key = r._id || r.id;
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(r);
    });
    return result;
  }, [bills, orders]);

  /* search handler */
  const handleSearch = useCallback(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q) { toast.error("Enter an order reference number"); return; }

    const match = allRecords.find((r) => {
      // check all possible ID / ref fields
      const candidates = [
        r._id,
        r.id,
        r.orderRef,
      ].filter(Boolean).map((v) => v.toString().toLowerCase());

      return candidates.some(
        (c) => c === q || c.slice(-6) === q || c.slice(-10) === q || c.includes(q)
      );
    });

    if (match) {
      setFoundOrder(match);
      setCustomItems((match.items || []).map((item, idx) => ({ ...item, _uid: idx })));
      setNotFound(false);
    } else {
      setFoundOrder(null);
      setCustomItems([]);
      setNotFound(true);
    }
  }, [query, allRecords]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleResetSearch = () => {
    setQuery("");
    setFoundOrder(null);
    setCustomItems([]);
    setNotFound(false);
  };

  const openRemoveModal = useCallback((uid) => {
    const item = customItems.find((i) => i._uid === uid);
    if (!item) return;
    setRemoveCandidate(item);
  }, [customItems]);

  const handleRemoveItem = useCallback(() => {
    if (!removeCandidate) return;
    setCustomItems((prev) => {
      const next = prev.filter((i) => i._uid !== removeCandidate._uid);
      if (next.length === 0) toast("All items removed — reset to restore", { icon: "⚠️" });
      return next;
    });
    setRemoveCandidate(null);
  }, [removeCandidate]);

  const handleCancelRemove = () => setRemoveCandidate(null);

  /* restore original items */
  const handleReset = useCallback(() => {
    if (!foundOrder) return;
    setCustomItems((foundOrder.items || []).map((item, idx) => ({ ...item, _uid: idx })));
    toast.success("Items restored");
  }, [foundOrder]);

  /* open cashier selector before print */
  const handlePrintClick = () => {
    if (customItems.length === 0) { toast.error("No items to print"); return; }
    setShowCashierModal(true);
  };

  const handleConfirmPrint = useCallback(() => {
    if (!selectedCashier) { toast.error("Select a cashier"); return; }
    const name = CASHIERS.find((c) => c.id === selectedCashier)?.name || "N/A";
    printCustomReceipt(foundOrder, customItems, name);
    setShowCashierModal(false);
    setSelectedCashier(null);
  }, [selectedCashier, foundOrder, customItems]);

  /* derived totals */
  const subtotal = useMemo(() =>
    customItems.reduce((s, i) => s + i.price * i.qty, 0), [customItems]);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const removedCount = (foundOrder?.items?.length || 0) - customItems.length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Manual Bill</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search an order, remove items, and print a customised split bill
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Hash
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setNotFound(false);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter order ref  e.g. abc123 or last 6 digits"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow transition"
          >
            <Search size={16} /> {isLoading ? "Loading..." : "Search"}
          </button>
          <button
            onClick={handleResetSearch}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition"
            disabled={!query && !foundOrder}
          >
            Reset
          </button>
        </div>

        {/* Record count hint */}
        {!isLoading && allRecords.length > 0 && !foundOrder && !notFound && (
          <p className="mt-2 text-xs text-slate-400 text-center">
            {allRecords.length} record{allRecords.length !== 1 ? "s" : ""} loaded — search by order ref ID
          </p>
        )}
        {isLoading && (
          <p className="mt-2 text-xs text-indigo-500 text-center font-semibold">Fetching orders &amp; bills...</p>
        )}

        {/* Not found */}
        {notFound && (
          <p className="mt-3 text-sm text-rose-500 font-semibold text-center">
            No order found for &quot;{query}&quot;. Try the full ID or last 6 characters.
          </p>
        )}
      </div>

      {/* Bill Builder */}
      {foundOrder && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-2xl mx-auto"
        >
          {/* Order meta row */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Receipt size={18} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Order Ref</p>
                <p className="text-base font-black text-slate-900">
                  #{(foundOrder.orderRef || foundOrder._id || "").slice(-6).toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
              <MapPin size={14} className="text-slate-400" />
              {foundOrder.table === TAKEAWAY_TABLE || !foundOrder.table
                ? "Takeaway"
                : foundOrder.table === DELIVERY_TABLE
                ? "Delivery"
                : `Table ${foundOrder.table}`}
            </div>
            <div className="text-sm text-slate-500">
              {foundOrder.createdAt || foundOrder.billedAt
                ? format(new Date(foundOrder.createdAt || foundOrder.billedAt), "dd MMM yyyy • hh:mm a")
                : "—"}
            </div>
            {removedCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                {removedCount} item{removedCount > 1 ? "s" : ""} removed
              </span>
            )}
          </div>

          {/* Items manifest */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-slate-400" />
                <span className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Itemized Manifest
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {customItems.length} / {foundOrder.items?.length || 0} items
              </span>
            </div>

            {customItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                All items removed.{" "}
                <button
                  onClick={handleReset}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Restore
                </button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {customItems.map((item) => {
                  const addonsTotal =
                    item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
                  const basePrice = item.price - addonsTotal;
                  return (
                    <motion.div
                      key={item._uid}
                      initial={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Image */}
                      <img
                        src={item.image || "https://via.placeholder.com/48?text=No+Img"}
                        onError={(e) => { e.target.src = "https://via.placeholder.com/48?text=No+Img"; }}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                      />

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        {item.selectedPortion && (
                          <p className="text-xs text-slate-400">Portion: {item.selectedPortion}</p>
                        )}
                        {item.selectedAddons?.length > 0 && (
                          <p className="text-xs text-slate-400">
                            + {item.selectedAddons.map((a) => a.name).join(", ")}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">
                          ₹{basePrice.toFixed(2)} × {item.qty}
                          {addonsTotal > 0 && (
                            <span className="ml-1 text-indigo-500">
                              +₹{(addonsTotal * item.qty).toFixed(2)} addons
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Line total */}
                      <p className="text-sm font-black text-slate-900 w-20 text-right shrink-0">
                        ₹{(item.price * item.qty).toFixed(2)}
                      </p>

                      {/* Remove */}
                      <button
                        onClick={() => openRemoveModal(item._uid)}
                        className="p-2 rounded-xl hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors shrink-0"
                        title="Remove from this bill"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Totals & actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax (GST 5%)</span>
                <span className="font-semibold">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
              >
                <RotateCcw size={15} /> Reset Items
              </button>
              <button
                onClick={handlePrintClick}
                disabled={customItems.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow transition"
              >
                <Printer size={15} /> Print Custom Bill
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty state – no search yet */}
      {!foundOrder && !notFound && (
        <div className="max-w-xl mx-auto mt-16 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Receipt size={36} className="text-indigo-400" />
          </div>
          <p className="text-slate-700 font-bold text-lg mb-1">Search an Order</p>
          <p className="text-slate-400 text-sm">
            Enter the order reference number above to load the bill. Then remove items to
            customise and print a split bill for each customer.
          </p>
        </div>
      )}

      {/* Cashier selection modal */}
      <AnimatePresence>
        {showCashierModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCashierModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-900">Select Cashier</h3>
                <button
                  onClick={() => setShowCashierModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                {CASHIERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCashier(c.id)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-bold border transition ${
                      selectedCashier === c.id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <button
                onClick={handleConfirmPrint}
                disabled={!selectedCashier}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow transition"
              >
                <Printer size={15} /> Print Now
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove item confirmation modal */}
      <AnimatePresence>
        {removeCandidate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCancelRemove}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="mb-4">
                <h3 className="text-lg font-black text-slate-900">Confirm remove item</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to remove <strong>{removeCandidate.name}</strong> from this custom bill?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelRemove}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveItem}
                  className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition"
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
