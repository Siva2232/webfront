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
import StickyPageHeader from "./components/StickyPageHeader";

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
        !["Served", "Cancelled", "Closed"].includes(String(o.status || "").trim())
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
    <div
      className="relative flex min-h-full w-full max-w-full flex-col overflow-x-hidden bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/50 pb-[max(11rem,calc(env(safe-area-inset-bottom,0px)+10rem))] font-sans text-zinc-900 antialiased"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(24,24,27,0.04),transparent)]"
        aria-hidden
      />
      <StickyPageHeader
        icon={ClipboardList}
        eyebrow="Orders"
        title={isAddMoreMode ? "Add more items" : "Manual order"}
        subtitle="Create an order or add items to an existing one"
        rightAddon={
          <>
            {isAddMoreMode && (
              <button
                type="button"
                onClick={handleCancelAddMore}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
            )}
            <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 shadow-inner sm:flex">
              <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-700" />
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-700">
                Admin
              </span>
            </div>
          </>
        }
      />

      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-start xl:gap-10">
          
          {/* Products — wide column */}
          <ProductSelection
            filteredProducts={filteredProducts}
            itemsMap={itemsMap}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onAdjustQty={adjustQty}
            onToggleTakeaway={toggleItemTakeaway}
            onOpenCustomise={openCustomise}
          />

          {/* Order details — scrollable panel on wide screens */}
          <div className="min-w-0 space-y-6 xl:sticky xl:top-20 xl:col-span-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:overflow-x-hidden xl:pr-1 xl:[scrollbar-gutter:stable]">
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
            <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5 sm:p-5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Order mode</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button 
                  type="button"
                  onClick={() => { setIsDineIn(!isDineIn); if(!isDineIn) { setIsTakeaway(false); setIsDelivery(false); }}}
                  className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-2 px-2 py-3 text-xs font-bold uppercase transition-all ${isDineIn ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-200 text-zinc-800 hover:border-zinc-400"}`}
                >
                  <Package size={16} className="shrink-0" /> <span className="truncate">Dine-in</span>
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsTakeaway(!isTakeaway); if(!isTakeaway) { setIsDelivery(false); setIsDineIn(false); setHasTakeawayWithDineIn(false); }}}
                  className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-2 px-2 py-3 text-xs font-bold uppercase transition-all ${isTakeaway ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-800 hover:border-zinc-400"}`}
                >
                  <ShoppingCart size={16} className="shrink-0" /> <span className="truncate">Takeaway</span>
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsDelivery(!isDelivery); if(!isDelivery) { setIsTakeaway(false); setIsDineIn(false); setHasTakeawayWithDineIn(false); }}}
                  className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-2 px-2 py-3 text-xs font-bold uppercase transition-all ${isDelivery ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-800 hover:border-zinc-400"}`}
                >
                  <MapPin size={16} className="shrink-0" /> <span className="truncate">Delivery</span>
                </button>
              </div>

              {/* Dine-in Table Number Input */}
              {isDineIn && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    value={dineInTable}
                    onChange={(e) => setDineInTable(e.target.value)}
                    placeholder="Table number (e.g. 5, A1)"
                    className="w-full min-w-0 rounded-xl border-2 border-emerald-200 bg-emerald-50/80 p-3 text-sm font-bold uppercase outline-none focus:border-emerald-500"
                  />
                </div>
              )}

            </section>
            )}

            {isDelivery && (
              <section className="animate-in fade-in slide-in-from-top-2 space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5 sm:p-5">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Customer details</h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Name"
                    className="w-full min-w-0 rounded-xl border-2 border-zinc-200 p-3 text-sm font-bold uppercase outline-none focus:border-zinc-900"
                  />
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Delivery address"
                    rows={3}
                    className="w-full min-w-0 resize-y rounded-xl border-2 border-zinc-200 p-3 text-sm font-bold uppercase outline-none focus:border-zinc-900"
                  />
                  <input
                    type="text"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    placeholder="Estimated delivery time"
                    className="w-full min-w-0 rounded-xl border-2 border-zinc-200 p-3 text-sm font-bold uppercase outline-none focus:border-zinc-900"
                  />
                </div>
              </section>
            )}

            <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5 sm:p-5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Additional info</h2>
              <div className="relative rounded-xl border-2 border-zinc-200 transition-colors focus-within:border-zinc-400">
                <div className="pointer-events-none absolute left-3 top-3 text-zinc-400">
                  <ClipboardList size={18} />
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions…"
                  rows={4}
                  className="min-h-[6.5rem] w-full min-w-0 resize-y bg-transparent p-3 pl-10 text-sm font-medium outline-none"
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Floating action bar — safe-area aware so content isn’t hidden behind home indicator */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[35] border-t bg-white/98 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.08)] backdrop-blur-md ${
          isAddMoreMode ? "border-zinc-300" : "border-zinc-200"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0 w-full text-center sm:flex-1">
            <p className="text-xs font-bold uppercase text-zinc-500">
              {isAddMoreMode ? "Adding items worth" : "Current subtotal"}
            </p>
            <p className="text-2xl font-black tabular-nums tracking-tighter text-zinc-900 sm:text-3xl">
              ₹{totalAmount.toFixed(2)}
            </p>
            {isAddMoreMode && selectedExistingOrder && (
              <p className="mt-1 break-words text-center text-xs font-medium leading-snug text-zinc-600">
                + ₹{selectedExistingOrder.totalAmount?.toFixed(0) || 0} existing → ₹
                {(totalAmount + (selectedExistingOrder.totalAmount || 0)).toFixed(2)} total
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className={`w-full shrink-0 rounded-xl px-8 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-zinc-900/15 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:shadow-none sm:w-auto sm:min-w-[14rem] sm:py-4 ${
              isAddMoreMode ? "bg-zinc-800 hover:bg-zinc-900" : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {isAddMoreMode ? "Add items to order" : "Confirm & place order"}
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