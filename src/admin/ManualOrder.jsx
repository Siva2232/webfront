import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrderContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";
import { ClipboardList, AlertCircle, CheckCircle, Package, ShoppingCart, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import SubItemModal from "../components/SubItemModal";
import ProductSelection from "./manualOrder/components/ProductSelection";
import ExistingOrderPicker from "./manualOrder/components/ExistingOrderPicker";
import OrderConfirmModal from "./manualOrder/components/OrderConfirmModal";

export default function ManualOrder() {
  const { products = [] } = useProducts();
  const { addManualOrder, orders = [], fetchOrders } = useOrders();
  // table number removed; order mode determines destination
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [isDelivery, setIsDelivery] = useState(false);
  const [isDineIn, setIsDineIn] = useState(false);
  const [dineInTable, setDineInTable] = useState("");
  // New: flag for dine-in orders that also include takeaway items (single bill)
  const [hasTakeawayWithDineIn, setHasTakeawayWithDineIn] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");

  // Add More Items: track if adding to an existing order
  const [isAddMoreMode, setIsAddMoreMode] = useState(false);
  const [selectedExistingOrder, setSelectedExistingOrder] = useState(null);

  // Search filter for products
  const [searchQuery, setSearchQuery] = useState("");

  // SubItem modal state
  const [subItemProduct, setSubItemProduct] = useState(null);
  const [showSubItemModal, setShowSubItemModal] = useState(false);

  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);

  // Fetch orders on mount for "Add More Items" functionality
  useEffect(() => {
    fetchOrders();
  }, []);

  // Memoize filtered active orders to prevent recalculation on every render
  // Include ALL active orders (dine-in, takeaway, delivery) for Add More Items
  const activeOrders = useMemo(() => 
    orders.filter(
      (o) =>
        o.status !== "Served" &&
        o.status !== "Cancelled"
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders]
  );

  // When selecting an existing order, pre-fill customer details
  useEffect(() => {
    if (selectedExistingOrder) {
      setCustomerName(selectedExistingOrder.customerName || "");
      setCustomerAddress(selectedExistingOrder.customerAddress || "");
      setDeliveryTime(selectedExistingOrder.deliveryTime || "");
      // Set mode based on existing order type
      const table = selectedExistingOrder.table;
      if (table === DELIVERY_TABLE || table === "DELIVERY") {
        setIsDelivery(true);
        setIsTakeaway(false);
      } else if (table === TAKEAWAY_TABLE || table === "TAKEAWAY" || !table) {
        setIsTakeaway(true);
        setIsDelivery(false);
      } else {
        // Dine-in order (has a table number) - don't set takeaway/delivery flags
        setIsTakeaway(false);
        setIsDelivery(false);
      }
    }
  }, [selectedExistingOrder]);

  // when user toggles global dine-in+takeaway switch, mark all existing items
  useEffect(() => {
    if (hasTakeawayWithDineIn) {
      setItems(prev => prev.map(i => ({ ...i, isTakeaway: true })));
    }
    // do not clear individual flags when toggled off; user can adjust manually
  }, [hasTakeawayWithDineIn]);
  
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "takeaway") {
      setIsTakeaway(true);
      setIsDelivery(false);
    }
  }, [searchParams]);

  // Memoize sorted and filtered products for performance
  const filteredProducts = useMemo(() => {
    let result = [...products].sort((a, b) => a.name.localeCompare(b.name));
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }
    return result;
  }, [products, searchQuery]);

  // Create a map of item quantities for O(1) lookup
  // For products with cartKey (configured items), aggregate qty by product ID
  const itemsMap = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const id = item._id || item.id;
      if (map.has(id)) {
        const existing = map.get(id);
        map.set(id, { ...existing, qty: existing.qty + item.qty });
      } else {
        map.set(id, item);
      }
    });
    return map;
  }, [items]);

  const adjustQty = useCallback((prod, delta) => {
    const prodId = prod._id || prod.id;
    setItems((prev) => {
      const idx = prev.findIndex((i) => (i._id || i.id) === prodId);
      if (idx === -1) {
        if (delta <= 0) return prev;
        // Add new product with normalized ID
        return [...prev, { ...prod, _id: prodId, qty: delta, isTakeaway: false }];
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
  }, []);

  const toggleItemTakeaway = useCallback((prodId) => {
    setItems(prev => 
      prev.map(i =>
        (i._id || i.id) === prodId ? { ...i, isTakeaway: !i.isTakeaway } : i
      )
    );
  }, []);

  // Open SubItem customisation modal
  const openCustomise = useCallback((product) => {
    setSubItemProduct(product);
    setShowSubItemModal(true);
  }, []);

  // Handle configured item from SubItem modal
  const handleConfiguredAdd = useCallback((configuredItem) => {
    setItems((prev) => {
      const cartKey = configuredItem.cartKey;
      if (cartKey) {
        const idx = prev.findIndex((i) => i.cartKey === cartKey);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + configuredItem.qty };
          return copy;
        }
      }
      return [...prev, { ...configuredItem, isTakeaway: false }];
    });
  }, []);

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateOrder = () => {
    if (!isAddMoreMode && !isTakeaway && !isDelivery && !isDineIn) {
      toast.error("Please select an order mode.", { icon: <AlertCircle size={18} /> });
      return false;
    }
    if (!isAddMoreMode && isDineIn && !dineInTable.trim()) {
      toast.error("Please enter a table number for dine-in.", { icon: <AlertCircle size={18} /> });
      return false;
    }
    if (items.length === 0) {
      toast.error("Please add at least one product.", { icon: <AlertCircle size={18} /> });
      return false;
    }
    if (isAddMoreMode && !selectedExistingOrder) {
      toast.error("Please select an existing order to add items to.", { icon: <AlertCircle size={18} /> });
      return false;
    }
    return true;
  };

  const handleConfirmClick = () => {
    if (validateOrder()) {
      setShowConfirmModal(true);
    }
  };

  const handleSubmit = async () => {
    if (!validateOrder()) return;

    setIsSubmitting(true);
    // Determine table: in Add More mode, use the existing order's table
    let orderTable;
    if (isAddMoreMode && selectedExistingOrder) {
      orderTable = selectedExistingOrder.table;
    } else if (isDineIn) {
      orderTable = dineInTable.trim();
    } else {
      orderTable = isDelivery ? DELIVERY_TABLE : TAKEAWAY_TABLE;
    }
    const orderData = {
      table: orderTable,
      orderItems: items,
      notes: notes.trim(),
      status: "Preparing",
      billDetails: {
        subtotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),
      },
      totalAmount: items.reduce((sum, i) => sum + i.price * i.qty, 0),
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim(),
      deliveryTime: isDelivery ? deliveryTime.trim() : "",
      hasTakeaway: items.some(i => i.isTakeaway),
      existingOrderId: isAddMoreMode && selectedExistingOrder ? selectedExistingOrder._id : undefined,
    };

    try {
      const response = await addManualOrder(orderData);
      setShowConfirmModal(false);
      
      const tokenMsg = response?.tokenNumber ? ` (Token #${response.tokenNumber})` : "";
      
      toast.success(
        isAddMoreMode 
          ? `Items added to order #${(selectedExistingOrder._id || "").slice(-5)}!`
          : `Order placed successfully!${tokenMsg}`,
        { 
          icon: <CheckCircle size={18} className="text-emerald-500" />,
          duration: 3000,
        }
      );
      setTimeout(() => navigate("/admin/orders"), 500);
    } catch (error) {
      toast.error("Failed to place order. Please try again.", { icon: <AlertCircle size={18} /> });
      setIsSubmitting(false);
    }
  };

  // Reset Add More mode
  const handleCancelAddMore = () => {
    setIsAddMoreMode(false);
    setSelectedExistingOrder(null);
    setCustomerName("");
    setCustomerAddress("");
    setDeliveryTime("");
    setItems([]);
  };

  // Memoize total calculation
  const totalAmount = useMemo(() => 
    items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased pb-32">
      {/* Header */}
      <header className="p-6 border-b border-black/5 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <h1 className="text-2xl font-black uppercase tracking-tighter italic">
          {isAddMoreMode ? "Add More Items" : "Manual Order"}
        </h1>
        <div className="flex items-center gap-2">
          {isAddMoreMode && (
            <button
              onClick={handleCancelAddMore}
              className="px-3 py-1 border-2 border-gray-300 font-bold text-xs uppercase hover:border-black transition-colors"
            >
              Cancel
            </button>
          )}
          <div className="px-3 py-1 border-2 border-black font-bold text-xs uppercase">
            Admin Portal
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column: Product Selection */}
          <ProductSelection
            filteredProducts={filteredProducts}
            itemsMap={itemsMap}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onAdjustQty={adjustQty}
            onToggleTakeaway={toggleItemTakeaway}
            onOpenCustomise={openCustomise}
          />

          {/* Right Column: Order Details */}
          <div className="space-y-8">
            {/* Add More Items Section */}
            <ExistingOrderPicker
              isAddMoreMode={isAddMoreMode}
              activeOrders={activeOrders}
              selectedExistingOrder={selectedExistingOrder}
              onEnterAddMoreMode={() => {
                setIsAddMoreMode(true);
                setIsTakeaway(false);
                setIsDelivery(false);
              }}
              onCancelAddMore={handleCancelAddMore}
              onSelectExistingOrder={setSelectedExistingOrder}
            />

            {/* Order Mode - only show when not in Add More mode */}
            {!isAddMoreMode && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Order Mode</h2>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => { setIsDineIn(!isDineIn); if(!isDineIn) { setIsTakeaway(false); setIsDelivery(false); }}}
                  className={`flex items-center justify-center gap-2 p-3 border-2 font-bold text-xs uppercase transition-all ${isDineIn ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-100 hover:border-black'}`}
                >
                  <Package size={16} /> Dine-in
                </button>
                <button 
                  onClick={() => { setIsTakeaway(!isTakeaway); if(!isTakeaway) { setIsDelivery(false); setIsDineIn(false); setHasTakeawayWithDineIn(false); }}}
                  className={`flex items-center justify-center gap-2 p-3 border-2 font-bold text-xs uppercase transition-all ${isTakeaway ? 'bg-black text-white border-black' : 'border-gray-100 hover:border-black'}`}
                >
                  <ShoppingCart size={16} /> Takeaway
                </button>
                <button 
                  onClick={() => { setIsDelivery(!isDelivery); if(!isDelivery) { setIsTakeaway(false); setIsDineIn(false); setHasTakeawayWithDineIn(false); }}}
                  className={`flex items-center justify-center gap-2 p-3 border-2 font-bold text-xs uppercase transition-all ${isDelivery ? 'bg-black text-white border-black' : 'border-gray-100 hover:border-black'}`}
                >
                  <MapPin size={16} /> Delivery
                </button>
              </div>

              {/* Dine-in Table Number Input */}
              {isDineIn && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    value={dineInTable}
                    onChange={(e) => setDineInTable(e.target.value)}
                    placeholder="TABLE NUMBER (E.G. 5, A1)"
                    className="w-full p-3 border-2 border-emerald-200 bg-emerald-50 font-bold focus:border-emerald-500 outline-none uppercase text-sm"
                  />
                </div>
              )}

            </section>
            )}

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
                  className="w-full p-3 pl-10 bg-transparent font-medium outline-none text-sm min-h-25"
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Floating Action Bar */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t-4 p-6 z-20 ${isAddMoreMode ? 'border-indigo-500' : 'border-black'}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-left">
            <p className="text-xs font-bold text-gray-400 uppercase">
              {isAddMoreMode ? "Adding Items Worth" : "Current Subtotal"}
            </p>
            <p className="text-3xl font-black italic tracking-tighter">₹{totalAmount.toFixed(2)}</p>
            {isAddMoreMode && selectedExistingOrder && (
              <p className="text-xs text-indigo-600 font-medium mt-1">
                + ₹{selectedExistingOrder.totalAmount?.toFixed(0) || 0} existing = ₹{(totalAmount + (selectedExistingOrder.totalAmount || 0)).toFixed(2)} total
              </p>
            )}
          </div>
          <button
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-12 py-4 text-white font-black uppercase italic transition-all active:scale-95 disabled:bg-gray-200 disabled:cursor-not-allowed ${
              isAddMoreMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-black hover:bg-gray-800'
            }`}
          >
            {isAddMoreMode ? "Add Items to Order" : "Confirm & Place Order"}
          </button>
        </div>
      </div>

      <OrderConfirmModal
        open={showConfirmModal}
        isSubmitting={isSubmitting}
        isAddMoreMode={isAddMoreMode}
        selectedExistingOrder={selectedExistingOrder}
        isDineIn={isDineIn}
        dineInTable={dineInTable}
        isDelivery={isDelivery}
        items={items}
        totalAmount={totalAmount}
        customerName={customerName}
        onClose={() => setShowConfirmModal(false)}
        onSubmit={handleSubmit}
      />

      {/* SubItem Customisation Modal */}
      <SubItemModal
        product={subItemProduct}
        isOpen={showSubItemModal}
        onClose={() => { setShowSubItemModal(false); setSubItemProduct(null); }}
        onAddToCart={handleConfiguredAdd}
      />
    </div>
  );
}