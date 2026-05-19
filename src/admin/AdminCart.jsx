import { useCart, TAKEAWAY_TABLE } from "../context/CartContext";
import { useOrders } from "../context/OrderContext";
import { generateId } from "../utils/generateId";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ChevronLeft,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { computeGstFromSubtotal, GST_TOTAL_PCT_LABEL } from "../utils/gstRates";

export default function AdminCart() {
  const {
    cart,
    table,
    clearCart,
    totalAmount,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const { addOrder } = useOrders();
  const navigate = useNavigate();

  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedDetails, setPlacedDetails] = useState(null);

  const isTakeaway = table === TAKEAWAY_TABLE;
  const canPlaceOrder = cart.length > 0 && (isTakeaway || Boolean(table?.trim()));

  const { cgst, sgst, grandTotal } = computeGstFromSubtotal(totalAmount);

  const placeOrder = async () => {
    if (isPlacing || !canPlaceOrder) return;

    setIsPlacing(true);
    const orderId = generateId("ORD");
    const effectiveTable = isTakeaway ? TAKEAWAY_TABLE : table;

    const details = {
      id: orderId,
      table: effectiveTable,
      items: [...cart],
      orderItems: [...cart],
      status: "New",
      customerName: customerName.trim() || undefined,
      createdAt: new Date().toISOString(),
      notes: notes.trim(),
      billDetails: { subtotal: totalAmount, cgst, sgst, grandTotal },
      totalAmount: grandTotal,
      paymentMethod: "cod",
      paymentStatus: "pending",
    };

    try {
      const orderPromise = addOrder(details);
      clearCart();
      setPlacedDetails({ orderId, table: effectiveTable, total: grandTotal });
      setShowSuccess(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.7 } });
      navigate(`/admin/order-summary?table=${effectiveTable}`);
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
        <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-widest">
          Order ID: {placedDetails?.orderId}
        </p>
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => navigate(`/admin/order-summary?table=${placedDetails?.table}`)}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
          >
            View Active Bill
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/tables")}
            className="bg-slate-50 text-slate-400 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
          >
            Floor Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full min-w-0 flex-col bg-slate-50 font-sans">
      <nav className="sticky top-0 z-30 shrink-0 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Admin Review</h1>
            <p className="text-sm font-black text-slate-900 uppercase">
              Table {isTakeaway ? "Takeaway" : table}
            </p>
          </div>
          <div className="w-10" aria-hidden />
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-4 sm:px-6 sm:pt-8">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={64} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-black text-slate-400 uppercase">Cart is Empty</h3>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs"
            >
              Add Items
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.cartKey || `${item._id || item.id}-${item.isTakeaway ? "ta" : "di"}`}
                  className="bg-white p-4 rounded-3xl border border-slate-100 flex gap-4"
                >
                  <img src={item.image} className="w-20 h-20 rounded-2xl object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-sm uppercase truncate">{item.name}</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1 tabular-nums">
                      ₹{item.price} x {item.qty}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center bg-slate-100 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item._id, item.qty - 1, item.cartKey, !!item.isTakeaway)
                          }
                          className="w-8 h-8 flex items-center justify-center"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-black tabular-nums">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item._id, item.qty + 1, item.cartKey, !!item.isTakeaway)
                          }
                          className="w-8 h-8 flex items-center justify-center"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item._id, item.cartKey, !!item.isTakeaway)}
                        className="text-rose-500 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
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
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-4 rounded-2xl bg-white border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <textarea
                placeholder="Kitchen Notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-4 rounded-2xl bg-white border border-slate-100 text-sm outline-none min-h-25 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Subtotal</span>
                <span className="tabular-nums">₹{totalAmount}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Tax ({GST_TOTAL_PCT_LABEL})</span>
                <span className="tabular-nums">₹{cgst + sgst}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-black">
                <span>Total</span>
                <span className="text-xl tabular-nums">₹{grandTotal}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {cart.length > 0 && (
        <footer className="sticky bottom-0 z-40 shrink-0 border-t border-slate-100 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-3xl justify-center px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <button
              type="button"
              onClick={placeOrder}
              disabled={isPlacing || !canPlaceOrder}
              className="flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-indigo-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPlacing ? (
                <>
                  <Loader2 size={20} className="animate-spin" aria-hidden />
                  Placing order…
                </>
              ) : (
                <>
                  Place order · ₹{grandTotal.toLocaleString()}
                  <ArrowRight size={18} strokeWidth={3} aria-hidden />
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
