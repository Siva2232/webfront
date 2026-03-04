import React, { useEffect, useRef, useState } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import {
  Bell,
  ShoppingBag,
  ArrowRight,
  Trash2,
  Ticket,
  CheckCircle2,
  ChefHat,
  PlusCircle,
  X
} from "lucide-react";

// Direct socket connection for notifications (backup to window events)
const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000");

export default function Notification({ targetPath = "/admin/orders" }) {
  // toast for pop‑ups
  const navigate = useNavigate();
  
  // helper to show a toast for a single order
  const showOrderToast = (order) => {
    const timestamp = order.createdAt ? new Date(order.createdAt).toLocaleString() : null;
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onClick={() => {
          navigate(targetPath);
          toast.dismiss(t.id);
        }}
        className="bg-white shadow-xl rounded-3xl p-4 flex flex-col cursor-pointer max-w-xs ring-1 ring-orange-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-orange-500" />
            <div>
              <p className="font-black text-sm">
                {order.table === "TAKEAWAY" ? "Takeaway" : `Table ${order.table}`}
              </p>
              <p className="text-[10px] text-zinc-500">
                {order.items.length} item{order.items.length !== 1 && "s"}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="text-zinc-400 hover:text-zinc-600 ml-2"
          >
            <X size={16} />
          </button>
        </div>
        {timestamp && (
          <p className="mt-1 text-[9px] text-zinc-400">{timestamp}</p>
        )}
      </motion.div>
    ), { duration: 5000 });
  };
  const { orders } = useOrders();

  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [isNewOrder, setIsNewOrder] = useState(false);
  
  // Track "Add More Items" notifications
  const [addMoreNotifications, setAddMoreNotifications] = useState([]);

  const seenOrderIds = useRef(new Set());
  const pulseTimeout = useRef(null);
  const containerRef = useRef(null);
  const socketRef = useRef(null);
  
  /* 🔊 SOUND LOGIC */
  const audioRef = useRef(
    new Audio("https://assets.mixkit.co/active_storage/sfx/2847/2847-preview.mp3")
  );

  // Helper to trigger notification alert
  const triggerAlert = () => {
    setIsNewOrder(true);
    clearTimeout(pulseTimeout.current);
    pulseTimeout.current = setTimeout(() => {
      setIsNewOrder(false);
    }, 10000);
    
    // Play sound
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  // Helper to handle Add More Items notification
  const handleAddMoreData = (data) => {
    if (!data || !data.order) return;
    
    const notifId = `addmore-${data.order._id || data.order.id}-${Date.now()}`;
    setAddMoreNotifications((prev) => [
      { id: notifId, ...data },
      ...prev.slice(0, 9), // Keep max 10
    ]);
    
    triggerAlert();
    console.log("[Notification] Add More Items received:", data);
  };

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (open && containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Direct socket connection for "Add More Items" notifications
  // This ensures notifications work even if OrderContext socket has issues
  useEffect(() => {
    // Create dedicated socket for notifications
    const notifSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = notifSocket;
    
    notifSocket.on("connect", () => {
      console.log("[Notification] Socket connected");
    });
    
    // Listen directly for orderItemsAdded event
    notifSocket.on("orderItemsAdded", (data) => {
      console.log("[Notification] Socket received orderItemsAdded:", data);
      handleAddMoreData(data);
    });
    
    // Also listen for window custom event (from OrderContext) as backup
    const handleWindowEvent = (e) => {
      console.log("[Notification] Window event received:", e.detail);
      handleAddMoreData(e.detail);
    };
    
    window.addEventListener("orderItemsAdded", handleWindowEvent);
    
    return () => {
      window.removeEventListener("orderItemsAdded", handleWindowEvent);
      notifSocket.off("orderItemsAdded");
      notifSocket.disconnect();
    };
  }, []);

  const dismissAddMore = (id) => {
    setAddMoreNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllAddMore = () => {
    setAddMoreNotifications([]);
  };

  const pendingOrders = orders
    .filter((o) => {
      const oid = o._id || o.id;
      return (
        (o.status === "Preparing" || o.status === "Pending") &&
        !dismissedIds.includes(oid)
      );
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  /* 🔔 NEW ORDER DETECTION — SAME LOGIC + SHAKE DURATION FIX */
  useEffect(() => {
    let hasNew = false;
    const newOrders = [];

    pendingOrders.forEach((order) => {
      const oid = order._id || order.id;
      if (!seenOrderIds.current.has(oid)) {
        hasNew = true;
        newOrders.push(order);
        seenOrderIds.current.add(oid);
      }
    });

    if (hasNew) {
      // play sound & shake bell
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});

      setIsNewOrder(true);

      clearTimeout(pulseTimeout.current);
      pulseTimeout.current = setTimeout(() => {
        setIsNewOrder(false);
      }, 10000); // ✅ SHAKE FOR 10 SECONDS

      // show a toast popup for each new order so all panels see it
      // iterate oldest→newest so the most recent order ends up at the top of the stack
      newOrders.slice().reverse().forEach(showOrderToast);
    }

    return () => clearTimeout(pulseTimeout.current);
  }, [pendingOrders]);

  const markAsRead = (id) =>
    setDismissedIds((prev) => [...prev, id]);

  const clearAll = () =>
    setDismissedIds((prev) => [
      ...prev,
      ...pendingOrders.map((o) => o._id || o.id),
    ]);

  return (
    <div className="relative" ref={containerRef}>
      {/* 🔔 Bell */}
      <button
        onClick={() => setOpen(!open)}
        className={`group relative p-3 rounded-2xl transition-all duration-500 ${
          open
            ? "bg-zinc-900 text-white shadow-xl"
            : "hover:bg-zinc-100 text-zinc-600"
        }`}
      >
        <motion.div
          animate={
            isNewOrder
              ? {
                  rotate: [0, -20, 20, -20, 20, 0],
                  scale: [1, 1.2, 1],
                }
              : { rotate: 0, scale: 1 }
          }
          transition={{
            duration: 0.6,
            repeat: isNewOrder ? Infinity : 0, // ✅ CONTINUOUS SHAKE
          }}
        >
          <Bell className="w-6 h-6" />
        </motion.div>

        {(pendingOrders.length > 0 || addMoreNotifications.length > 0) && (
          <span className="absolute top-2 right-2 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500 border-2 border-white" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed sm:absolute right-4 sm:right-0 w-[calc(100vw-32px)] sm:w-[420px] top-20 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.12)] border border-zinc-100 rounded-[2.5rem] overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                  <ChefHat size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black">Kitchen Alerts</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                    Orders & Updates
                  </p>
                </div>
              </div>

              {(pendingOrders.length > 0 || addMoreNotifications.length > 0) && (
                <button
                  onClick={() => { clearAll(); clearAllAddMore(); }}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-rose-500 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear All
                </button>
              )}
            </div>

            {/* Add More Items Section */}
            {addMoreNotifications.length > 0 && (
              <div className="px-4 pb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1">
                  <PlusCircle size={10} /> Items Added to Orders
                </p>
                <div className="space-y-2">
                  {addMoreNotifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center justify-between"
                    >
                      <div 
                        onClick={() => { navigate(targetPath); setOpen(false); }}
                        className="cursor-pointer flex items-center gap-3"
                      >
                        <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                          <PlusCircle size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-800">
                            {notif.table === "TAKEAWAY" ? "Takeaway" : `Table ${notif.table}`}
                          </p>
                          <p className="text-[9px] font-bold text-emerald-600 uppercase">
                            +{notif.newItems?.length || 0} items added
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => dismissAddMore(notif.id)}
                        className="p-2 text-emerald-300 hover:text-emerald-600"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider if both sections have content */}
            {addMoreNotifications.length > 0 && pendingOrders.length > 0 && (
              <div className="mx-4 my-2 border-t border-zinc-100" />
            )}

            {/* New Orders Section */}
            {pendingOrders.length > 0 && (
              <div className="px-4 pb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-2">
                  New Orders
                </p>
              </div>
            )}

            {/* Orders */}
            <div className="p-4 pt-0 max-h-[320px] overflow-y-auto">
              {pendingOrders.length === 0 && addMoreNotifications.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 font-bold">
                  Kitchen is clear
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map((order) => (
                    <OrderItem
                      key={order._id || order.id}
                      order={order}
                      onMarkRead={() => markAsRead(order._id || order.id)}
                      onView={() => {
                        navigate(targetPath);
                        setOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- ORDER ITEM ---------------- */

const OrderItem = ({ order, onMarkRead, onView }) => {
  const total = order.items.reduce(
    (s, i) => s + i.price * i.qty,
    0
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-[2rem] border border-zinc-100 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div onClick={onView} className="cursor-pointer flex gap-4">
          <div className="h-12 w-12 rounded-2xl bg-zinc-50 flex items-center justify-center">
            <Ticket size={18} className="text-zinc-400" />
          </div>
          <div>
            <p className="font-black">Table {order.table}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase">
              {order.items.length} Items • ₹{total}
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead();
          }}
          className="p-3 text-zinc-300 hover:text-emerald-500"
        >
          <CheckCircle2 size={24} />
        </button>
      </div>
    </motion.div>
  );
};
