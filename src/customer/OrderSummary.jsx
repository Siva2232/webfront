import { useOrders } from "../context/OrderContext";
import { TAKEAWAY_TABLE } from "../context/CartContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import OrderProgress from "../components/OrderProgress";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { AnimatePresence } from "framer-motion";
import API from "../api/axios";
import { getCurrentRestaurantId, tenantKey } from "../utils/tenantCache";
import { 
  RotateCcw, 
  Timer, 
  Receipt, 
  Sparkles, 
  ArrowRight,
  BellRing,
  AlertCircle,
  Package,
  CreditCard,
  CheckCircle,
  Wallet,
  X,
  Ticket
} from "lucide-react";

export default function OrderSummary() {
  const { orders, fetchOrders, fetchTableOrders, updateOrderStatus } = useOrders();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isClosingBill, setIsClosingBill] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [showTokenPopup, setShowTokenPopup] = useState(true);
  const cheerSoundRef = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3"));

  /** Takeaway queue orders only (`TAKEAWAY` sentinel). Never treat missing table as takeaway — keeps dine-in separate. */
  const isTakeawayTableOrder = (o) => o?.table === TAKEAWAY_TABLE;

  // Get current table & mode from URL
  const currentTable = searchParams.get("table")?.trim()?.replace(/^0+/, "") || null;
  const mode = searchParams.get("mode");

  // Fetch orders for this table via public endpoint (no auth token needed).
  // Falls back to fetchOrders (admin) if no table context is available.
  const fetchCurrentOrders = () => {
    const table = currentTable || (mode === "takeaway" ? TAKEAWAY_TABLE : null);
    if (table) {
      fetchTableOrders(table);
    } else {
      fetchOrders();
    }
  };

  const handleRequestBill = async () => {
    const tableNum = currentTable || (mode === "takeaway" ? TAKEAWAY_TABLE : "TAKEAWAY");
    if (!order?._id || isRequestingBill || order.isBillRequested) return;
    setIsRequestingBill(true);
    try {
      // 1. Send the notification to the admin dashboard
      await API.post("/notifications", {
        table: tableNum,
        type: "BillRequested",
        message: `${tableNum === "TAKEAWAY" ? "Takeaway Order" : `Table ${tableNum}`} has requested their bill.`
      });

      // 2. Update the order object in the DB to mark bill as requested
      // This will reset to false when they order more food
      await API.put(`/orders/${order._id}/status`, { isBillRequested: true });
      
      toast.success(tableNum === "TAKEAWAY" ? "Bill requested! Staff will assist you shortly." : "Bill requested! Waiter is arriving.");
    } catch (err) {
      console.error("bill request error", err);
      toast.error("Failed to request bill");
    } finally {
      setIsRequestingBill(false);
    }
  };

  // fetch orders on mount only — optimistic updates + sockets handle the rest
  useEffect(() => {
    fetchCurrentOrders();
  }, [currentTable, mode]);

  // Background refresh as a safety net (30s interval)
  // real-time updates are handled by sockets + optimistic state in OrderContext
  useEffect(() => {
    const interval = setInterval(fetchCurrentOrders, 30000);
    return () => clearInterval(interval);
  }, [currentTable, mode]);

  // helper to generate a menu URL that preserves takeaway mode when needed
  const menuLink = (() => {
    const params = new URLSearchParams();
    if (currentTable) params.set("table", currentTable);
    if (mode === "takeaway" || currentTable === TAKEAWAY_TABLE) {
      params.set("mode", "takeaway");
    }
    const qs = params.toString();
    return qs ? `/menu?${qs}` : "/menu";
  })();

  // simplified back link that preserves current table/mode to avoid losing
  // the Menu header UI (takeaway/dine-in controls) after returning.
  const backLink = (() => {
    const params = new URLSearchParams();
    if (mode === "takeaway") {
      params.set("mode", "takeaway");
    } else if (currentTable) {
      params.set("table", currentTable);
    }
    const qs = params.toString();
    return `/menu${qs ? `?${qs}` : ""}`;
  })();

  // Takeaway view: only orders with table === TAKEAWAY_TABLE.
  // Dine-in view: only orders for that exact table (never mix in takeaway rows).
  const tableOrders =
    mode === "takeaway"
      ? orders.filter((o) => o.status !== "Closed" && isTakeawayTableOrder(o))
      : currentTable
        ? orders.filter(
            (o) =>
              o.status !== "Closed" &&
              String(o.table) === String(currentTable) &&
              o.table !== TAKEAWAY_TABLE
          )
        : [];

  // Get the most recent order for this table (including Served; only Closed is hidden)
  const order = tableOrders.length > 0 
    ? tableOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;

  useEffect(() => {
    if (order?.status === "Served") {
      cheerSoundRef.current.play().catch(err => console.log("Interaction needed for sound"));

      const duration = 3 * 1000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6366f1', '#10b981']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6366f1', '#10b981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, [order?.status]);

  // New takeaway order → show token popup again
  useEffect(() => {
    if (order && isTakeawayTableOrder(order) && order.tokenNumber != null && order.tokenNumber !== "") {
      setShowTokenPopup(true);
    }
  }, [order?._id]);

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-[#F8FAFC]">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-8"
        >
          <Receipt size={40} className="text-slate-300" />
        </motion.div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
          NO ACTIVE ORDER
        </h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[300px]">
          {mode === "takeaway"
            ? "No recent takeaway orders found."
            : currentTable 
              ? `We couldn't find any recent orders for Table ${currentTable}.`
              : "No table selected or no recent orders found."}
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Link 
            to={menuLink}
            className="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all"
          >
            Browse Menu
          </Link>
          {!currentTable && (
            <p className="text-slate-500 text-xs">
              Scan the QR code on your table to continue
            </p>
          )}
        </div>
      </div>
    );
  }

  const subtotal = order.items?.reduce((sum, i) => sum + (i.price * i.qty), 0) || 0;
  const cgst = order.billDetails?.cgst || subtotal * 0.025;
  const sgst = order.billDetails?.sgst || subtotal * 0.025;
  const grandTotal = order.billDetails?.grandTotal || (subtotal + cgst + sgst);

  const handleCloseBill = async () => {
    if (!order?._id || isClosingBill) return;
    setIsClosingBill(true);
    try {
      await updateOrderStatus(order._id, "Closed");
      toast.success("Bill closed and table released");

      // Reset chooser flow so next time same table sees the choose-mode flow again
      const _rid = getCurrentRestaurantId();
      if (currentTable) {
        localStorage.removeItem(tenantKey(`tableModeChosen_${currentTable}`, _rid));
      }
      localStorage.removeItem(tenantKey(`tableModeChosen_${TAKEAWAY_TABLE}`, _rid));

      // Explicitly clear the current order from view by navigating or local state
      // fetchOrders() will eventually sync, but navigation removes the UI immediateley
      navigate(backLink);
    } catch (err) {
      console.error("close bill error", err);
      toast.error("Failed to close bill");
    } finally {
      setIsClosingBill(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans"
      onClick={() => cheerSoundRef.current.load()} // Unlocks audio on first user tap
    >
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 px-4 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <div className="flex min-w-0 flex-1 justify-start">
            <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />
          </div>
          <div className="min-w-0 shrink text-center">
            <h1 className="mb-0.5 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">
              <Sparkles size={10} className="shrink-0" aria-hidden />
              Live Tracking
            </h1>
            <p className="text-xs font-bold leading-tight text-slate-900 sm:text-sm">Order Summary</p>
          </div>
          <div className="flex min-w-0 flex-1 justify-end">
            <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-3 pb-6 pt-3 sm:px-4 sm:pb-8 sm:pt-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)] sm:rounded-2xl"
        >
          {/* ID & Table Header */}
          <div className="relative overflow-hidden bg-slate-900 p-3 text-white sm:p-5">
            <div className="absolute right-0 top-0 rotate-12 scale-125 p-4 opacity-[0.08] sm:p-8">
              <Receipt size={72} strokeWidth={1} className="max-w-none sm:h-[100px] sm:w-[100px]" />
            </div>
            
            <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <span className="mb-1 inline-block rounded-md bg-white/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-slate-300 sm:mb-2 sm:text-[8px]">
                  ORDER REF
                </span>
                <p className="break-all font-mono text-sm font-bold uppercase tracking-tighter sm:text-base">
                  {(order._id || order.id || "").slice(-10)}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-slate-400">
                  <Timer size={11} className="shrink-0 text-indigo-400" />
                  <span className="text-[8px] font-bold uppercase tracking-wider sm:text-[9px]">
                    {format(new Date(order.createdAt), "h:mm a • MMM d")}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 sm:text-[10px]">
                  {order.table === TAKEAWAY_TABLE ? "Order" : "Table"}
                </span>
                <p className={`font-black leading-none tracking-tighter ${
                  order.table === TAKEAWAY_TABLE
                    ? "text-3xl sm:text-5xl"
                    : "text-4xl sm:text-5xl"
                }`}>
                  {order.table === TAKEAWAY_TABLE ? "Takeaway" : `#${order.table}`}
                </p>
                {(order.paymentMethod === 'online' || order.paymentStatus === 'paid') && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider text-white sm:mt-1.5 sm:px-2.5 sm:text-[8px]">
                    <CheckCircle size={10} /> PAID
                  </span>
                )}
              </div>
            </div>

            {/* Pickup token — takeaway only; stays on card (popup also shown below) */}
            {isTakeawayTableOrder(order) &&
              order.tokenNumber != null &&
              String(order.tokenNumber).trim() !== "" && (
                <div className="relative z-10 mt-4 border-t border-white/15 pt-3 sm:mt-5 sm:pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 sm:h-10 sm:w-10">
                        <Ticket size={18} className="text-indigo-200" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-[0.25em] text-slate-400 sm:text-[8px]">
                          Pickup token
                        </p>
                        <p className="text-3xl font-black tabular-nums tracking-tighter text-white sm:text-4xl">
                          {order.tokenNumber}
                        </p>
                      </div>
                    </div>
                    <p className="max-w-full text-[8px] font-bold uppercase leading-snug tracking-wide text-indigo-200/90 sm:max-w-[140px] sm:text-right sm:text-[9px]">
                      Show this at the counter when collecting your order
                    </p>
                  </div>
                </div>
              )}
          </div>

          {/* Order progress (steps only — no duplicate “Current Phase” row) */}
          <div className="border-b border-slate-50 px-0 pb-2 pt-1 sm:px-1 sm:pb-3 sm:pt-2">
            <OrderProgress status={order.status} />
          </div>

          {/* Item Manifest */}
          <div className="space-y-3 p-3 sm:space-y-4 sm:p-5">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-[10px]">Order Manifest</h3>
            <div className="space-y-2.5 sm:space-y-3">
              {order.items.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={item.id || idx} 
                  className={`group flex flex-col gap-2 rounded-xl p-2 transition-all sm:flex-row sm:items-start sm:gap-3 sm:p-2.5 ${
                    !isTakeawayTableOrder(order) && item.isTakeaway 
                      ? "bg-orange-50 border border-orange-100/50" 
                      : ""
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 shadow-sm">
                    <img 
                      src={item.image || "https://via.placeholder.com/140?text=No+Image"} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/140?text=No+Image";
                      }}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt={item.name}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-black text-slate-900 truncate">{item.name}</p>
                      {item.selectedPortion && (
                        <span className="text-[9px] font-bold text-blue-600">({item.selectedPortion})</span>
                      )}
                      {!isTakeawayTableOrder(order) && item.isTakeaway && (
                        <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[7px] font-black uppercase tracking-wider rounded-md flex items-center gap-0.5">
                          <Package size={7} /> TA
                        </span>
                      )}
                    </div>
                    {item.selectedAddons?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1 bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100/50">
                        {item.selectedAddons.map((a, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="text-[8px] font-bold text-emerald-600">+ {a.name}</span>
                            <span className="text-[7px] font-black text-slate-400">₹{a.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                      {item.qty} × <span className="text-slate-400">₹{item.price.toLocaleString()}</span>
                    </p>
                  </div>
                  <p className="shrink-0 self-end font-mono text-sm font-black text-slate-900 sm:self-auto">
                    ₹{(item.price * item.qty).toLocaleString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Detailed Bill Summary */}
          <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-3 sm:p-5">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Subtotal</span>
              <span className="text-slate-600 font-mono">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>CGST (2.5%)</span>
              <span className="text-slate-600 font-mono">₹{cgst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>SGST (2.5%)</span>
              <span className="text-slate-600 font-mono">₹{sgst.toLocaleString()}</span>
            </div>
            
            <div className="mt-1 flex items-center justify-between border-t border-slate-200/60 pt-3">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Grand Total</p>
                {order.paymentMethod === 'online' || order.paymentStatus === 'paid' ? (
                  <p className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                    <CheckCircle size={10} /> Paid Online
                  </p>
                ) : (
                  <p className="text-[9px] font-bold text-orange-500 uppercase flex items-center gap-1">
                    <Wallet size={10} /> Pay at Counter
                  </p>
                )}
              </div>
              <span className="font-mono text-2xl font-black tracking-tighter text-slate-900 sm:text-3xl">
                ₹{grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Dynamic Cooking Notes */}
          {order.notes && (
            <div className="mx-3 mb-3 mt-0 flex items-start gap-2 rounded-xl border border-indigo-100/50 bg-indigo-50/50 p-3 sm:m-4 sm:gap-3 sm:p-4">
              <div className="shrink-0 rounded-lg bg-indigo-600 p-1.5 text-white shadow-md shadow-indigo-100 sm:p-2 sm:shadow-lg">
                <Receipt size={13} strokeWidth={2} />
              </div>
              <div>
                <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-600">Kitchen Request</p>
                <p className="text-[11px] italic leading-snug text-slate-600 sm:text-xs">"{order.notes}"</p>
              </div>
            </div>
          )}
        </motion.div>

        <div className="w-full shrink-0 px-1 pb-4 pt-4 sm:px-2 sm:pb-5 sm:pt-5">
          <div className="flex gap-3">
            <motion.div 
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="relative group w-full"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <Link 
                to={`/menu?from=chooser&mergeId=${order._id || order.id}${order.table ? `&table=${order.table}` : ""}${order.table === TAKEAWAY_TABLE ? `&mode=takeaway` : ""}`} 
                className="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-2.5 text-[9px] font-black uppercase tracking-widest text-white shadow-md transition-all sm:rounded-[1.25rem] sm:py-3 sm:shadow-lg"
              >
                <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                Add Items
                <ArrowRight size={12} className="opacity-50" />
              </Link>
            </motion.div>
          </div>
        </div>

    
      </main>

      {/* Token popup — takeaway-only; main card above always shows token too */}
      <AnimatePresence>
        {mode === "takeaway" &&
          isTakeawayTableOrder(order) &&
          order.tokenNumber != null &&
          String(order.tokenNumber).trim() !== "" &&
          showTokenPopup && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed inset-x-4 top-20 z-[100] mx-auto w-auto max-w-sm sm:inset-x-auto sm:left-auto sm:right-6 sm:top-24 sm:mx-0 sm:w-56"
            >
              <div className="relative overflow-hidden rounded-3xl border border-indigo-50 bg-white shadow-[0_32px_64px_-16px_rgba(79,70,229,0.3)]">
        
        {/* Ticket Header with Mesh Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-3">
          {/* Subtle Decorative Circles */}
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
          
          <div className="flex justify-between items-center text-white relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                <Ticket size={16} className="text-white" strokeWidth={3} />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] opacity-90">
                Order Token
              </span>
            </div>
            <button 
              onClick={() => setShowTokenPopup(false)}
              className="p-1.5 hover:bg-white/20 rounded-full transition-all active:scale-90"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* The "Perforation" Line Effect */}
        <div className="relative flex items-center px-0 my-[-1px]">
          <div className="absolute left-[-8px] w-4 h-4 bg-slate-50 border-r border-indigo-100 rounded-full z-10" />
          <div className="w-full border-t-2 border-dashed border-indigo-50 mx-4" />
          <div className="absolute right-[-8px] w-4 h-4 bg-slate-50 border-l border-indigo-100 rounded-full z-10" />
        </div>

        {/* Token Content */}
        <div className="bg-gradient-to-b from-white to-indigo-50/30 p-4 text-center sm:p-6">
          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] block mb-2">
            Queue Number
          </span>
          
          <div className="relative inline-block">
            <p className="text-4xl font-black italic tracking-tighter text-slate-900 sm:text-5xl">
              {order.tokenNumber}
            </p>
            {/* Subtle glow behind the number */}
            <div className="absolute inset-0 bg-indigo-500/5 blur-xl -z-10" />
          </div>

          <div className="mt-5 py-2 px-4 bg-indigo-50 rounded-2xl inline-flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
              Ready for pickup
            </p>
          </div>
        </div>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

    </div>
  );
}