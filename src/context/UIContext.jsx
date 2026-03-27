import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";

const UIContext = createContext();

const defaultBanners = [
  { id: 1, title: "Art of Dining", description: "Discover Flavors Beyond Boundaries", imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80", tag: "Seasonal Menu" },
  { id: 2, title: "Purely Organic", description: "Farm to Fork, Every Single Day", imageUrl: "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1600", tag: "Fresh" },
  { id: 3, title: "Chef's Special", description: "Handcrafted Culinary Masterpieces", imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80", tag: "Must Try" },
  { id: 4, title: "Midnight Feast", description: "The best flavors for the night owl", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80", tag: "Late Night" },
  { id: 5, title: "Dessert Heaven", description: "Sweet endings to beautiful stories", imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1600&q=80", tag: "Sweet" }
];

const defaultOffers = [
  {
    id: 101,
    title: "Art of Dining",
    description: "Discover Flavors Beyond Boundaries",
    imageUrl:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80",
    tag: "Seasonal Menu",
  },
  {
    id: 102,
    title: "Purely Organic",
    description: "Farm to Fork, Every Single Day",
    imageUrl:
      "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1600",
    tag: "Freshly Picked",
  },
  {
    id: 103,
    title: "Chef's Special",
    description: "Handcrafted Culinary Masterpieces",
    imageUrl:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80",
    tag: "Must Try",
  },
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

  const fetchBanners = useCallback(async () => {
    try {
      const { data } = await API.get("/banners");
      if (Array.isArray(data) && data.length > 0) {
        setBanners(data);
        try { localStorage.setItem("ui_banners", JSON.stringify(data)); } catch {}
      } else {
        setBanners(defaultBanners);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      setBanners(defaultBanners);
    }
  }, []);

  const fetchOffers = useCallback(async () => {
    try {
      const { data } = await API.get("/offers");
      if (Array.isArray(data) && data.length > 0) {
        const valid = data.filter(p => (p.isPublished ?? true) && p.imageUrl && p.title?.trim());
        if (valid.length > 0) {
          setOffers(valid);
          try { localStorage.setItem("ui_offers", JSON.stringify(valid)); } catch {}
          return;
        }
      }
      setOffers(defaultOffers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      setOffers(defaultOffers);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchBanners(), fetchOffers()]);
    setIsLoading(false);
  }, [fetchBanners, fetchOffers]);

  useEffect(() => {
    fetchData();
    window.addEventListener("bannersUpdated", fetchBanners);
    window.addEventListener("promosUpdated", fetchOffers);
    window.addEventListener("storage", fetchData);

    return () => {
      window.removeEventListener("bannersUpdated", fetchBanners);
      window.removeEventListener("promosUpdated", fetchOffers);
      window.removeEventListener("storage", fetchData);
    };
  }, [fetchData, fetchBanners, fetchOffers]);

  const value = {
    banners,
    offers,
    isLoading,
    refreshUI: fetchData,
    setBanners,
    setOffers
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
