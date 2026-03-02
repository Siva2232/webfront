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
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../api/axios';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Stripe Checkout Form Component
function StripeCheckoutForm({ amount, onSuccess, onCancel, orderDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔵 [Stripe] Creating payment intent...', { amount, orderDetails });
      
      // Create payment intent on backend
      const { data } = await api.post('/payment/create-payment-intent', {
        amount: amount,
        currency: 'inr',
        orderId: orderDetails.orderId,
        customerDetails: {
          table: orderDetails.table,
        }
      });

      console.log('🟢 [Stripe] Payment intent created:', data);
      const { clientSecret } = data;

      console.log('🔵 [Stripe] Confirming card payment...');
      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (stripeError) {
        console.error('🔴 [Stripe] Payment error:', stripeError);
        setError(stripeError.message);
        setIsProcessing(false);
      } else if (paymentIntent.status === 'succeeded') {
        console.log('🟢 [Stripe] Payment succeeded!', paymentIntent);
        console.log('   Payment ID:', paymentIntent.id);
        console.log('   Amount:', paymentIntent.amount / 100, paymentIntent.currency.toUpperCase());
        console.log('   Status:', paymentIntent.status);
        onSuccess(paymentIntent);
      }
    } catch (err) {
      console.error('🔴 [Stripe] Request error:', err);
      console.error('   Response:', err.response?.data);
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1e293b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        '::placeholder': {
          color: '#94a3b8',
        },
      },
      invalid: {
        color: '#ef4444',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-2xl">
        <CardElement options={cardElementOptions} />
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-4 rounded-2xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Pay ₹{amount.toLocaleString()}
            </>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-slate-400">
        🔒 Secured by Stripe. Use test card: 4242 4242 4242 4242
      </p>
    </form>
  );
}

