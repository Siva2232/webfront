import { useCart } from "../context/CartContext";
import { useOrders } from "../context/OrderContext";
import { generateId } from "../utils/generateId";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { 
  ShoppingBag, Trash2, Plus, Minus, ChevronLeft, 
  CheckCircle2, ReceiptText, ArrowRight, MessageSquare, 
  UtensilsCrossed, AlertCircle
} from "lucide-react";
import confetti from 'canvas-confetti';

export default function Cart() {
  const {
    cart, table, setTable, clearCart,
    totalAmount, updateQuantity, removeFromCart,
  } = useCart();

  const { addOrder } = useOrders();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [notes, setNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [placedDetails, setPlacedDetails] = useState(null);
  const [isSwiped, setIsSwiped] = useState(false);
  const [dragConstraints, setDragConstraints] = useState(0);
  const [tableError, setTableError] = useState("");

  const containerRef = useRef(null);
  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, 150], [0.4, 0]);

  // Auto-detect & update table from URL
  useEffect(() => {
    const urlTable = searchParams.get("table");
    if (urlTable?.trim()) {
      const clean = urlTable.trim().replace(/^0+/, '') || "";
      if (clean !== table) {
        setTable(clean);
        setTableError("");
      }
    }
  }, [searchParams, table, setTable]);

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      setDragConstraints(containerWidth - 64 - 16);
    }
  }, [cart]);

  // GST
  const cgst = totalAmount * 0.025;
  const sgst = totalAmount * 0.025;
  const grandTotal = totalAmount + cgst + sgst;

  const playSynthSound = (type) => {
    // your existing sound function...
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const createTone = (freq, type, start, duration, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      if (type === 'swipe') {
        createTone(1200, 'sine', 0, 0.05, 0.1);
        createTone(400, 'triangle', 0, 0.03, 0.05);
      } else if (type === 'success') {
        createTone(523.25, 'sine', 0, 0.6, 0.1);    
        createTone(659.25, 'sine', 0.05, 0.6, 0.1); 
        createTone(783.99, 'sine', 0.1, 0.8, 0.1);  
        createTone(1046.50, 'triangle', 0.15, 0.4, 0.05); 
      }
    } catch (e) {
      console.log("Audio blocked");
    }
  };

  const placeOrder = async () => {
    if (!table?.trim()) {
      setTableError("Please enter your table number");
      return;
    }
    if (cart.length === 0) return;

    setTableError("");
    playSynthSound('success');

    const orderId = generateId("ORD");
    localStorage.setItem("lastOrderId", orderId);

    // Immediately show success UI (Optimistic UI)
    setPlacedDetails({ orderId, table, total: grandTotal });
    setShowSuccess(true);
    clearCart(); // Clear immediately for snappiness

    // Trigger confetti immediately
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#10b981', '#fb923c', '#ffffff']
    });

    // Prep details
    const details = { 
      id: orderId, 
      table, 
      items: [...cart], 
      status: "Preparing", 
      createdAt: new Date().toISOString(), 
      notes: notes.trim(),
      billDetails: { subtotal: totalAmount, cgst, sgst, grandTotal },
      totalPrice: grandTotal,
    };

    // Background process
    addOrder(details).then(created => {
      const effectiveId = created?._id || orderId;
      localStorage.setItem("lastOrderId", effectiveId);
    });

    // Navigate faster
    setTimeout(() => {
      navigate(`/order-summary?table=${table}`);
    }, 1000); 
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans">
      
      <nav className="sticky top-0 z-[60] bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to={`/menu${table ? `?table=${table}` : ""}`} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-slate-900" />
          </Link>
          <div className="text-center">
            <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Checkout</h1>
            <p className="text-sm font-black text-slate-900 uppercase leading-none mt-1">Review Items</p>
          </div>
         <div className="flex justify-end">
      {cart.length > 0 && (
        <button 
          onClick={clearCart} 
          className="flex items-center justify-center h-9 w-9 bg-rose-50 text-rose-500 rounded-full hover:bg-rose-100 active:scale-95 transition-all"
          aria-label="Clear Cart"
        >
          <Trash2 size={18} strokeWidth={2.2} />
        </button>
      )}
    </div>

        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-8 pb-72">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <SuccessView key="success" details={placedDetails} navigate={navigate} table={table} />
          ) : cart.length === 0 ? (
            <EmptyView key="empty" table={table} />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              
              {/* Table selection - kept your original beautiful style */}
              <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <UtensilsCrossed size={20} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                        Serving At
                      </p>
                      <p className="text-lg font-black uppercase">
                        Table {table || '??'}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex flex-col items-end">
                    <input 
                      type="text"
                      value={table}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setTable(val);
                        if (val.trim()) setTableError("");
                      }}
                      placeholder="?"
                      maxLength={3}
                      className={`w-20 bg-white/10 px-4 py-2.5 rounded-xl text-center font-black text-lg outline-none border-2 transition-all ${
                        tableError 
                          ? "border-rose-500 focus:border-rose-500" 
                          : "border-white/20 focus:border-orange-500"
                      }`}
                    />
                    {tableError && (
                      <div className="mt-2 text-rose-400 text-[11px] font-medium flex items-center gap-1">
                        <AlertCircle size={14} />
                        {tableError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rest of your UI - Order items, Notes, Bill - unchanged */}
              <div className="space-y-4">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Order Summary</h2>
                {cart.map((item) => (
                  <motion.div layout key={item.id} className="flex gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="relative w-20 h-20 shrink-0">
                        <img src={item.image} className="w-full h-full rounded-2xl object-cover" alt="" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="font-black text-slate-900 text-sm uppercase">{item.name}</h3>
                      <p className="text-slate-400 font-bold text-[11px] mb-2 uppercase">₹{item.price}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                          <button onClick={() => updateQuantity(item.id, item.qty - 1)} className="w-8 h-8 flex items-center justify-center"><Minus size={12}/></button>
                          <span className="w-8 text-center text-xs font-black">{item.qty}</span>
                          <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="w-8 h-8 flex items-center justify-center"><Plus size={12}/></button>
                        </div>
                        <p className="font-black text-slate-900 text-sm">₹{(item.price * item.qty).toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2 text-slate-400">
                    <MessageSquare size={14} />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Kitchen Notes</h2>
                </div>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Extra spicy, no onions..."
                  className="w-full bg-white border border-slate-100 shadow-sm rounded-3xl p-5 text-sm min-h-[100px] outline-none"
                />
              </div>

              <div className="bg-white border border-dashed border-slate-200 rounded-[2rem] p-6 space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>Subtotal</span>
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                  <span>CGST (2.5%)</span>
                  <span>₹{cgst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                  <span>SGST (2.5%)</span>
                  <span>₹{sgst.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-900 uppercase">Grand Total</span>
                  <span className="text-lg font-black text-slate-900 ">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!showSuccess && cart.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-0 inset-x-0 p-6 z-[100] bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-md mx-auto">
            <div 
              ref={containerRef}
              className={`relative h-20 p-2 rounded-[2.5rem] flex items-center transition-all duration-500 shadow-2xl overflow-hidden ${
                table?.trim() 
                  ? 'bg-slate-900' 
                  : 'bg-slate-100 grayscale pointer-events-none'
              }`}
            >
              <motion.div style={{ opacity: textOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Swipe to Order</p>
              </motion.div>

              <motion.div
                drag="x"
                x={x}
                dragConstraints={{ left: 0, right: dragConstraints }}
                dragElastic={0.05}
                dragSnapToOrigin={!isSwiped}
                onDragStart={() => playSynthSound('swipe')}
                onDragEnd={(e, info) => {
                  if (info.offset.x > dragConstraints * 0.8) {
                    setIsSwiped(true);
                    placeOrder();
                  } else {
                    setIsSwiped(false);
                  }
                }}
                className="relative z-10 w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
              >
                {isSwiped ? <CheckCircle2 className="text-white" size={24} strokeWidth={3} /> : <ArrowRight className="text-white animate-pulse" size={24} strokeWidth={3} />}
              </motion.div>
              <motion.div className="absolute left-0 top-0 bottom-0 bg-orange-500/10" style={{ width: x }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SuccessView = ({ details, navigate, table }) => (
  <motion.div 
    initial={{ scale: 0.95, opacity: 0 }} 
    animate={{ scale: 1, opacity: 1 }} 
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="text-center py-12"
  >
    <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-[3rem] animate-pulse" />
        <div className="relative w-full h-full bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl">
            <CheckCircle2 size={56} strokeWidth={2.5} />
        </div>
    </div>
    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Order Placed!</h2>
    <p className="text-slate-400 text-sm mt-4 mb-10 px-10">
      Table: <strong>{details.table}</strong><br/>
      Total Bill: <span className="text-slate-900 font-black">₹{details.total.toLocaleString()}</span> (Incl. GST)
    </p>
    <div className="space-y-4 max-w-xs mx-auto">
        <button 
          onClick={() => navigate(`/order-summary?table=${table}`)} 
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
        >
            Track Status <ReceiptText size={18} />
        </button>
    </div>
  </motion.div>
);

const EmptyView = ({ table }) => (
  <div className="text-center py-24">
    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
        <ShoppingBag size={40} className="text-slate-200" />
    </div>
    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cart is empty</h3>
    <Link 
      to={`/menu${table ? `?table=${table}` : ""}`} 
      className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg mt-6"
    >
      Back to Menu
    </Link>
  </div>
);