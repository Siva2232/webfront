import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import API from "../api/axios";
import { useTheme } from "./ThemeContext";
import { io as socketIOClient } from "socket.io-client";
import { getRestaurantIdForTenantData, getCustomerVenueRestaurantId, isCustomerPublicMenuPath, tenantKey, tenantGet, tenantSet } from "../utils/tenantCache";
import { isSuperAdminSession, getTokenRole } from "../utils/sessionFlags";

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

  const _rid = getRestaurantIdForTenantData();
  const _mountedRid = useRef(_rid);
  const _getLiveRid = () => getRestaurantIdForTenantData() || _mountedRid.current;

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
  const bannersRef = useRef(banners);
  const offersRef = useRef(offers);
  bannersRef.current = banners;
  offersRef.current = offers;
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [supportTicketCount, setSupportTicketCount] = useState(0);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  /** Latest GET /support-tickets payload for restaurant admins — shared so AdminLayout / CustomerSupport avoid duplicate GETs. */
  const [restaurantSupportTickets, setRestaurantSupportTickets] = useState([]);
  const [reservations, setReservations] = useState([]);

  /** Admin POS chrome mounted (sidebar bells / support / reservations poll). */
  const adminChromeSubscribersRef = useRef(0);
  /** Admin, kitchen, or waiter layout mounted — drives notification polling only. */
  const notifyPollSubscribersRef = useRef(0);

  const notificationsFetchDedupeRef = useRef(null);
  const reservationsFetchDedupeRef = useRef(null);
  const supportTicketsFetchDedupeRef = useRef(null);
  const bannersFetchDedupeRef = useRef(null);
  const offersFetchDedupeRef = useRef(null);
  const customerPromosDedupeRef = useRef(null);
  const adminChromeBundleDedupeRef = useRef(null);
  /** Debounce socket-driven GET bursts (newNotification + notificationUpdated firing together). */
  const socketNotifyDebounceRef = useRef(null);
  const socketSupportDebounceRef = useRef(null);

  useEffect(() => {
    if (!reservationsEnabled) setReservations([]);
  }, [reservationsEnabled]);

  const fetchNotifications = useCallback(async () => {
    if (isSuperAdminSession()) return;
    if (notificationsFetchDedupeRef.current) return notificationsFetchDedupeRef.current;

    const run = async () => {
      setNotificationsLoading(true);
      try {
        const { data } = await API.get("/notifications");
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    notificationsFetchDedupeRef.current = run();
    return notificationsFetchDedupeRef.current.finally(() => {
      notificationsFetchDedupeRef.current = null;
    });
  }, []);

  const fetchReservations = useCallback(async () => {
    if (isSuperAdminSession()) return;
    if (reservationsFetchDedupeRef.current) return reservationsFetchDedupeRef.current;

    const run = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await API.get(`/reservations?date=${today}`);
        setReservations(data || []);
      } catch (error) {
        console.error("Error fetching reservations in UI context:", error);
      }
    };

    reservationsFetchDedupeRef.current = run();
    return reservationsFetchDedupeRef.current.finally(() => {
      reservationsFetchDedupeRef.current = null;
    });
  }, []);

  const fetchSupportTicketCount = useCallback(async () => {
    if (isSuperAdminSession()) return undefined;
    if (supportTicketsFetchDedupeRef.current) return supportTicketsFetchDedupeRef.current;

    const run = async () => {
      try {
        const role = getTokenRole();
        const isSupportAgent = role === "support" || role === "superadmin";

        if (isSupportAgent) {
          setRestaurantSupportTickets([]);
          const { data } = await API.get("/support-tickets/all");
          const count = Array.isArray(data)
            ? data.filter((ticket) => ticket.isRead === false).length
            : 0;
          setSupportUnreadCount(count);
          return undefined;
        }
        const { data } = await API.get("/support-tickets");
        const tickets = Array.isArray(data) ? data : [];
        setRestaurantSupportTickets(tickets);
        setSupportTicketCount(tickets.filter((ticket) => ticket.isRead === false).length);
        return tickets;
      } catch (error) {
        console.error("Error fetching support ticket count:", error);
        setSupportTicketCount(0);
        setSupportUnreadCount(0);
        setRestaurantSupportTickets([]);
        return [];
      }
    };

    supportTicketsFetchDedupeRef.current = run();
    return supportTicketsFetchDedupeRef.current.finally(() => {
      supportTicketsFetchDedupeRef.current = null;
    });
  }, []);

  const markNotificationAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllSupportTicketsRead = useCallback(async () => {
    try {
      await API.patch("/support-tickets/read-all");
      setSupportUnreadCount(0);
      setSupportTicketCount(0);
      setRestaurantSupportTickets((prev) =>
        prev.map((t) => ({ ...t, isRead: true }))
      );
    } catch (error) {
      console.error("Error marking all support tickets read:", error);
    }
  }, []);

  const fetchBanners = useCallback(async () => {
    if (isSuperAdminSession()) return;
    if (bannersFetchDedupeRef.current) return bannersFetchDedupeRef.current;

    const run = async () => {
      if (bannersRef.current.length === 0) setIsLoading(true);
      try {
        const { data } = await API.get("/banners");
        if (Array.isArray(data) && data.length > 0) {
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
    };

    bannersFetchDedupeRef.current = run();
    return bannersFetchDedupeRef.current.finally(() => {
      bannersFetchDedupeRef.current = null;
    });
  }, []);

  const fetchOffers = useCallback(async () => {
    if (isSuperAdminSession()) return;
    if (offersFetchDedupeRef.current) return offersFetchDedupeRef.current;

    const run = async () => {
      if (offersRef.current.length === 0) setIsLoading(true);
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
    };

    offersFetchDedupeRef.current = run();
    return offersFetchDedupeRef.current.finally(() => {
      offersFetchDedupeRef.current = null;
    });
  }, []);

  /** Banners + offers — call from CustomerLayout when visiting the public menu. */
  const fetchCustomerPromos = useCallback(async () => {
    if (isSuperAdminSession()) return;
    if (isCustomerPublicMenuPath() && !getCustomerVenueRestaurantId()) return;
    if (customerPromosDedupeRef.current) return customerPromosDedupeRef.current;

    const run = async () => {
      await Promise.allSettled([fetchBanners(), fetchOffers()]);
    };

    customerPromosDedupeRef.current = run();
    return customerPromosDedupeRef.current.finally(() => {
      customerPromosDedupeRef.current = null;
    });
  }, [fetchBanners, fetchOffers]);

  /** Notifications, support counts, today’s reservations — call when AdminLayout mounts. */
  const fetchAdminChromeBundle = useCallback(async () => {
    if (isSuperAdminSession()) return;
    if (!localStorage.getItem("token")) return;
    if (adminChromeBundleDedupeRef.current) return adminChromeBundleDedupeRef.current;

    const run = async () => {
      const tasks = [fetchNotifications(), fetchSupportTicketCount()];
      if (reservationsEnabled) tasks.push(fetchReservations());
      await Promise.allSettled(tasks);
    };

    adminChromeBundleDedupeRef.current = run();
    return adminChromeBundleDedupeRef.current.finally(() => {
      adminChromeBundleDedupeRef.current = null;
    });
  }, [
    fetchNotifications,
    fetchSupportTicketCount,
    fetchReservations,
    reservationsEnabled,
  ]);

  /** Full UI refresh (storage events / manual). */
  const fetchData = useCallback(async () => {
    await fetchCustomerPromos();
    await fetchAdminChromeBundle();
  }, [fetchCustomerPromos, fetchAdminChromeBundle]);

  const subscribeAdminChrome = useCallback(() => {
    adminChromeSubscribersRef.current += 1;
    return () => {
      adminChromeSubscribersRef.current = Math.max(0, adminChromeSubscribersRef.current - 1);
    };
  }, []);

  const subscribeNotifyPolling = useCallback(() => {
    notifyPollSubscribersRef.current += 1;
    return () => {
      notifyPollSubscribersRef.current = Math.max(0, notifyPollSubscribersRef.current - 1);
    };
  }, []);

  useEffect(() => {
    // No global API burst here — CustomerLayout / AdminLayout / staff layouts trigger loads.
    window.addEventListener("bannersUpdated", fetchBanners);
    window.addEventListener("promosUpdated", fetchOffers);
    window.addEventListener("storage", fetchData);
    window.addEventListener("notificationsUpdated", () => {
      fetchNotifications();
      fetchSupportTicketCount();
    });

    // Detect restaurant switch on focus and reset UI state
    const checkRidChange = () => {
      const liveRid = getRestaurantIdForTenantData();
      if (liveRid && liveRid !== _mountedRid.current) {
        _mountedRid.current = liveRid;
        // Reset to new restaurant's cache or defaults
        const cachedBanners = tenantGet('ui_banners', liveRid);
        const cachedOffers = tenantGet('ui_offers', liveRid);
        setBanners(Array.isArray(cachedBanners) && cachedBanners.length > 0 ? cachedBanners : defaultBanners);
        setOffers(Array.isArray(cachedOffers) && cachedOffers.length > 0 ? cachedOffers : defaultOffers);
        setNotifications([]);
        setReservations([]);
        setRestaurantSupportTickets([]);
        fetchCustomerPromos();
        if (localStorage.getItem("token")) fetchAdminChromeBundle();
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

    const debouncedFetchNotifications = () => {
      if (socketNotifyDebounceRef.current) clearTimeout(socketNotifyDebounceRef.current);
      socketNotifyDebounceRef.current = setTimeout(() => {
        socketNotifyDebounceRef.current = null;
        if (!localStorage.getItem("token") || isSuperAdminSession()) return;
        fetchNotifications();
      }, 400);
    };

    const debouncedFetchNotificationsAndSupport = () => {
      if (socketNotifyDebounceRef.current) clearTimeout(socketNotifyDebounceRef.current);
      socketNotifyDebounceRef.current = setTimeout(() => {
        socketNotifyDebounceRef.current = null;
        if (!localStorage.getItem("token") || isSuperAdminSession()) return;
        fetchNotifications();
        if (adminChromeSubscribersRef.current > 0) fetchSupportTicketCount();
      }, 400);
    };

    const debouncedFetchSupportOnly = () => {
      if (socketSupportDebounceRef.current) clearTimeout(socketSupportDebounceRef.current);
      socketSupportDebounceRef.current = setTimeout(() => {
        socketSupportDebounceRef.current = null;
        if (!localStorage.getItem("token") || isSuperAdminSession()) return;
        if (adminChromeSubscribersRef.current > 0) fetchSupportTicketCount();
      }, 400);
    };

    socket.on("connect", () => {
      if (isSuperAdminSession()) return;
      const rid = getRestaurantIdForTenantData();
      if (rid) socket.emit("joinRoom", { restaurantId: rid, token: localStorage.getItem('token') || undefined });
    });

    socket.on("newNotification", (notif) => {
      if (!localStorage.getItem("token") || isSuperAdminSession()) return;
      debouncedFetchNotifications();
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
        debouncedFetchNotificationsAndSupport();
      }
    });

    socket.on("newReservation", () => {
      if (
        localStorage.getItem("token") &&
        !isSuperAdminSession() &&
        reservationsEnabledRef.current &&
        adminChromeSubscribersRef.current > 0
      )
        fetchReservations();
    });

    socket.on("reservationUpdated", () => {
      if (
        localStorage.getItem("token") &&
        !isSuperAdminSession() &&
        reservationsEnabledRef.current &&
        adminChromeSubscribersRef.current > 0
      )
        fetchReservations();
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
      if (
        localStorage.getItem("token") &&
        !isSuperAdminSession() &&
        adminChromeSubscribersRef.current > 0
      )
        debouncedFetchSupportOnly();
    });

    socket.on("disconnect", () => {
      // optional: console.debug("Socket disconnected");
    });

    const POLL_MS = 45000;
    const pollInterval = setInterval(() => {
      if (isSuperAdminSession()) return;
      if (typeof document !== "undefined" && document.hidden) return;
      if (!localStorage.getItem("token")) return;
      if (notifyPollSubscribersRef.current > 0) fetchNotifications();
      if (adminChromeSubscribersRef.current > 0) {
        fetchSupportTicketCount();
        if (reservationsEnabledRef.current) fetchReservations();
      }
    }, POLL_MS);

    return () => {
      window.removeEventListener("bannersUpdated", fetchBanners);
      window.removeEventListener("promosUpdated", fetchOffers);
      window.removeEventListener("storage", fetchData);
      window.removeEventListener("notificationsUpdated", fetchNotifications);
      window.removeEventListener("focus", checkRidChange);
      window.removeEventListener("popstate", checkRidChange);
      clearInterval(pollInterval);
      clearTimeout(socketNotifyDebounceRef.current);
      clearTimeout(socketSupportDebounceRef.current);
      socket.disconnect();
    };
  }, [
    fetchData,
    fetchBanners,
    fetchOffers,
    fetchNotifications,
    fetchReservations,
    fetchSupportTicketCount,
    fetchCustomerPromos,
    fetchAdminChromeBundle,
  ]);

  const value = {
    banners,
    offers,
    notifications,
    supportTicketCount,
    supportUnreadCount,
    restaurantSupportTickets,
    reservations,
    isLoading,
    notificationsLoading,
    refreshUI: fetchData,
    fetchCustomerPromos,
    fetchAdminChromeBundle,
    subscribeAdminChrome,
    subscribeNotifyPolling,
    setBanners,
    setOffers,
    fetchNotifications,
    fetchReservations,
    fetchBanners,
    fetchOffers,
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