export default function Cart({ hideTable = false }) {
  const {
    cart, table, setTable, clearCart,
    totalAmount, updateQuantity, removeFromCart,
  } = useCart();

  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const isTakeaway = table === TAKEAWAY_TABLE || mode === "takeaway" || hideTable;

  const { addOrder } = useOrders();
  const navigate = useNavigate();

  // ensure the context table value is the special TAKEAWAY_TABLE when the
  // `hideTable` prop is true (used only by the takeaway‑specific cart page)
  useEffect(() => {
    if (hideTable && table !== TAKEAWAY_TABLE) {
      setTable(TAKEAWAY_TABLE);
    }
  }, [hideTable, table, setTable]);

  // redirect only when we're in takeaway mode AND not already hiding the header
  // (i.e. when hideTable=false).  the wrapper page will set hideTable.
  useEffect(() => {
    if (isTakeaway && !hideTable) {
      navigate("/takeaway-cart?mode=takeaway", { replace: true });
    }
  }, [isTakeaway, hideTable, navigate]);

  // display-friendly text for the current table/mode
  // displayLocation no longer used directly, header hidden when takeaway
  const displayLocation = table === TAKEAWAY_TABLE ? "Takeaway" : (table || "");

  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [placedDetails, setPlacedDetails] = useState(null);
  const [isSwiped, setIsSwiped] = useState(false);
  const [dragConstraints, setDragConstraints] = useState(0);
  const [tableError, setTableError] = useState("");
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState("cod"); // "cod" or "online"
  const [showStripeModal, setShowStripeModal] = useState(false);

  const containerRef = useRef(null);
  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, 150], [0.4, 0]);

  // Auto-detect & update table from URL
  useEffect(() => {
    const urlTable = searchParams.get("table");
    const urlMode = searchParams.get("mode");
    if (urlMode === "takeaway") {
      // make sure CartContext is aware of a takeaway order
      setTable(TAKEAWAY_TABLE);
      setTableError("");
      return;
    }
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

  const placeOrder = async (paymentDetails = null) => {
    console.log('🔵 [Cart] placeOrder called');
    console.log('   Payment Details:', paymentDetails);
    console.log('   Payment Method:', paymentDetails ? 'online' : 'cod');
    
    // if there is no table AND this is not a takeaway order we complain
    if (!table?.trim() && !isTakeaway) {
      setTableError("Please enter your table number");
      return;
    }
    if (cart.length === 0) return;

    setTableError("");
    playSynthSound('success');

    const orderId = generateId("ORD");
    localStorage.setItem("lastOrderId", orderId);

    const mergeId = searchParams.get("mergeId");

    // Immediately show success UI (Optimistic UI)
    const effectiveTable = isTakeaway ? TAKEAWAY_TABLE : table;
    setPlacedDetails({ orderId: mergeId || orderId, table: effectiveTable, total: grandTotal, paymentMethod: paymentDetails ? 'online' : 'cod' });
    setShowSuccess(true);
    setShowStripeModal(false);
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
      existingOrderId: mergeId, 
      // make sure we send the effective table value (TAKEAWAY_TABLE when it's a
      // takeaway order) rather than whatever the context happens to currently
      // hold (which can lag behind when hideTable is used).
      table: effectiveTable,
      orderItems: [...cart], 
      status: "Pending", 
      customerName: customerName.trim() || undefined,
      createdAt: new Date().toISOString(), 
      notes: notes.trim(),
      billDetails: { subtotal: totalAmount, cgst, sgst, grandTotal },
      totalAmount: grandTotal,
      // Set hasTakeaway if any items are marked as takeaway
      hasTakeaway: !isTakeaway && cart.some(item => item.isTakeaway),
      // Payment info
      paymentMethod: paymentDetails ? 'online' : 'cod',
      paymentStatus: paymentDetails ? 'paid' : 'pending',
      paymentId: paymentDetails?.id || null,
    };

    console.log('🟢 [Cart] Order details created:', details);
    console.log('   Order ID:', details.id);
    console.log('   Payment Method:', details.paymentMethod);
    console.log('   Payment Status:', details.paymentStatus);
    console.log('   Payment ID:', details.paymentId);
    console.log('   Total:', details.totalAmount);

    // Background process
    addOrder(details).then(created => {
      console.log('🟢 [Cart] Order saved to backend:', created);
      const effectiveId = created?._id || orderId;
      localStorage.setItem("lastOrderId", effectiveId);
    });

    // Navigate faster; use effectiveTable as above so we don't rely on the
    // context value having been updated synchronously.
    setTimeout(() => {
      if (effectiveTable === TAKEAWAY_TABLE) {
        navigate(`/order-summary?mode=takeaway`);
      } else {
        navigate(`/order-summary?table=${effectiveTable}`);
      }
    }, 1000); 
  };

  // Handle swipe action based on payment method
  const handleSwipeComplete = () => {
    if (!table?.trim() && !isTakeaway) {
      setTableError("Please enter your table number");
      setIsSwiped(false);
      return;
    }
    
    if (paymentMethod === 'online') {
      console.log('🔵 [Cart] Opening Stripe payment modal...');
      setShowStripeModal(true);
      setIsSwiped(false);
    } else {
      console.log('🔵 [Cart] Processing COD order...');
      placeOrder();
    }
  };

  // Handle successful Stripe payment
  const handlePaymentSuccess = (paymentIntent) => {
    console.log('🟢 [Cart] Payment successful! Creating order...');
    console.log('   Payment Intent:', paymentIntent);
    console.log('   Payment ID:', paymentIntent.id);
    console.log('   Amount:', paymentIntent.amount / 100, paymentIntent.currency?.toUpperCase());
    console.log('   Status:', paymentIntent.status);
    placeOrder(paymentIntent);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans">
      
      <nav className="sticky top-0 z-[60] bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to={isTakeaway ? "/menu?mode=takeaway" : "/menu"} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
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
              {!isTakeaway ? (
                <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <UtensilsCrossed size={20} className="text-orange-400" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                          {table === TAKEAWAY_TABLE ? "Order Type" : "Serving At"}
                        </p>
                        <p className="text-lg font-black uppercase">
                          {displayLocation || '??'}
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
                
                {/* Add Takeaway Items button - navigates to menu to select takeaway items */}
                {table?.trim() && (
                  <button 
                    onClick={() => navigate(`/menu?table=${table}&addTakeaway=true&from=chooser`)}
                    className={`w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs uppercase transition-all ${
                      cart.some(item => item.isTakeaway) 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <Package size={16} /> 
                    {cart.some(item => item.isTakeaway) ? '✓ Takeaway Items Added' : 'Also Want Takeaway? Tap to Add'}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl text-center font-black">
                Takeaway Order
              </div>
            )}

              {/* Rest of your UI - Order items, Notes, Bill - unchanged */}
              <div className="space-y-4">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Order Summary</h2>
                {cart.map((item) => (
                  <motion.div layout key={`${item.id}-${item.isTakeaway ? 'ta' : 'di'}`} className={`flex gap-4 bg-white p-4 rounded-[2rem] border shadow-sm ${item.isTakeaway ? 'border-orange-200 bg-orange-50/30' : 'border-slate-100'}`}>
                    <div className="relative w-20 h-20 shrink-0">
                        <img src={item.image} className="w-full h-full rounded-2xl object-cover" alt="" />
                        {item.isTakeaway && (
                          <div className="absolute -top-2 -right-2 bg-orange-500 text-white p-1.5 rounded-full">
                            <Package size={12} />
                          </div>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-sm uppercase">{item.name}</h3>
                        {item.isTakeaway && (
                          <span className="px-2 py-0.5 bg-orange-500 text-white text-[8px] font-black uppercase rounded-full">
                            Takeaway
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 font-bold text-[11px] mb-2 uppercase">₹{item.price}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                          <button onClick={() => updateQuantity(item._id || item.id, item.qty - 1)} className="w-8 h-8 flex items-center justify-center"><Minus size={12}/></button>
                          <span className="w-8 text-center text-xs font-black">{item.qty}</span>
                          <button onClick={() => updateQuantity(item._id || item.id, item.qty + 1)} className="w-8 h-8 flex items-center justify-center"><Plus size={12}/></button>
                        </div>
                        <p className="font-black text-slate-900 text-sm">₹{(item.price * item.qty).toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2 text-slate-400">
                    <UtensilsCrossed size={14} />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Customer Name (Optional)</h2>
                </div>
                <input 
                  type="text"
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="For order tracking & merging..."
                  className="w-full bg-white border border-slate-100 shadow-sm rounded-[2rem] px-6 py-4 text-sm outline-none focus:border-orange-500 transition-colors"
                />
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

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2 text-slate-400">
                  <CreditCard size={14} />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Payment Method</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'cod'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Wallet size={24} className={paymentMethod === 'cod' ? 'text-emerald-500' : 'text-slate-400'} />
                    <span className="text-xs font-black uppercase">Cash on Delivery</span>
                    <span className="text-[10px] text-slate-400">Pay at table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('online')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'online'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard size={24} className={paymentMethod === 'online' ? 'text-blue-500' : 'text-slate-400'} />
                    <span className="text-xs font-black uppercase">Online Payment</span>
                    <span className="text-[10px] text-slate-400">Pay with card</span>
                  </button>
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
                (isTakeaway || table?.trim()) 
                  ? paymentMethod === 'online' ? 'bg-blue-600' : 'bg-slate-900'
                  : 'bg-slate-100 grayscale pointer-events-none'
              }`}
            >
              <motion.div style={{ opacity: textOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white">
                  {paymentMethod === 'online' ? 'Swipe to Pay' : 'Swipe to Order'}
                </p>
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
                    handleSwipeComplete();
                  } else {
                    setIsSwiped(false);
                  }
                }}
                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg ${
                  paymentMethod === 'online' ? 'bg-emerald-500' : 'bg-orange-500'
                }`}
              >
                {isSwiped ? <CheckCircle2 className="text-white" size={24} strokeWidth={3} /> : 
                  paymentMethod === 'online' ? <CreditCard className="text-white animate-pulse" size={24} strokeWidth={2} /> :
                  <ArrowRight className="text-white animate-pulse" size={24} strokeWidth={3} />}
              </motion.div>
              <motion.div className={`absolute left-0 top-0 bottom-0 ${paymentMethod === 'online' ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`} style={{ width: x }} />
            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      <AnimatePresence>
        {showStripeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowStripeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Complete Payment</h2>
                  <p className="text-sm text-slate-500">Amount: ₹{grandTotal.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setShowStripeModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              
              <Elements stripe={stripePromise}>
                <StripeCheckoutForm
                  amount={grandTotal}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setShowStripeModal(false)}
                  orderDetails={{
                    orderId: generateId("ORD"),
                    table: isTakeaway ? TAKEAWAY_TABLE : table,
                  }}
                />
              </Elements>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <p className="text-slate-400 text-sm mt-4 mb-6 px-10">
      Table: <strong>{details.table === TAKEAWAY_TABLE ? "Takeaway" : details.table}</strong><br/>
      Total Bill: <span className="text-slate-900 font-black">₹{details.total.toLocaleString()}</span> (Incl. GST)
    </p>
    {details.paymentMethod && (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-8 ${
        details.paymentMethod === 'online' 
          ? 'bg-emerald-100 text-emerald-700' 
          : 'bg-orange-100 text-orange-700'
      }`}>
        {details.paymentMethod === 'online' ? (
          <>
            <CreditCard size={14} />
            Paid Online
          </>
        ) : (
          <>
            <Wallet size={14} />
            Pay at Counter
          </>
        )}
      </div>
    )}
    <div className="space-y-4 max-w-xs mx-auto">
        <button 
          onClick={() => {
            // details.table already holds the effectiveTable value
            if (details.table === TAKEAWAY_TABLE) {
              navigate(`/order-summary?mode=takeaway`);
            } else {
              navigate(`/order-summary?table=${details.table}`);
            }
          }}
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
      to={table === TAKEAWAY_TABLE ? "/menu?mode=takeaway" : "/menu"} 
      className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg mt-6"
    >
      Back to Menu
    </Link>
  </div>
);