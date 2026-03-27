import { useOrders } from "../context/OrderContext";
import { TAKEAWAY_TABLE } from "../context/CartContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import OrderProgress from "../components/OrderProgress";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { 
  ChevronLeft, 
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
  Wallet
} from "lucide-react";

export default function OrderSummary() {
  const { orders, fetchOrders, fetchTableOrders, updateOrderStatus } = useOrders();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isClosingBill, setIsClosingBill] = useState(false);

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

  // fetch orders on mount
  useEffect(() => {
    fetchCurrentOrders();
  }, [currentTable, mode]);

  // Use a longer interval for background refresh (30s instead of 10s)
  // real-time updates are already handled by sockets in OrderContext.
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

  // simplified back link that never includes `table` (avoids triggering
  // choose‑mode redirect).  takeaway mode is still respected.
  const backLink = mode === "takeaway" ? "/menu?mode=takeaway" : "/menu";

  // Determine orders to show.  For a table we filter by that table;
  // for takeaway mode we look for either the sentinel value or a missing
  // table (older orders created before the bug fix may have had ``).
  const isTakeawayOrder = (o) => o.table === TAKEAWAY_TABLE || !o.table;

  const tableOrders = mode === "takeaway"
    ? orders.filter(o => isTakeawayOrder(o) && o.status !== "Closed")
    : currentTable
      ? orders.filter(o => 
          o.status !== "Closed" &&
          (o.table === currentTable ||
            (currentTable === TAKEAWAY_TABLE && !o.table))
        )
      : [];

  // Get the most recent order for this table (including Served; only Closed is hidden)
  const order = tableOrders.length > 0 
    ? tableOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;

  // Cheering sound reference
  const cheerSoundRef = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3"));

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
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(backLink)} 
            className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft size={22} className="text-slate-900" />
          </button>
          <div className="text-center">
            <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-0.5 flex items-center justify-center gap-1">
              <Sparkles size={10} /> Live Tracking
            </h1>
            <p className="text-sm font-bold text-slate-900">Order Summary</p>
          </div>
          <button className="p-2 -mr-2 text-slate-400 hover:text-indigo-600 transition-colors">
            {/* <BellRing size={20} /> */}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-6 pb-40">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden"
        >
          {/* ID & Table Header */}
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150">
              <Receipt size={100} strokeWidth={1} />
            </div>
            
            <div className="relative z-10 flex justify-between items-end">
              <div>
                <span className="inline-block px-2 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3 text-slate-300">
                  Transaction Hash
                </span>
                <p className="text-lg font-mono font-bold tracking-tighter uppercase">
                  {(order._id || order.id || "").slice(-10)}
                </p>
                <div className="flex items-center gap-2 text-slate-400 mt-2">
                  <Timer size={12} className="text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {format(new Date(order.createdAt), "h:mm a • MMM d")}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {order.table === TAKEAWAY_TABLE ? "Order" : "Table"}
                </span>
                <p className="text-6xl font-black tracking-tighter leading-none">
                  {order.table === TAKEAWAY_TABLE ? "Takeaway" : `#${order.table}`}
                </p>
                {/* Payment Status Badge */}
                {(order.paymentMethod === 'online' || order.paymentStatus === 'paid') && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full">
                    <CheckCircle size={10} /> PAID
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="p-8 border-b border-slate-50">
            <div className="flex justify-between items-center mb-8">
              <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">Current Phase</span>
              <StatusBadge status={order.status} />
            </div>
            <OrderProgress status={order.status} />
          </div>

          {/* Item Manifest */}
          <div className="p-8 space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Order Manifest</h3>
            <div className="space-y-5">
              {order.items.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={item.id || idx} 
                  className={`flex items-start gap-4 group p-3 rounded-2xl transition-all ${
                    !isTakeawayOrder(order) && item.isTakeaway 
                      ? "bg-orange-50 border border-orange-100/50" 
                      : ""
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 shadow-sm">
                    <img 
                      src={item.image} 
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
                      {!isTakeawayOrder(order) && item.isTakeaway && (
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
                  <p className="text-sm font-black text-slate-900 font-mono shrink-0">
                    ₹{(item.price * item.qty).toLocaleString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Detailed Bill Summary */}
          <div className="p-8 bg-slate-50/50 border-t border-slate-100 space-y-3">
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
            
            <div className="pt-4 mt-2 border-t border-slate-200/60 flex justify-between items-center">
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
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                ₹{grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Dynamic Cooking Notes */}
          {order.notes && (
            <div className="m-6 mt-0 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 flex gap-4 items-start">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shrink-0 shadow-lg shadow-indigo-100">
                <Receipt size={14} />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Kitchen Request</p>
                <p className="text-xs text-slate-600 italic leading-relaxed">"{order.notes}"</p>
              </div>
            </div>
          )}
        </motion.div>

        <p className="text-center mt-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
          Pulse Server Connection: Active 📡
        </p>
      </main>

      {/* FLOATING BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 inset-x-0 p-6 z-50 mb-19 lg:mb-0 lg:relative lg:p-0">
        <div className="max-w-md mx-auto grid grid-cols-1 gap-3">
          <motion.div 
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 mt-25"></div>
            <Link 
              to={`/menu?from=chooser&mergeId=${order._id || order.id}${order.table ? `&table=${order.table}` : ""}${order.table === TAKEAWAY_TABLE ? `&mode=takeaway` : ""}`} 
              className="relative flex items-center justify-center gap-3 w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all"
            >
              <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
              Add More Items
              <ArrowRight size={14} className="opacity-50" />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}