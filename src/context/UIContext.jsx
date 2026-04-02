import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";
import { io as socketIOClient } from "socket.io-client";

const UIContext = createContext();

const defaultBanners = [
//   { id: 1, title: "Art of Dining", description: "Discover Flavors Beyond Boundaries", imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80", tag: "Seasonal Menu" },
//   { id: 2, title: "Purely Organic", description: "Farm to Fork, Every Single Day", imageUrl: "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1600", tag: "Fresh" },
//   { id: 3, title: "Chef's Special", description: "Handcrafted Culinary Masterpieces", imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80", tag: "Must Try" },
//   { id: 4, title: "Midnight Feast", description: "The best flavors for the night owl", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80", tag: "Late Night" },
//   { id: 5, title: "Dessert Heaven", description: "Sweet endings to beautiful stories", imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1600&q=80", tag: "Sweet" }
];

const defaultOffers = [
  // {
  //   id: 101,
  //   title: "Art of Dining",
  //   description: "Discover Flavors Beyond Boundaries",
  //   imageUrl:
  //     "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80",
  //   tag: "Seasonal Menu",
  // },
  // {
  //   id: 102,
  //   title: "Purely Organic",
  //   description: "Farm to Fork, Every Single Day",
  //   imageUrl:
  //     "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1600",
  //   tag: "Freshly Picked",
  // },
  // {
  //   id: 103,
  //   title: "Chef's Special",
  //   description: "Handcrafted Culinary Masterpieces",
  //   imageUrl:
  //     "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80",
  //   tag: "Must Try",
  // },
];

export const UIProvider = ({ children }) => {
  // Hydrate instantly from localStorage cache, fallback to defaults
  const [banners, setBanners] = useState(() => {
    try {
      const stored = localStorage.getItem("ui_banners");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultBanners;
  });
  const [offers, setOffers] = useState(() => {
    try {
      const stored = localStorage.getItem("ui_offers");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultOffers;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [reservations, setReservations] = useState([]);

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const { data } = await API.get("/notifications");
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await API.get(`/reservations?date=${today}`);
      setReservations(data || []);
    } catch (error) {
      console.error("Error fetching reservations in UI context:", error);
    }
  }, []);

  const markNotificationAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const fetchBanners = useCallback(async () => {
    // Only set loading if we have no items to prevent UI flashing
    if (banners.length === 0) setIsLoading(true);
    try {
      const { data } = await API.get("/banners");
      if (Array.isArray(data) && data.length > 0) {
        // Only update state if data actually changed to prevent re-renders
        const newStr = JSON.stringify(data);
        const oldStr = localStorage.getItem("ui_banners");
        if (newStr !== oldStr) {
          setBanners(data);
          try { localStorage.setItem("ui_banners", newStr); } catch {}
        }
      } else {
        setBanners(defaultBanners);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      setBanners(defaultBanners);
    } finally {
      setIsLoading(false);
    }
  }, [banners.length]);

  const fetchOffers = useCallback(async () => {
    // Only set loading if we have no items
    if (offers.length === 0) setIsLoading(true);
    try {
      const { data } = await API.get("/offers");
      if (Array.isArray(data) && data.length > 0) {
        const valid = data.filter(p => (p.isPublished ?? true) && p.imageUrl && p.title?.trim());
        if (valid.length > 0) {
          const newStr = JSON.stringify(valid);
          const oldStr = localStorage.getItem("ui_offers");
          if (newStr !== oldStr) {
            setOffers(valid);
            try { localStorage.setItem("ui_offers", newStr); } catch {}
          }
          return;
        }
      }
      setOffers(defaultOffers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      setOffers(defaultOffers);
    } finally {
      setIsLoading(false);
    }
  }, [offers.length]);

  const fetchData = useCallback(async () => {
    // Parallelize with error isolation to ensure one failure doesn't block others
    Promise.allSettled([
      fetchBanners(), 
      fetchOffers(), 
      fetchNotifications(), 
      fetchReservations()
    ]);
  }, [fetchBanners, fetchOffers, fetchNotifications, fetchReservations]);

  useEffect(() => {
    fetchData();
    window.addEventListener("bannersUpdated", fetchBanners);
    window.addEventListener("promosUpdated", fetchOffers);
    window.addEventListener("storage", fetchData);
    window.addEventListener("notificationsUpdated", fetchNotifications);

    // Add server socket for immediate notification updates
    // Strip /api suffix from the URL since socket.io connects to the base server URL
    const backendURL = import.meta.env.PROD
      ? (import.meta.env.VITE_API_BASE_URL || "https://backend-res-ikeb.onrender.com/api").replace(/\/api\/?$/, "")
      : (import.meta.env.VITE_API_BASE_URL_DEV || "http://localhost:5000").replace(/\/api\/?$/, "");

    const socket = socketIOClient(backendURL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      // optional: console.debug("Socket connected", socket.id);
    });

    socket.on("newNotification", (notif) => {
      fetchNotifications();
      // Handle different types for specific UI sounds/events
      if (notif && notif.type === "BillRequested") {
        const event = new CustomEvent("billRequested", { detail: notif });
        window.dispatchEvent(event);
      } else if (notif && notif.type === "WaiterCall") {
        // Dispatch specific event for waiter calls to play the standard ding
        const event = new CustomEvent("waiterCall", { detail: notif });
        window.dispatchEvent(event);
      }
    });

    socket.on("notificationUpdated", () => {
      fetchNotifications();
    });

    socket.on("newReservation", () => {
      fetchReservations();
    });

    socket.on("reservationUpdated", () => {
      fetchReservations();
    });

    // HR & Accounting Real-time Sync
    socket.on("staffUpdate", () => {
      window.dispatchEvent(new CustomEvent("staffUpdated"));
    });
    socket.on("staffDelete", () => {
      window.dispatchEvent(new CustomEvent("staffUpdated"));
    });
    socket.on("leaveUpdate", () => {
      window.dispatchEvent(new CustomEvent("leavesUpdated"));
    });
    socket.on("leaveDelete", () => {
      window.dispatchEvent(new CustomEvent("leavesUpdated"));
    });
    socket.on("attendanceUpdate", () => {
      window.dispatchEvent(new CustomEvent("attendanceUpdated"));
    });
    socket.on("attendanceDelete", () => {
      window.dispatchEvent(new CustomEvent("attendanceUpdated"));
    });
    socket.on("transactionUpdate", () => {
      window.dispatchEvent(new CustomEvent("transactionsUpdated"));
    });
    socket.on("transactionDelete", () => {
      window.dispatchEvent(new CustomEvent("transactionsUpdated"));
    });

    socket.on("disconnect", () => {
      // optional: console.debug("Socket disconnected");
    });

    // Polling fallback
    const pollInterval = setInterval(() => {
      fetchNotifications();
      fetchReservations();
    }, 15000); // Poll every 15 seconds

    return () => {
      window.removeEventListener("bannersUpdated", fetchBanners);
      window.removeEventListener("promosUpdated", fetchOffers);
      window.removeEventListener("storage", fetchData);
      window.removeEventListener("notificationsUpdated", fetchNotifications);
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [fetchData, fetchBanners, fetchOffers, fetchNotifications]);

  const value = {
    banners,
    offers,
    notifications,
    reservations,
    isLoading,
    notificationsLoading,
    refreshUI: fetchData,
    setBanners,
    setOffers,
    fetchNotifications,
    fetchReservations,
    markNotificationAsRead
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within UIProvider");
  }
  return context;
};
