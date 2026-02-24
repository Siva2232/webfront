import { useOrders } from "../context/OrderContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import OrderProgress from "../components/OrderProgress";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { 
  ChevronLeft, 
  RotateCcw, 
  Timer, 
  Receipt, 
  Sparkles, 
  ArrowRight,
  BellRing,
  AlertCircle
} from "lucide-react";

export default function OrderSummary() {
  const { orders, fetchOrders } = useOrders();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // fetch orders if we don't have any yet (e.g. fresh visit)
  useEffect(() => {
    if (orders.length === 0) fetchOrders();
  }, []);

  // Get current table from URL
  const currentTable = searchParams.get("table")?.trim()?.replace(/^0+/, "") || null;

  // Find active (non-served) orders for current table only
  const tableOrders = currentTable 
    ? orders.filter(o => o.table === currentTable && o.status !== "Served")
    : [];

  // Get the most recent active order for this table (served orders are ignored)
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
          {currentTable 
            ? `We couldn't find any recent orders for Table ${currentTable}.`
            : "No table selected or no recent orders found."}
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Link 
            to={`/menu${currentTable ? `?table=${currentTable}` : ""}`}
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

  return (
    <div 
      className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans"
      onClick={() => cheerSoundRef.current.load()} // Unlocks audio on first user tap
    >
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(`/menu${currentTable ? `?table=${currentTable}` : ""}`)} 
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
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Table</span>
                <p className="text-6xl font-black tracking-tighter leading-none">#{order.table}</p>
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
                  key={item.id} 
                  className="flex items-center gap-4 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 shadow-sm">
                    <img 
                      src={item.image} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt={item.name}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] font-black text-indigo-500 mt-0.5 uppercase tracking-wider">
                      {item.qty} × ₹{item.price.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-900 font-mono">
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
                <p className="text-[9px] font-bold text-indigo-500 uppercase">Paid via Counter</p>
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
        <div className="max-w-md mx-auto">
          <motion.div 
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 mt-25"></div>
            <Link 
              to={`/menu${order.table ? `?table=${order.table}` : ""}`} 
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