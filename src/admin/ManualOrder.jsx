import React, { useState, useEffect } from "react";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrderContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";
import { Plus, Minus, ShoppingCart, MapPin, Utensils, ClipboardList, Package } from "lucide-react";

export default function ManualOrder() {
  const { products = [] } = useProducts();
  const { addManualOrder } = useOrders();
  // table number removed; order mode determines destination
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [isDelivery, setIsDelivery] = useState(false);
  // New: flag for dine-in orders that also include takeaway items (single bill)
  const [hasTakeawayWithDineIn, setHasTakeawayWithDineIn] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");

  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);

  // when user toggles global dine-in+takeaway switch, mark all existing items
  useEffect(() => {
    if (hasTakeawayWithDineIn) {
      setItems(prev => prev.map(i => ({ ...i, isTakeaway: true })));
    }
    // do not clear individual flags when toggled off; user can adjust manually
  }, [hasTakeawayWithDineIn]);  const [notes, setNotes] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "takeaway") {
      setIsTakeaway(true);
      setIsDelivery(false);
      setTable("");
    }
  }, [searchParams]);

  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));

  const adjustQty = (prod, delta) => {
    const prodId = prod._id || prod.id;
    setItems((prev) => {
      const idx = prev.findIndex((i) => (i._id || i.id) === prodId);
      if (idx === -1) {
        if (delta <= 0) return prev;
        // Add new product with normalized ID and inherit global takeaway flag
        return [...prev, { ...prod, _id: prodId, qty: delta, isTakeaway: hasTakeawayWithDineIn }];
      }
      const newQty = prev[idx].qty + delta;
      if (newQty < 1) {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      }
      const copy = [...prev];
      copy[idx] = { ...copy[idx], qty: newQty };
      return copy;
    });
  };

  const toggleItemTakeaway = (prodId) => {
    setItems(prev => 
      prev.map(i =>
        (i._id || i.id) === prodId ? { ...i, isTakeaway: !i.isTakeaway } : i
      )
    );
  };

  const handleSubmit = async () => {
    if (!isTakeaway && !isDelivery) {
      alert("Please select takeaway or delivery mode.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one product.");
      return;
    }

    const orderData = {
      table: isDelivery
        ? DELIVERY_TABLE
        : TAKEAWAY_TABLE,
      orderItems: items, // Using orderItems to match controller expectations
      notes: notes.trim(),
      status: "Preparing",
      billDetails: {
        subtotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),
      },
      totalAmount: items.reduce((sum, i) => sum + i.price * i.qty, 0),
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim(),
      deliveryTime: isDelivery ? deliveryTime.trim() : "",
      // hasTakeaway should reflect whether any item is marked takeaway
      hasTakeaway: items.some(i => i.isTakeaway),
    };

    await addManualOrder(orderData);
    navigate("/admin/orders");
  };

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased pb-32">
      {/* Header */}
      <header className="p-6 border-b border-black/5 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <h1 className="text-2xl font-black uppercase tracking-tighter italic">Manual Order</h1>
        <div className="flex items-center gap-2 px-3 py-1 border-2 border-black font-bold text-xs uppercase">
          Admin Portal
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column: Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Select Items</h2>
              <span className="text-xs font-medium">{sorted.length} Products available</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sorted.map((p) => {
                const prodId = p._id || p.id;
                const existing = items.find((i) => (i._id || i.id) === prodId) || {};
                const currentQty = existing.qty || 0;
                const isTakeawayItem = existing.isTakeaway;
                return (
                  <div key={prodId} className={`relative p-4 border-2 transition-all flex flex-col justify-between 
                    ${currentQty > 0 ? 'border-black bg-gray-50' : 'border-gray-100'}
                    ${isTakeawayItem ? 'bg-orange-50 border-orange-200' : ''}`}>
                    {currentQty > 0 && (
                      <button
                        onClick={() => toggleItemTakeaway(prodId)}
                        className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${isTakeawayItem ? 'bg-orange-500 text-white' : 'bg-white text-gray-300 hover:bg-gray-200'}`}
                        title="Mark item as takeaway"
                      >
                        <Package size={16} />
                      </button>
                    )}
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <p className="font-bold text-lg leading-tight uppercase tracking-tight line-clamp-2">{p.name}</p>
                        <p className="text-sm font-medium text-gray-500 italic">₹{p.price}</p>
                      </div>
                      {p.image && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 bg-white">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button onClick={() => adjustQty(p, -1)} className="w-8 h-8 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="text-lg font-black w-6 text-center">{currentQty}</span>
                      <button onClick={() => adjustQty(p, 1)} className="w-8 h-8 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Details */}
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Order Mode</h2>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setIsTakeaway(!isTakeaway); if(!isTakeaway) { setIsDelivery(false); setHasTakeawayWithDineIn(false); }}}
                  className={`flex items-center justify-center gap-2 p-3 border-2 font-bold text-xs uppercase transition-all ${isTakeaway ? 'bg-black text-white border-black' : 'border-gray-100 hover:border-black'}`}
                >
                  <ShoppingCart size={16} /> Takeaway
                </button>
                <button 
                  onClick={() => { setIsDelivery(!isDelivery); if(!isDelivery) { setIsTakeaway(false); setHasTakeawayWithDineIn(false); }}}
                  className={`flex items-center justify-center gap-2 p-3 border-2 font-bold text-xs uppercase transition-all ${isDelivery ? 'bg-black text-white border-black' : 'border-gray-100 hover:border-black'}`}
                >
                  <MapPin size={16} /> Delivery
                </button>
              </div>

            </section>

            {isDelivery && (
              <section className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Customer Details</h2>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="NAME"
                    className="w-full p-3 border-2 border-gray-100 font-bold focus:border-black outline-none uppercase text-sm"
                  />
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="DELIVERY ADDRESS"
                    rows={2}
                    className="w-full p-3 border-2 border-gray-100 font-bold focus:border-black outline-none uppercase text-sm resize-none"
                  />
                  <input
                    type="text"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    placeholder="ESTIMATED DELIVERY TIME (E.G. 30-40 MINS)"
                    className="w-full p-3 border-2 border-gray-100 font-bold focus:border-black outline-none uppercase text-sm"
                  />
                </div>
              </section>
            )}

            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Additional Info</h2>
              <div className="relative border-2 border-gray-100 focus-within:border-black transition-colors">
                <div className="absolute top-3 left-3 text-gray-300">
                  <ClipboardList size={18} />
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="SPECIAL INSTRUCTIONS..."
                  className="w-full p-3 pl-10 bg-transparent font-medium outline-none text-sm min-h-[100px]"
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-6 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-left">
            <p className="text-xs font-bold text-gray-400 uppercase">Current Subtotal</p>
            <p className="text-3xl font-black italic tracking-tighter">₹{totalAmount.toFixed(2)}</p>
          </div>
          <button
            onClick={handleSubmit}
            className="w-full sm:w-auto px-12 py-4 bg-black text-white font-black uppercase italic hover:bg-gray-800 transition-all active:scale-95 disabled:bg-gray-200"
          >
            Confirm & Place Order
          </button>
        </div>
      </div>
    </div>
  );
}