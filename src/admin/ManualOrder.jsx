import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useProducts } from "../context/ProductContext";
import { useOrders } from "../context/OrderContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TAKEAWAY_TABLE, DELIVERY_TABLE } from "../context/CartContext";
import { Plus, Minus, ShoppingCart, MapPin, ClipboardList, Package, PlusCircle, User, Clock, Search, X, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import SubItemModal from "../components/SubItemModal";

// Memoized Product Card for better performance
const ProductCard = memo(function ProductCard({ product, qty, isTakeawayItem, onAdjustQty, onToggleTakeaway, onOpenCustomise }) {
  const prodId = product._id || product.id;
  const hasCustomisation = (product.hasPortions && product.portions?.length > 0) || (product.addonGroups?.length > 0);
  
  return (
    <div className={`relative p-4 border-2 transition-all flex flex-col justify-between 
      ${qty > 0 ? 'border-black bg-gray-50' : 'border-gray-100'}
      ${isTakeawayItem ? 'bg-orange-50 border-orange-200' : ''}`}>
      {qty > 0 && (
        <button
          onClick={() => onToggleTakeaway(prodId)}
          className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${isTakeawayItem ? 'bg-orange-500 text-white' : 'bg-white text-gray-300 hover:bg-gray-200'}`}
          title="Mark item as takeaway"
        >
          <Package size={16} />
        </button>
      )}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex-1">
          <p className="font-bold text-lg leading-tight uppercase tracking-tight line-clamp-2">{product.name}</p>
          <p className="text-sm font-medium text-gray-500 italic">₹{product.price}</p>
          {hasCustomisation && (
            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">Customisable</p>
          )}
        </div>
        {product.image && (
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 shrink-0 bg-white">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <button onClick={() => onAdjustQty(product, -1)} className="w-8 h-8 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors">
          <Minus size={14} />
        </button>
        <span className="text-lg font-black w-6 text-center">{qty}</span>
        <button onClick={() => {
          if (hasCustomisation) {
            onOpenCustomise(product);
          } else {
            onAdjustQty(product, 1);
          }
        }} className="w-8 h-8 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
});

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
      await addManualOrder(orderData);
      setShowConfirmModal(false);
      toast.success(
        isAddMoreMode 
          ? `Items added to order #${(selectedExistingOrder._id || "").slice(-5)}!`
          : "Order placed successfully!",
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
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Select Items</h2>
              <span className="text-xs font-medium">{filteredProducts.length} Products</span>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 font-medium focus:border-black outline-none text-sm"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProducts.map((p) => {
                const prodId = p._id || p.id;
                const existing = itemsMap.get(prodId);
                const currentQty = existing?.qty || 0;
                const isTakeawayItem = existing?.isTakeaway || false;
                return (
                  <ProductCard
                    key={prodId}
                    product={p}
                    qty={currentQty}
                    isTakeawayItem={isTakeawayItem}
                    onAdjustQty={adjustQty}
                    onToggleTakeaway={toggleItemTakeaway}
                    onOpenCustomise={openCustomise}
                  />
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Details */}
          <div className="space-y-8">
            {/* Add More Items Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Add to Existing Order</h2>
              {!isAddMoreMode ? (
                <button
                  onClick={() => {
                    setIsAddMoreMode(true);
                    setIsTakeaway(false);
                    setIsDelivery(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-600 font-bold text-xs uppercase transition-all hover:border-indigo-500 hover:bg-indigo-100"
                >
                  <PlusCircle size={18} /> Add More Items to Existing Order
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Select an active order to add items:</p>
                  {activeOrders.length === 0 ? (
                    <p className="text-xs text-gray-400 italic p-3 bg-gray-50 border border-gray-100">
                      No active orders found.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 p-2">
                      {activeOrders.map((order) => (
                        <button
                          key={order._id}
                          onClick={() => setSelectedExistingOrder(order)}
                          className={`w-full text-left p-3 border-2 transition-all ${
                            selectedExistingOrder?._id === order._id
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-100 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {order.table === DELIVERY_TABLE || order.table === "DELIVERY" ? (
                                <MapPin size={14} className="text-indigo-500" />
                              ) : order.table === TAKEAWAY_TABLE || order.table === "TAKEAWAY" || !order.table ? (
                                <ShoppingCart size={14} className="text-orange-500" />
                              ) : (
                                <Package size={14} className="text-emerald-500" />
                              )}
                              <span className="font-bold text-xs uppercase">
                                {order.table === DELIVERY_TABLE || order.table === "DELIVERY" 
                                  ? "Delivery" 
                                  : order.table === TAKEAWAY_TABLE || order.table === "TAKEAWAY" || !order.table
                                    ? "Takeaway"
                                    : `Table ${order.table}`}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-gray-400">
                              #{(order._id || "").slice(-5)}
                            </span>
                          </div>
                          {order.customerName && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <User size={10} /> {order.customerName}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                            <Clock size={10} /> {order.items?.length || 0} items • ₹{order.totalAmount?.toFixed(0) || 0}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedExistingOrder && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 text-xs">
                      <p className="font-bold text-indigo-700">Adding items to:</p>
                      <p className="text-indigo-600">
                        {selectedExistingOrder.customerName || "Order"} #{(selectedExistingOrder._id || "").slice(-5)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

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

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isSubmitting && setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`p-6 ${isAddMoreMode ? 'bg-indigo-500' : 'bg-black'} text-white`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    {isAddMoreMode ? "Confirm Add Items" : "Confirm Order"}
                  </h3>
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isSubmitting}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Order Type */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  {(() => {
                    // Determine order type display for modal
                    let table;
                    if (isAddMoreMode && selectedExistingOrder) {
                      table = selectedExistingOrder.table;
                    } else if (isDineIn) {
                      table = dineInTable.trim();
                    } else {
                      table = isDelivery ? DELIVERY_TABLE : TAKEAWAY_TABLE;
                    }
                    const isDeliveryOrder = table === DELIVERY_TABLE || table === "DELIVERY";
                    const isTakeawayOrder = table === TAKEAWAY_TABLE || table === "TAKEAWAY" || !table;
                    const isDineInOrder = !isDeliveryOrder && !isTakeawayOrder;
                    
                    return (
                      <>
                        {isDeliveryOrder ? <MapPin size={20} className="text-indigo-500" /> 
                          : isTakeawayOrder ? <ShoppingCart size={20} className="text-orange-500" />
                          : <Package size={20} className="text-emerald-500" />}
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-bold">Order Type</p>
                          <p className="font-bold">
                            {isDeliveryOrder ? "Delivery" : isTakeawayOrder ? "Takeaway" : `Dine-in • Table ${table}`}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Customer Name */}
                {customerName && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <User size={20} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Customer</p>
                      <p className="font-bold">{customerName}</p>
                    </div>
                  </div>
                )}

                {/* Items Summary */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-2">Items ({items.length})</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {items.map((item, idx) => {
                      const addonsTotal = item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0;
                      const basePrice = item.price - addonsTotal;
                      return (
                        <div key={idx} className="text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{item.name} × {item.qty}</span>
                            <span className="text-gray-500">₹{(item.price * item.qty).toFixed(0)}</span>
                          </div>
                          {item.selectedPortion && (
                            <span className="text-[10px] text-blue-600 font-bold ml-2">Portion: {item.selectedPortion}</span>
                          )}
                          {item.selectedAddons?.length > 0 && (
                            <div className="ml-2 space-y-0.5">
                              {item.selectedAddons.map((a, i) => (
                                <div key={i} className="flex justify-between text-[10px] text-emerald-600">
                                  <span>+ {a.name}</span>
                                  <span className="text-gray-400">₹{a.price}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-500 uppercase">Total</span>
                    <span className="text-2xl font-black">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  {isAddMoreMode && selectedExistingOrder && (
                    <p className="text-xs text-indigo-600 mt-1 text-right">
                      New total: ₹{(totalAmount + (selectedExistingOrder.totalAmount || 0)).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 font-bold uppercase text-sm hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 text-white font-bold uppercase text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isAddMoreMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-black hover:bg-gray-800'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      {isAddMoreMode ? "Add Items" : "Place Order"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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