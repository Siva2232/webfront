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
import { getCurrentRestaurantId, tenantKey } from '../utils/tenantCache';

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
      
      const { data } = await api.post('/payment/create-payment-intent', {
        amount: amount,
        currency: 'inr',
        orderId: orderDetails.orderId,
        customerDetails: {
          table: orderDetails.table,
        }
      });

      const { clientSecret } = data;

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (stripeError) {
        setError(stripeError.message);
        setIsProcessing(false);
      } else if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      }
    } catch (err) {
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
            <>Pay ₹{amount.toLocaleString()}</>
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
    totalAmount, updateQuantity, removeFromCart, updateCartItem,
  } = useCart();

  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const tableParam = searchParams.get("table");
  const isTakeaway = table === TAKEAWAY_TABLE || mode === "takeaway" || hideTable;

  const { addOrder } = useOrders();
  const navigate = useNavigate();

  useEffect(() => {
    if (hideTable && table !== TAKEAWAY_TABLE) {
      setTable(TAKEAWAY_TABLE);
    }
  }, [hideTable, table, setTable]);

  useEffect(() => {
    if (isTakeaway && !hideTable) {
      navigate("/takeaway-cart?mode=takeaway", { replace: true });
    }
  }, [isTakeaway, hideTable, navigate]);

  const displayLocation = table === TAKEAWAY_TABLE ? "Takeaway" : (table || "");

  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [placedDetails, setPlacedDetails] = useState(null);
  const [isSwiped, setIsSwiped] = useState(false);
  const [dragConstraints, setDragConstraints] = useState(0);
  const [tableError, setTableError] = useState("");
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showStripeModal, setShowStripeModal] = useState(false);

  const containerRef = useRef(null);
  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, 150], [0.4, 0]);

  // Sync table FROM URL only when the URL changes — do not depend on `table` or edits
  // will be overwritten every keystroke (e.g. ?table=5 vs user typing another number).
  useEffect(() => {
    if (mode === "takeaway") {
      setTable(TAKEAWAY_TABLE);
      setTableError("");
      return;
    }
    if (tableParam?.trim()) {
      const clean = tableParam.trim().replace(/^0+/, "") || "";
      setTable(clean);
      setTableError("");
    }
  }, [tableParam, mode, setTable]);

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      setDragConstraints(containerWidth - 64 - 16);
    }
  }, [cart]);

  const cgst = totalAmount * 0.025;
  const sgst = totalAmount * 0.025;
  const grandTotal = totalAmount + cgst + sgst;

  const playSynthSound = (type) => {
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
    if (!table?.trim() && !isTakeaway) {
      setTableError("Please enter your table number");
      return;
    }
    if (cart.length === 0) return;

    setTableError("");
    playSynthSound('success');

    const orderId = generateId("ORD");
    const _rid = getCurrentRestaurantId();
    localStorage.setItem(tenantKey("lastOrderId", _rid), orderId);

    const mergeId = searchParams.get("mergeId");

    const effectiveTable = isTakeaway ? TAKEAWAY_TABLE : table;
    setPlacedDetails({ orderId: mergeId || orderId, table: effectiveTable, total: grandTotal, paymentMethod: paymentDetails ? 'online' : 'cod' });
    setShowSuccess(true);
    setShowStripeModal(false);
    clearCart();

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#10b981', '#fb923c', '#ffffff']
    });

    // Capture cart items before React state updates clear them
    const cartSnapshot = [...cart];

    const details = { 
      id: orderId, 
      existingOrderId: mergeId, 
      table: effectiveTable,
      orderItems: cartSnapshot, 
      status: "Pending", 
      customerName: customerName.trim() || undefined,
      createdAt: new Date().toISOString(), 
      notes: notes.trim(),
      billDetails: { subtotal: totalAmount, cgst, sgst, grandTotal },
      totalAmount: grandTotal,
      hasTakeaway: !isTakeaway && cartSnapshot.some(item => item.isTakeaway),
      paymentMethod: paymentDetails ? 'online' : 'cod',
      paymentStatus: paymentDetails ? 'paid' : 'pending',
      paymentId: paymentDetails?.id || null,
    };

    // Fire API in background — don't block the UI
    addOrder(details).then(created => {
      const effectiveId = created?._id || orderId;
      const _rid = getCurrentRestaurantId();
      localStorage.setItem(tenantKey("lastOrderId", _rid), effectiveId);
    }).catch(err => {
      console.error("Order placement error:", err);
    });

    // Navigate after a brief delay for the success animation
    setTimeout(() => {
      if (effectiveTable === TAKEAWAY_TABLE) {
        navigate(`/order-summary?mode=takeaway`);
      } else {
        navigate(`/order-summary?table=${effectiveTable}`);
      }
    }, 1200);
  };

  const handleSwipeComplete = () => {
    if (!table?.trim() && !isTakeaway) {
      setTableError("Please enter your table number");
      setIsSwiped(false);
      return;
    }
    
    if (paymentMethod === 'online') {
      setShowStripeModal(true);
      setIsSwiped(false);
    } else {
      placeOrder();
    }
  };

  const handlePaymentSuccess = (paymentIntent) => {
    placeOrder(paymentIntent);
  };

  // Group items by portion
  const groupedItems = cart.reduce((groups, item) => {
    const portion = item.selectedPortion || "Regular";
    if (!groups[portion]) groups[portion] = [];
    groups[portion].push(item);
    return groups;
  }, {});

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
                onClick={() => setShowClearCartModal(true)} 
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
              
              {/* Table selection */}
              {!isTakeaway ? (
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
                        {/* <p className="text-lg font-black uppercase">
                          {displayLocation || '??'}
                        </p> */}
                      </div>
                    </div>

                    <div className="relative flex flex-col items-end">
                   <p className={`w-20 bg-white/10 px-4 py-2.5 rounded-xl text-center font-black text-lg outline-none border-2 transition-all ${
                        tableError
                          ? "border-rose-500 focus:border-rose-500"
                          : "border-white/20 focus:border-orange-500"
                      }`}>
                          {displayLocation || '??'}
                        </p>
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

              {/* Grouped Order Items with Portion Highlight */}
              <div className="space-y-8">
                {Object.entries(groupedItems).map(([portion, items]) => (
                  <div key={portion} className="space-y-4">
                    {/* Portion Group Header - Styled like KitchenBill batch/header */}
                    <div className="flex items-center gap-3 px-1">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                      <div className="bg-slate-900 text-white px-5 py-2 rounded-full shadow-lg border border-slate-800 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                        <span className="font-black text-[10px] uppercase tracking-[0.2em]">
                          {portion} Portion Group
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    </div>

                    {/* Items in this segment */}
                    <div className="space-y-4">
                      {items.map((item) => {
                        const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0) * (a.qty || 1), 0) || 0;
                        const basePrice = item.price - addonsTotal;
                        
                        return (
                          <motion.div 
                            layout 
                            key={`${item.cartKey || item.id || item._id}-${item.isTakeaway ? 'ta' : 'di'}`} 
                            className={`relative overflow-hidden bg-white p-5 rounded-[2.5rem] border shadow-sm transition-all hover:shadow-md ${
                              item.isTakeaway ? 'border-orange-200 bg-orange-50/30' : 'border-slate-100'
                            }`}
                          >
                            <div className="flex gap-5">
                              {/* Left: Image with Badge */}
                              <div className="relative w-24 h-24 shrink-0">
                                <img src={item.image} className="w-full h-full rounded-[2rem] object-cover shadow-sm bg-slate-50" alt="" />
                                {item.isTakeaway && (
                                  <div className="absolute -top-2 -right-2 bg-orange-500 text-white p-2 rounded-full shadow-lg border-4 border-white">
                                    <Package size={12} strokeWidth={3} />
                                  </div>
                                )}
                              </div>

                              {/* Right: Info & Logic */}
                              <div className="flex-1 flex flex-col">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight leading-none mb-1">
                                      {item.name}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 items-center">
                                      {item.selectedPortion && (
                                        <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                                          <ArrowRight size={10} strokeWidth={3} />
                                          <span className="text-[10px] font-black uppercase italic tracking-widest">{item.selectedPortion}</span>
                                          <div className="flex items-center gap-1.5 ml-1 border-l border-blue-200 pl-1.5">
                                            <button 
                                              onClick={() => updateQuantity(item._id || item.id, item.qty - 1, item.cartKey)}
                                              className="w-5 h-5 flex items-center justify-center hover:bg-blue-100 rounded-md transition-colors"
                                            >
                                              <Minus size={10} strokeWidth={4} />
                                            </button>
                                            <span className="text-[10px] font-black">{item.qty}</span>
                                            <button 
                                              onClick={() => updateQuantity(item._id || item.id, item.qty + 1, item.cartKey)}
                                              className="w-5 h-5 flex items-center justify-center hover:bg-blue-100 rounded-md transition-colors"
                                            >
                                              <Plus size={10} strokeWidth={4} />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {!item.selectedPortion && (
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                          ₹{basePrice.toLocaleString()} × {item.qty}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-slate-900 text-2xl tracking-tighter italic">
                                      ₹{(item.price * item.qty).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                {/* Addons Section - With Count and Adjusters */}
                                {item.selectedAddons?.length > 0 && (
                                  <div className="mt-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 space-y-2">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Selected Extras</p>
                                    {item.selectedAddons.map((a, i) => (
                                      <div key={i} className="flex justify-between items-center bg-white/50 p-2 rounded-xl border border-emerald-100/20">
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                                            <button 
                                              onClick={() => {
                                                const currentQty = a.qty || 1;
                                                if (currentQty > 1) {
                                                  const newAddons = item.selectedAddons.map((adn, idx) => 
                                                    idx === i ? { ...adn, qty: currentQty - 1 } : adn
                                                  );
                                                  updateCartItem(item.cartKey, (prev) => ({ ...prev, selectedAddons: newAddons }));
                                                } else {
                                                  const newAddons = item.selectedAddons.filter((_, idx) => idx !== i);
                                                  updateCartItem(item.cartKey, (prev) => ({ ...prev, selectedAddons: newAddons }));
                                                }
                                              }}
                                              className="hover:bg-emerald-200 p-0.5 rounded transition-colors"
                                            >
                                              <Minus size={10} strokeWidth={3} />
                                            </button>
                                            <span className="text-[10px] font-black w-4 text-center">{a.qty || 1}</span>
                                            <button 
                                              onClick={() => {
                                                const newAddons = item.selectedAddons.map((adn, idx) => 
                                                  idx === i ? { ...adn, qty: (adn.qty || 1) + 1 } : adn
                                                );
                                                updateCartItem(item.cartKey, (prev) => ({ ...prev, selectedAddons: newAddons }));
                                              }}
                                              className="hover:bg-emerald-200 p-0.5 rounded transition-colors"
                                            >
                                              <Plus size={10} strokeWidth={3} />
                                            </button>
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-700 uppercase">{a.name}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <span className="text-[10px] font-black text-emerald-600">₹{((a.price || 0) * (a.qty || 1) * item.qty).toLocaleString()}</span>
                                          <span className="text-[8px] font-medium text-slate-400">@₹{(a.price || 0)} ea</span>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-emerald-200">
                                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Variation Total</span>
                                      <span className="text-sm font-black text-emerald-800">₹{(item.price * item.qty).toLocaleString()}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Quantity Adjuster */}
                                <div className="flex items-center justify-between mt-auto pt-4">
                                  <div className="flex items-center bg-slate-900 text-white rounded-2xl p-1 shadow-lg shadow-slate-200">
                                    <button 
                                      onClick={() => updateQuantity(item._id || item.id, item.qty - 1, item.cartKey)} 
                                      className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                      <Minus size={14} strokeWidth={3} />
                                    </button>
                                    <span className="w-8 text-center text-sm font-black italic">{item.qty}</span>
                                    <button 
                                      onClick={() => updateQuantity(item._id || item.id, item.qty + 1, item.cartKey)} 
                                      className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                      <Plus size={14} strokeWidth={3} />
                                    </button>
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                    <button 
                                      onClick={() => removeFromCart(item._id || item.id, item.cartKey)}
                                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Name */}
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

              {/* Kitchen Notes */}
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

              {/* Bill Summary */}
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
                  <span className="text-lg font-black text-slate-900">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method */}
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
                    <span className="text-xs font-black uppercase">Pay Later</span>
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

      {/* Clear Cart Confirmation Modal */}
      <AnimatePresence>
        {showClearCartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowClearCartModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-black text-slate-900 mb-3">Clear Cart?</h3>
                <p className="text-sm text-slate-600 mb-5">This will remove all items from your cart. Are you sure?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearCartModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { clearCart(); setShowClearCartModal(false); }}
                    className="flex-1 px-4 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600"
                  >
                    Confirm Clear
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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