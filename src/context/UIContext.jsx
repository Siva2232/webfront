import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import API from "../api/axios";
import { useTheme } from "./ThemeContext";
import { io as socketIOClient } from "socket.io-client";
import { getCurrentRestaurantId, tenantKey, tenantGet, tenantSet } from "../utils/tenantCache";
import { isSuperAdminSession } from "../utils/sessionFlags";

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
  const { features } = useTheme();
  const reservationsEnabled = features.reservations !== false;
  const reservationsEnabledRef = useRef(reservationsEnabled);
  useEffect(() => {
    reservationsEnabledRef.current = reservationsEnabled;
  }, [reservationsEnabled]);

  const _rid = getCurrentRestaurantId();
  const _mountedRid = useRef(_rid);
  // Live helper that always reads the CURRENT restaurantId
  const _getLiveRid = () => getCurrentRestaurantId() || _mountedRid.current;

  // Hydrate instantly from namespaced cache for THIS restaurant only
  const [banners, setBanners] = useState(() => {
    try {
      const stored = tenantGet('ui_banners', _rid);
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch {}
    return defaultBanners;
  });
  const [offers, setOffers] = useState(() => {
    try {
      const stored = tenantGet('ui_offers', _rid);
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch {}
    return defaultOffers;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [supportTicketCount, setSupportTicketCount] = useState(0);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    if (!reservationsEnabled) setReservations([]);
  }, [reservationsEnabled]);

  const fetchNotifications = useCallback(async () => {
    if (isSuperAdminSession()) return;
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
    if (isSuperAdminSession()) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await API.get(`/reservations?date=${today}`);
      setReservations(data || []);
    } catch (error) {
      console.error("Error fetching reservations in UI context:", error);
    }
  }, []);

  const fetchSupportTicketCount = useCallback(async () => {
    if (isSuperAdminSession()) return;
    try {
      const isSupportAgent = localStorage.getItem("isSupportLoggedIn") === "true";
      
      if (isSupportAgent) {
        // Support team side: count unread tickets for them
        const { data } = await API.get("/support-tickets/all");
        const count = Array.isArray(data)
          ? data.filter((ticket) => ticket.isRead === false).length
          : 0;
        setSupportUnreadCount(count);
      } else {
        // Restaurant owner side: count unread tickets for them
        const { data } = await API.get("/support-tickets");
        const count = Array.isArray(data)
          ? data.filter((ticket) => ticket.isRead === false).length
          : 0;
        setSupportTicketCount(count);
      }
    } catch (error) {
      console.error("Error fetching support ticket count:", error);
      setSupportTicketCount(0);
      setSupportUnreadCount(0);
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

  const markAllSupportTicketsRead = async () => {
    try {
      await API.patch("/support-tickets/read-all");
      setSupportUnreadCount(0);
      setSupportTicketCount(0);
    } catch (error) {
      console.error("Error marking all support tickets read:", error);
    }
  };

  const fetchBanners = useCallback(async () => {
    if (isSuperAdminSession()) return;
    // Only set loading if we have no items to prevent UI flashing
    if (banners.length === 0) setIsLoading(true);
    try {
      const { data } = await API.get("/banners");
      if (Array.isArray(data) && data.length > 0) {
        // Only update state if data actually changed to prevent re-renders
        const newData = data;
        const oldStored = tenantGet('ui_banners', _getLiveRid());
        if (JSON.stringify(newData) !== JSON.stringify(oldStored)) {
          setBanners(newData);
          tenantSet('ui_banners', _getLiveRid(), newData);
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
    if (isSuperAdminSession()) return;
    // Only set loading if we have no items
    if (offers.length === 0) setIsLoading(true);
    try {
      const { data } = await API.get("/offers");
      if (Array.isArray(data) && data.length > 0) {
        const valid = data.filter(p => (p.isPublished ?? true) && p.imageUrl && p.title?.trim());
        if (valid.length > 0) {
          const oldStored = tenantGet('ui_offers', _getLiveRid());
          if (JSON.stringify(valid) !== JSON.stringify(oldStored)) {
            setOffers(valid);
            tenantSet('ui_offers', _getLiveRid(), valid);
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
    if (isSuperAdminSession()) return;
    // Always fetch public data (banners/offers) — needed for customer panel
    // Only fetch admin-only data (notifications/reservations) when authenticated
    const isAdmin = !!localStorage.getItem("token");
    const tasks = [fetchBanners(), fetchOffers()];
    if (isAdmin) {
      tasks.push(fetchNotifications(), fetchSupportTicketCount());
      if (reservationsEnabled) tasks.push(fetchReservations());
    }
    Promise.allSettled(tasks);
  }, [
    fetchBanners,
    fetchOffers,
    fetchNotifications,
    fetchReservations,
    fetchSupportTicketCount,
    reservationsEnabled,
  ]);

  useEffect(() => {
    fetchData();
    window.addEventListener("bannersUpdated", fetchBanners);
    window.addEventListener("promosUpdated", fetchOffers);
    window.addEventListener("storage", fetchData);
    window.addEventListener("notificationsUpdated", () => {
      fetchNotifications();
      fetchSupportTicketCount();
    });

    // Detect restaurant switch on focus and reset UI state
    const checkRidChange = () => {
      const liveRid = getCurrentRestaurantId();
      if (liveRid && liveRid !== _mountedRid.current) {
        _mountedRid.current = liveRid;
        // Reset to new restaurant's cache or defaults
        const cachedBanners = tenantGet('ui_banners', liveRid);
        const cachedOffers = tenantGet('ui_offers', liveRid);
        setBanners(Array.isArray(cachedBanners) && cachedBanners.length > 0 ? cachedBanners : defaultBanners);
        setOffers(Array.isArray(cachedOffers) && cachedOffers.length > 0 ? cachedOffers : defaultOffers);
        setNotifications([]);
        setReservations([]);
        fetchData();
      }
    };
    window.addEventListener("focus", checkRidChange);
    window.addEventListener("popstate", checkRidChange);

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
      if (isSuperAdminSession()) return;
      const rid = getCurrentRestaurantId();
      if (rid) socket.emit("joinRoom", { restaurantId: rid, token: localStorage.getItem('token') || undefined });
    });

    socket.on("newNotification", (notif) => {
      if (!localStorage.getItem("token") || isSuperAdminSession()) return;
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
      // SubscriptionBilling: list only under AdminLayout reminder bell — no toast / kitchen UI
    });

    socket.on("notificationUpdated", () => {
      if (localStorage.getItem("token") && !isSuperAdminSession()) {
        fetchNotifications();
        fetchSupportTicketCount();
      }
    });

    socket.on("newReservation", () => {
      if (localStorage.getItem("token") && !isSuperAdminSession() && reservationsEnabledRef.current) fetchReservations();
    });

    socket.on("reservationUpdated", () => {
      if (localStorage.getItem("token") && !isSuperAdminSession() && reservationsEnabledRef.current) fetchReservations();
    });

    // HR real-time sync
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

    socket.on("supportTicketUpdated", () => {
      if (localStorage.getItem("token") && !isSuperAdminSession()) fetchSupportTicketCount();
    });

    socket.on("disconnect", () => {
      // optional: console.debug("Socket disconnected");
    });

    // Polling fallback — admin-only endpoints only polled when authenticated
    const pollInterval = setInterval(() => {
      if (isSuperAdminSession()) return;
      if (localStorage.getItem("token")) {
        fetchNotifications();
        if (reservationsEnabledRef.current) fetchReservations();
        fetchSupportTicketCount();
      }
    }, 15000); // Poll every 15 seconds

    return () => {
      window.removeEventListener("bannersUpdated", fetchBanners);
      window.removeEventListener("promosUpdated", fetchOffers);
      window.removeEventListener("storage", fetchData);
      window.removeEventListener("notificationsUpdated", fetchNotifications);
      window.removeEventListener("focus", checkRidChange);
      window.removeEventListener("popstate", checkRidChange);
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [fetchData, fetchBanners, fetchOffers, fetchNotifications, fetchReservations, fetchSupportTicketCount]);

  const value = {
    banners,
    offers,
    notifications,
    supportTicketCount,
    supportUnreadCount,
    reservations,
    isLoading,
    notificationsLoading,
    refreshUI: fetchData,
    setBanners,
    setOffers,
    fetchNotifications,
    fetchReservations,
    markNotificationAsRead,
    fetchSupportTicketCount,
    markAllSupportTicketsRead,
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
