/* Placeholder for WaiterCart.jsx - logic will follow Cart.jsx structure but customized for Waiter Panel */
import { useCart, TAKEAWAY_TABLE } from "../context/CartContext";
import { useOrders } from "../context/OrderContext";
import { generateId } from "../utils/generateId";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { 
  ShoppingBag, Trash2, Plus, Minus, ChevronLeft, 
  CheckCircle2, ReceiptText, ArrowRight, MessageSquare, 
  UtensilsCrossed, AlertCircle, Package, CreditCard, Wallet, X, Loader2
} from "lucide-react";
import confetti from 'canvas-confetti';
import api from '../api/axios';
import { computeGstFromSubtotal, GST_TOTAL_PCT_LABEL } from "../utils/gstRates";

export default function WaiterCart() {
  const {
    cart, table, setTable, clearCart,
    totalAmount, updateQuantity, removeFromCart,
  } = useCart();

  const [searchParams] = useSearchParams();
  const { addOrder } = useOrders();
  const navigate = useNavigate();

  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false); // New loading state
  const [placedDetails, setPlacedDetails] = useState(null);
  const [isSwiped, setIsSwiped] = useState(false);
  const [dragConstraints, setDragConstraints] = useState(0);
  const [tableError, setTableError] = useState("");
  
  const containerRef = useRef(null);
  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, 150], [0.4, 0]);

  const isTakeaway = table === TAKEAWAY_TABLE;

  useEffect(() => {
    if (containerRef.current) {
      setDragConstraints(containerRef.current.offsetWidth - 64 - 16);
    }
  }, [cart]);

  const { cgst, sgst, grandTotal } = computeGstFromSubtotal(totalAmount);

  const placeOrder = async () => {
    if (isPlacing) return; // Prevent multiple clicks
    if (!table?.trim() && !isTakeaway) {
      setTableError("Table required");
      return;
    }
    if (cart.length === 0) return;

    setIsPlacing(true);
    const orderId = generateId("ORD");
    const effectiveTable = isTakeaway ? TAKEAWAY_TABLE : table;

    const details = { 
      id: orderId, 
      table: effectiveTable,
      items: [...cart], // Context expects 'items' for optimistic mapping
      orderItems: [...cart], // API expects 'orderItems'
      status: "New", 
      customerName: customerName.trim() || undefined,
      createdAt: new Date().toISOString(), 
      notes: notes.trim(),
      billDetails: { subtotal: totalAmount, cgst, sgst, grandTotal },
      totalAmount: grandTotal,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
    };

    try {
      // Step 1: Add entry to local state IMMEDIATELY (no await needed for optimistic)
      // The context addOrder does a synchronous setState for the optimistic entry first,
      // then fires the API in the background.
      const orderPromise = addOrder(details);
      
      // Step 2: Update UI and navigate immediately — no waiting for network
      clearCart();
      setPlacedDetails({ orderId, table: effectiveTable, total: grandTotal });
      setShowSuccess(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.7 } });
      navigate(`/waiter/order-summary?table=${effectiveTable}`);
      
      // Step 3: Await the API in the background — context will reconcile state
      await orderPromise;
    } catch (err) {
      console.error(err);
      setIsPlacing(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-xl">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Order Placed!</h2>
        <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-widest">Order ID: {placedDetails?.orderId}</p>
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => navigate(`/waiter/order-summary?table=${placedDetails?.table}`)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">View Active Bill</button>
          <button onClick={() => navigate("/waiter/tables")} className="bg-slate-50 text-slate-400 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all">Floor Plan</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans mb-32">
       <nav className="sticky top-0 z-[60] bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-[10px] font-black uppercase tracking-widest text-orange-500">Waiter Review</h1>
            <p className="text-sm font-black text-slate-900 uppercase">Table {isTakeaway ? 'Takeaway' : table}</p>
          </div>
          <div className="w-10" />
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-8">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={64} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-black text-slate-400 uppercase">Cart is Empty</h3>
            <button onClick={() => navigate(-1)} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs">Add Items</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.cartKey} className="bg-white p-4 rounded-3xl border border-slate-100 flex gap-4">
                  <img src={item.image} className="w-20 h-20 rounded-2xl object-cover" alt="" />
                  <div className="flex-1">
                    <h3 className="font-black text-slate-900 text-sm uppercase">{item.name}</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">₹{item.price} x {item.qty}</p>
                    <div className="flex items-center justify-between mt-3">
                       <div className="flex items-center bg-slate-100 rounded-xl p-1">
                          <button onClick={() => updateQuantity(item._id, item.qty - 1, item.cartKey, !!item.isTakeaway)} className="w-8 h-8 flex items-center justify-center"><Minus size={12}/></button>
                          <span className="w-8 text-center text-xs font-black">{item.qty}</span>
                          <button onClick={() => updateQuantity(item._id, item.qty + 1, item.cartKey, !!item.isTakeaway)} className="w-8 h-8 flex items-center justify-center"><Plus size={12}/></button>
                        </div>
                        <button onClick={() => removeFromCart(item._id, item.cartKey, !!item.isTakeaway)} className="text-rose-500 p-2"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Guest Name (Optional)" 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)} 
                className="w-full p-4 rounded-2xl bg-white border border-slate-100 text-sm outline-none"
              />
              <textarea 
                placeholder="Kitchen Notes..." 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                className="w-full p-4 rounded-2xl bg-white border border-slate-100 text-sm outline-none min-h-[100px]"
              />
            </div>

            <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Subtotal</span><span>₹{totalAmount}</span></div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Tax ({GST_TOTAL_PCT_LABEL})</span><span>₹{cgst + sgst}</span></div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-black"><span>Total</span><span className="text-xl">₹{grandTotal}</span></div>
            </div>
          </div>
        )}
      </main>

      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-6 bg-white border-t border-slate-100">
           <div className="max-w-md mx-auto">
            <div 
              ref={containerRef}
              className={`relative h-20 p-2 rounded-[2.5rem] flex items-center shadow-2xl overflow-hidden transition-all duration-500 ${isPlacing ? 'bg-emerald-500' : 'bg-slate-900'}`}
            >
              <motion.div style={{ opacity: textOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white">
                  {isPlacing ? 'Processing...' : 'Swipe to Place Order'}
                </p>
              </motion.div>
              {!isPlacing ? (
                <motion.div
                  drag="x"
                  x={x}
                  dragConstraints={{ left: 0, right: dragConstraints }}
                  onDragEnd={(e, info) => {
                    if (info.offset.x > dragConstraints * 0.8) placeOrder();
                  }}
                  className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center cursor-grab bg-orange-500 text-white shadow-lg active:cursor-grabbing"
                >
                  <ArrowRight size={24} strokeWidth={3} />
                </motion.div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500">
                   <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin text-white" size={24} />
                      <span className="text-xs font-black uppercase text-white tracking-widest">Sending to Kitchen</span>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
