import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, ShoppingCart, Receipt, ChefHat, Bell, HandHelping, CheckCircle2, Phone, X } from "lucide-react";
import { TAKEAWAY_TABLE } from "../context/CartContext";
import API from "../api/axios";
import { useUI } from "../context/UIContext";
import { useOrders } from "../context/OrderContext";

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hasUnreadOffer, setHasUnreadOffer] = useState(false);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [waiterCooldown, setWaiterCooldown] = useState(0);
  const [billCooldown, setBillCooldown] = useState(0);
  const [showCallSuccess, setShowCallSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", sub: "" });
  const [isNoOffersModalOpen, setIsNoOffersModalOpen] = useState(false);

  const { offers } = useUI();
  const { orders } = useOrders();

  const currentTable = searchParams.get("table")?.trim();
  const mode = searchParams.get("mode");

  // Track if a bill was requested for the current set of orders
  const [lastBillRequestedOrderCount, setLastBillRequestedOrderCount] = useState(() => {
    return parseInt(localStorage.getItem(`lastBillCount_${currentTable}`) || "0");
  });

  // Logic: Bill button is enabled if there are active orders for this table
  // AND the number of orders is greater than what was active during the last request.
  const canRequestBill = useMemo(() => {
    if (!currentTable || mode === "takeaway") return false;
    
    // Find active orders for this table
    const tableOrders = (orders || []).filter(o => 
      String(o.table) === String(currentTable) && 
      !["Cancelled", "Closed"].includes(o.status)
    );

    const activeCount = tableOrders.length;
    if (activeCount === 0) return false;

    // Enabled if more orders exist now than when bill was last pushed
    return activeCount > lastBillRequestedOrderCount;
  }, [orders, currentTable, mode, lastBillRequestedOrderCount]);

  const handleCallWaiter = async () => {
    if (!currentTable || mode === "takeaway" || waiterCooldown > 0) return;
    
    setIsCallingWaiter(true);
    try {
      await API.post("/notifications", {
        table: currentTable,
        type: "WaiterCall",
        message: `Table ${currentTable} is requesting assistance.`
      });
      setSuccessMessage({ title: "Waiter Called", sub: "Someone will assist you soon" });
      setShowCallSuccess(true);
      setWaiterCooldown(180); // 3 minutes
      setTimeout(() => setShowCallSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to call waiter:", error);
    } finally {
      setIsCallingWaiter(false);
    }
  };

  const handleRequestBill = async () => {
    if (!currentTable || mode === "takeaway") return;

    setIsRequestingBill(true);
    try {
      await API.post("/notifications", {
        table: currentTable,
        type: "BillRequested",
        message: `Table ${currentTable} is requesting the bill.`
      });
      setSuccessMessage({ title: "Bill Requested", sub: "Your bill is being prepared" });
      setShowCallSuccess(true);
      
      // Clear bill button state until a new order is made
      const activeCount = (orders || []).filter(o => 
        String(o.table) === String(currentTable) && 
        !["Cancelled", "Closed"].includes(o.status)
      ).length;
      
      setLastBillRequestedOrderCount(activeCount);
      localStorage.setItem(`lastBillCount_${currentTable}`, activeCount.toString());

      setTimeout(() => setShowCallSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to request bill:", error);
    } finally {
      setIsRequestingBill(false);
    }
  };

  useEffect(() => {
    let interval;
    if (waiterCooldown > 0) {
      interval = setInterval(() => {
        setWaiterCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [waiterCooldown]);

  // If all table orders are closed/cancelled, reset the last count
  useEffect(() => {
    if (!currentTable) return;
    const tableOrders = (orders || []).filter(o => 
      String(o.table) === String(currentTable) && 
      !["Cancelled", "Closed"].includes(o.status)
    );
    if (tableOrders.length === 0 && lastBillRequestedOrderCount > 0) {
      setLastBillRequestedOrderCount(0);
      localStorage.removeItem(`lastBillCount_${currentTable}`);
    }
  }, [orders, currentTable, lastBillRequestedOrderCount]);

  const getLinkWithTable = (path) => {
    // if we know this is a takeaway order, preserve that on nav
    if (mode === "takeaway") {
      return `${path}?mode=takeaway`;
    }
    if (!currentTable) return path;
    return `${path}?table=${currentTable}`;
  };

  const links = [
    { path: "/menu", label: "Menu", icon: Utensils },
    { path: "/cart", label: "Cart", icon: ShoppingCart },
    { path: "/order-summary", label: "Orders", icon: Receipt },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  // Show notification dot when offer is viewed/closed
  useEffect(() => {
    const handleOfferViewed = () => {
      setHasUnreadOffer(true);
    };
    window.addEventListener("offerViewed", handleOfferViewed);
    return () => window.removeEventListener("offerViewed", handleOfferViewed);
  }, []);

  // When bell is clicked → show offers again + clear notification
  const handleBellClick = () => {
    if (!offers || offers.length === 0) {
      setIsNoOffersModalOpen(true);
      setHasUnreadOffer(false);
      return;
    }
    setHasUnreadOffer(false);
    window.dispatchEvent(new Event("showOfferModal"));
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-3">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 group cursor-pointer"
              onClick={() => navigate(getLinkWithTable("/menu"))}
            >
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                <ChefHat className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                  {title || "MY CAFE"}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] mt-1">PREMIUM DINING</p>
              </div>
            </motion.div>

            <div className="flex items-center gap-5">
              {/* Request Bill Button - Desktop */}
              {currentTable && mode !== "takeaway" && (
                <button
                  onClick={handleRequestBill}
                  disabled={isRequestingBill || !canRequestBill}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border-2 ${
                    isRequestingBill || !canRequestBill
                      ? "bg-slate-50 border-slate-100 text-slate-300 opacity-60 cursor-not-allowed"
                      : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-500 shadow-sm"
                  }`}
                >
                  <Receipt size={20} className={isRequestingBill ? "animate-pulse" : ""} />
                  <span className="text-sm font-bold uppercase tracking-wider text-center min-w-[80px]">
                    {isRequestingBill ? "Requesting..." : "Get Bill"}
                  </span>
                </button>
              )}

              {/* Call Waiter Button - Desktop */}
              {currentTable && mode !== "takeaway" && (
                <button
                  onClick={handleCallWaiter}
                  disabled={isCallingWaiter || waiterCooldown > 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border-2 ${
                    isCallingWaiter || waiterCooldown > 0
                      ? "bg-amber-50 border-amber-200 text-amber-500 opacity-80 cursor-not-allowed"
                      : "bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-500"
                  }`}
                >
                  <HandHelping size={20} className={isCallingWaiter ? "animate-bounce" : ""} />
                  <span className="text-sm font-bold uppercase tracking-wider text-center min-w-[80px]">
                    {isCallingWaiter ? "Calling..." : waiterCooldown > 0 ? `${Math.floor(waiterCooldown / 60)}:${(waiterCooldown % 60).toString().padStart(2, '0')}` : "Call Waiter"}
                  </span>
                </button>
              )}

              {/* Notification Bell */}
              <button
                onClick={handleBellClick}
                className="relative p-2.5 rounded-full hover:bg-slate-100/80 transition-colors focus:outline-none"
              >
                <Bell size={22} className="text-slate-700" strokeWidth={2} />
                {hasUnreadOffer && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-[1.5rem] border border-slate-200/50">
                {links.map((link) => {
                  const active = isActive(link.path);
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.path}
                      onClick={() => navigate(getLinkWithTable(link.path))}
                      className={`relative px-6 py-2.5 rounded-[1.2rem] flex items-center gap-2 transition-all duration-300 ${
                        active ? "text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={18} strokeWidth={active ? 2.5 : 2} className="relative z-10" />
                      <span className="text-sm font-black uppercase tracking-widest relative z-10">
                        {link.label}
                      </span>
                      {active && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-slate-900 rounded-[1.2rem] shadow-lg"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-slate-100 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3" onClick={() => navigate(getLinkWithTable("/menu"))}>
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase">
            {title || "MY CAFE"}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Bill Request - Mobile */}
          {currentTable && mode !== "takeaway" && (
            <div className="relative mr-1">
              <button
                onClick={handleRequestBill}
                disabled={isRequestingBill || !canRequestBill}
                className={`p-2 rounded-full transition-all flex flex-col items-center justify-center min-w-[32px] ${
                  isRequestingBill || !canRequestBill ? "bg-slate-100 text-slate-300 opacity-50" : "text-slate-700 bg-slate-50 border border-slate-100"
                }`}
              >
                <Receipt size={20} strokeWidth={2.5} />
              </button>
              {canRequestBill && (
                <span className="absolute -top-2 right-0 translate-x-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full bg-emerald-500 text-white shadow-lg">
                  Bill
                </span>
              )}
            </div>
          )}

          {/* Call Waiter Button - Mobile */}
          {currentTable && mode !== "takeaway" && (
            <div className="relative">
              <button
                onClick={handleCallWaiter}
                disabled={isCallingWaiter || waiterCooldown > 0}
                className={`p-2 rounded-full transition-all flex flex-col items-center justify-center min-w-[32px] ${
                  isCallingWaiter || waiterCooldown > 0 ? "bg-amber-100 text-amber-600 animate-pulse opacity-80" : "text-slate-700 bg-slate-50 border border-slate-100"
                }`}
              >
                 {waiterCooldown > 0 ? (
                  <span className="text-[10px] font-black">{Math.ceil(waiterCooldown / 60)}m</span>
                ) : (
                  <Phone size={20} />
                )}
              </button>
              <span className="absolute -top-2 left-0 -translate-x-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-500 text-white shadow-lg">
                Waiter
              </span>
            </div>
          )}

          {/* Notification Bell - Mobile */}
          <button
            onClick={handleBellClick}
            className="relative p-2 focus:outline-none"
          >
            <Bell size={22} className="text-slate-700" />
            {hasUnreadOffer && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>

          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isNoOffersModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase">No Offers Right Now</h3>
                  <p className="mt-2 text-sm text-gray-500">We couldn’t find any active deals yet. Check back soon for new promotions.</p>
                </div>
                <button onClick={() => setIsNoOffersModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full">
                  <X size={18} />
                </button>
              </div>
              <button
                onClick={() => setIsNoOffersModalOpen(false)}
                className="mt-5 w-full px-4 py-2 rounded-xl bg-slate-900 text-white font-black uppercase text-xs tracking-wider focus:outline-none"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification Alert */}
      <AnimatePresence>
        {showCallSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md bg-slate-900 overflow-hidden"
          >
            {/* Animated background bar */}
            <motion.div 
               initial={{ x: "-100%" }}
               animate={{ x: "0%" }}
               transition={{ duration: 3, ease: "linear" }}
               className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" 
            />
            
            <CheckCircle2 size={24} className="text-emerald-400" />
            <div className="flex flex-col pr-2">
              <span className="text-sm font-black uppercase tracking-widest leading-none">
                {successMessage.title}
              </span>
              <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                {successMessage.sub}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t border-slate-100 pb-safe">
        <div className="flex items-center justify-around h-20 px-4">
          {links.map((link) => {
            const active = isActive(link.path);
            const Icon = link.icon;

            return (
              <button
                key={link.path}
                onClick={() => navigate(getLinkWithTable(link.path))}
                className="relative flex flex-col items-center justify-center w-full h-full"
              >
                <div
                  className={`relative z-10 flex flex-col items-center transition-all duration-300 ${
                    active ? "text-slate-900 scale-110" : "text-slate-400"
                  }`}
                >
                  <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest mt-1 transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {link.label}
                  </span>
                </div>

                {active && (
                  <motion.div
                    layoutId="mobileActiveBG"
                    className="absolute inset-x-2 inset-y-2 bg-slate-50 rounded-2xl -z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}

                {active && (
                  <motion.div
                    layoutId="topBar"
                    className="absolute top-0 w-12 h-1 bg-slate-900 rounded-b-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}