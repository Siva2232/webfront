import { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import API from "../api/axios";
import { io } from "socket.io-client";
import { syncRestaurantCache, getCurrentRestaurantId, tenantKey, tenantGet, tenantSet } from "../utils/tenantCache";

// the socket URL should match the backend deployment; use env var if available
// fall back to the same host as the REST API by trimming any trailing /api segment
const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000");

// shared socket instance so we don't reconnect on every render
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: false,
});

export const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  // Current restaurant ID from URL (priority) or localStorage
  const currentRid = getCurrentRestaurantId();
  // Track the rid at mount so we can detect switches without a hard reload
  const mountedRid = useRef(currentRid);

  // Hydrate instantly from namespaced cache for THIS restaurant only
  const [products, setProducts] = useState(() => {
    try {
      const stored = tenantGet('products', currentRid);
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch {}
    return [];
  });
  const [categories, setCategories] = useState(() => {
    try {
      const stored = tenantGet('categories', currentRid);
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch {}
    return [];
  });
  const [subitems, setSubitems] = useState([]);
  // If we have cached products, mark as not-loading so UI renders immediately
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const stored = tenantGet('products', currentRid);
      return !(Array.isArray(stored) && stored.length > 0);
    } catch {}
    return true;
  });

  // Helper: get the LIVE restaurantId (not the stale closure value)
  const getLiveRid = () => getCurrentRestaurantId() || mountedRid.current;

  const fetchCategories = async () => {
    try {
      const { data } = await API.get("/categories");
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
      } else {
        // Default categories if none exist in DB
        setCategories([
          { _id: '1', name: "Starters" },
          { _id: '2', name: "Main Courses" },
          { _id: '3', name: "Desserts" },
          { _id: '4', name: "Beverages" }
        ]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([
        { _id: '1', name: "Starters" },
        { _id: '2', name: "Main Courses" },
        { _id: '3', name: "Desserts" },
        { _id: '4', name: "Beverages" }
      ]);
    }
  };

  const fetchSubitems = async () => {
    try {
      const { data } = await API.get("/sub-items");
      setSubitems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching subitems:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      // Only show loading spinner if there's no cached data
      if (products.length === 0) setIsLoading(true);
      
      const [categoriesRes, subitemsRes, productsRes] = await Promise.allSettled([
        API.get("/categories"),
        API.get("/sub-items"),
        API.get("/products")
      ]);

      if (categoriesRes.status === "fulfilled") {
        const data = categoriesRes.value.data;
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          tenantSet('categories', getLiveRid(), data);
        }
      }

      if (subitemsRes.status === "fulfilled") {
        const data = subitemsRes.value.data;
        setSubitems(Array.isArray(data) ? data : []);
      }

      if (productsRes.status === "fulfilled") {
        const list = Array.isArray(productsRes.value.data) ? productsRes.value.data : [];
        // Only overwrite if API returned products, or we had nothing cached (first load).
        // Prevents a transient empty response from wiping an already-loaded product list.
        if (list.length > 0 || products.length === 0) {
          setProducts(list);
          tenantSet('products', getLiveRid(), list);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Store restaurantId and fetch products on mount
  useEffect(() => {
    if (currentRid) {
      syncRestaurantCache(currentRid);
    }
    fetchProducts();
  }, []);

  // Detect restaurant switch (e.g. admin logged into a different restaurant)
  // and reset state + re-fetch when it happens.
  useEffect(() => {
    const checkRidChange = () => {
      const liveRid = getCurrentRestaurantId();
      if (liveRid && liveRid !== mountedRid.current) {
        mountedRid.current = liveRid;
        // Reset state to the new restaurant's cache (or empty)
        const cachedProducts = tenantGet('products', liveRid);
        const cachedCategories = tenantGet('categories', liveRid);
        setProducts(Array.isArray(cachedProducts) ? cachedProducts : []);
        setCategories(Array.isArray(cachedCategories) ? cachedCategories : []);
        setSubitems([]);
        setIsLoading(true);
        fetchProducts();
      }
    };
    // Check on every navigation / focus change
    window.addEventListener('focus', checkRidChange);
    window.addEventListener('popstate', checkRidChange);
    return () => {
      window.removeEventListener('focus', checkRidChange);
      window.removeEventListener('popstate', checkRidChange);
    };
  }, []);

  // Force-fresh products fetch (bypasses server cache) — used after socket events
  const fetchProductsFresh = async () => {
    try {
      const [subitemsRes, productsRes] = await Promise.allSettled([
        API.get("/sub-items"),
        API.get(`/products?_t=${Date.now()}`),
      ]);
      if (subitemsRes.status === "fulfilled") {
        const data = subitemsRes.value.data;
        setSubitems(Array.isArray(data) ? data : []);
      }
      if (productsRes.status === "fulfilled") {
        const list = Array.isArray(productsRes.value.data) ? productsRes.value.data : [];
        if (list.length > 0 || products.length === 0) {
          setProducts(list);
          tenantSet('products', getLiveRid(), list);
        }
      }
    } catch {}
  };

  // Listen for real-time updates — connect for ALL users (customers need product updates too)
  useEffect(() => {
    socket.connect();

    // Join restaurant-specific room so we only receive events for our restaurant
    const rid = localStorage.getItem('restaurantId');
    if (rid) {
      socket.emit('joinRoom', rid);
    }
    socket.on('connect', () => {
      const r = localStorage.getItem('restaurantId');
      if (r) socket.emit('joinRoom', r);
    });

    socket.on("subItemsUpdated", () => {
      console.log("Real-time sync: Sub-items changed, re-fetching...");
      fetchProductsFresh();
    });

    socket.on("productsUpdated", () => {
      console.log("Real-time sync: Library changed, re-fetching products...");
      fetchProductsFresh();
    });

    socket.on("productUpdated", (updatedProduct) => {
      if (!updatedProduct || !updatedProduct._id) return;
      console.log("Real-time sync: Single product updated:", updatedProduct.name);
      
      setProducts(prev => {
        const index = prev.findIndex(p => p._id === updatedProduct._id);
        if (index === -1) return [...prev, updatedProduct];
        const newList = [...prev];
        newList[index] = updatedProduct;
        return newList;
      });

      // Also update namespaced cache to keep it fresh
      try {
        const stored = tenantGet('products', getLiveRid());
        const parsed = Array.isArray(stored) ? stored : [];
        const index = parsed.findIndex(p => p._id === updatedProduct._id);
        if (index !== -1) {
          parsed[index] = updatedProduct;
        } else {
          parsed.push(updatedProduct);
        }
        tenantSet('products', getLiveRid(), parsed);
      } catch (err) {
        console.error("Local sync error:", err);
      }
    });

    socket.on("productDeleted", (productId) => {
      console.log("Real-time sync: Product deleted:", productId);
      setProducts(prev => prev.filter(p => p._id !== productId));
      
      try {
        const stored = tenantGet('products', getLiveRid());
        if (Array.isArray(stored)) {
          tenantSet('products', getLiveRid(), stored.filter(p => p._id !== productId));
        }
      } catch (err) {
        console.error("Local sync error (delete):", err);
      }
    });

    socket.on("subItemDeleted", ({ id, type, name }) => {
      console.log("Real-time sync: Sub-item deleted:", name);
      setSubitems(prev => prev.filter(s => s._id !== id));
      // Products also update via productsUpdated event which usually follows
    });

    socket.on("subItemUpdated", (updatedSubItem) => {
      console.log("Real-time sync: Sub-item updated:", updatedSubItem.name);
      setSubitems(prev => {
        const index = prev.findIndex(s => s._id === updatedSubItem._id);
        if (index === -1) return [...prev, updatedSubItem];
        const newList = [...prev];
        newList[index] = updatedSubItem;
        return newList;
      });
    });

    socket.on("subItemsUpdated", () => {
      console.log("Real-time sync: Sub-items changed, re-fetching...");
      fetchSubitems();
    });

    return () => {
      socket.off("connect");
      socket.off("productsUpdated");
      socket.off("subItemsUpdated");
      socket.off("productUpdated");
      socket.off("productDeleted");
      socket.off("subItemUpdated");
      socket.off("subItemDeleted");
      socket.disconnect();
    };
  }, []);

  // Ordered categories with preferred order — always returns name strings
  // Also includes categories derived from the products themselves so that
  // products with a custom category (not yet in the categories collection)
  // still get their own section in the menu.
  const orderedCategories = useMemo(() => {
    const preferredOrder = ["Starters", "Main Courses", "Desserts", "Beverages", "Others"];
    // Normalize to name strings regardless of whether entries are objects or strings
    const fromDb = categories.map(c => (typeof c === 'string' ? c : c.name)).filter(Boolean);
    // Derive any additional categories directly from the products list
    const fromProducts = products.map(p => p.category).filter(Boolean);
    const unique = [...new Set([...fromDb, ...fromProducts])];
    unique.sort((a, b) => {
      const ia = preferredOrder.indexOf(a);
      const ib = preferredOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return unique;
  }, [categories, products]);

  // Sync when localStorage changes (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === tenantKey('products', getLiveRid())) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setProducts(parsed);
        } catch {}
      }
      if (e.key === tenantKey('categories', getLiveRid())) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setCategories(parsed);
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Helper functions
  const saveProducts = (newProducts) => {
    setProducts(newProducts);
    tenantSet('products', getLiveRid(), newProducts);
  };

  const saveCategories = (newCategories) => {
    setCategories(newCategories);
    tenantSet('categories', getLiveRid(), newCategories);
  };

  const addProduct = async (productData) => {
    try {
      // avoid sending temporary id field to backend
      const { id, ...payload } = productData;
      const { data } = await API.post("/products", payload);
      const updated = [...products, data];
      setProducts(updated);
      tenantSet('products', getLiveRid(), updated);
      return data;
    } catch (error) {
      console.error("Error adding product:", error.response?.data || error.message || error);
      throw error;
    }
  };

  const addCategory = async (categoryName) => {
    const trimmed = categoryName?.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    
    try {
      const { data } = await API.post("/categories", { name: trimmed });
      const updated = [...categories, data.name];
      setCategories(updated);
      tenantSet('categories', getLiveRid(), updated);
    } catch (error) {
      console.error("Error adding category:", error);
      // Fallback to local only if API fails
      const updated = [...categories, trimmed];
      setCategories(updated);
    }
  };

  const updateProduct = async (id, updates) => {
    try {
      const { data } = await API.put(`/products/${id}`, updates);
      const updated = products.map(p => p._id === id ? data : p);
      setProducts(updated);
      tenantSet('products', getLiveRid(), updated);
      return data;
    } catch (error) {
      console.error("Error updating product:", error);
      // propagate so callers can react (show toast, etc.)
      throw error;
    }
  };

  const updateSubItem = async (id, updates) => {
    try {
      const { data } = await API.put(`/sub-items/${id}`, updates);
      setSubitems(prev => prev.map(s => s._id === id ? data : s));
      return data;
    } catch (error) {
      console.error("Error updating sub-item:", error);
      throw error;
    }
  };

  // Patch products state in-memory for a sub-item availability change.
  // This is synchronous so ProductCard updates with zero lag.
  const _patchProductsForSubItem = (subItem, isAvailable) => {
    if (!subItem) return;
    const { name, type } = subItem;
    setProducts(prev => prev.map(p => {
      if (type === 'portion' && p.portions?.some(pt => pt.name === name)) {
        return { ...p, portions: p.portions.map(pt => pt.name === name ? { ...pt, isAvailable } : pt) };
      }
      if (type === 'addonGroup' && p.addonGroups?.some(ag => ag.name === name)) {
        return { ...p, addonGroups: p.addonGroups.map(ag => ag.name === name ? { ...ag, isAvailable } : ag) };
      }
      return p;
    }));
  };

  const updateSubItemStatus = async (id, isAvailable) => {
    // Find sub-item before any async work so we can patch products synchronously
    const subItem = subitems.find(s => s._id === id) || null;

    // Instant optimistic updates — no waiting for API or socket
    setSubitems(prev => prev.map(s => s._id === id ? { ...s, isAvailable } : s));
    _patchProductsForSubItem(subItem, isAvailable);

    try {
      const { data } = await API.patch(`/sub-items/${id}/status`, { isAvailable });
      setSubitems(prev => prev.map(s => s._id === id ? data : s));
      return data;
    } catch (error) {
      // Revert both on failure
      setSubitems(prev => prev.map(s => s._id === id ? { ...s, isAvailable: !isAvailable } : s));
      _patchProductsForSubItem(subItem, !isAvailable);
      console.error("Error updating sub-item status:", error);
      throw error;
    }
  };

  const deleteProduct = async (id) => {
    try {
      await API.delete(`/products/${id}`);
      const updated = products.filter(p => p._id !== id);
      setProducts(updated);
      tenantSet('products', getLiveRid(), updated);
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const toggleAvailability = async (id) => {
    const product = products.find(p => p._id === id);
    if (!product) return;
    try {
      const { data } = await API.put(`/products/${id}`, { isAvailable: !product.isAvailable });
      const updated = products.map(p => p._id === id ? data : p);
      setProducts(updated);
      tenantSet('products', getLiveRid(), updated);
    } catch (error) {
      console.error("Error toggling availability:", error);
    }
  };

  const value = {
    products,
    categories,
    subitems,
    isLoading,
    orderedCategories,
    addProduct,
    addCategory,
    updateProduct,
    updateSubItem,
    updateSubItemStatus,
    deleteProduct,
    toggleAvailability,
    fetchProducts,
    fetchSubitems,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within ProductProvider");
  }
  return context;
};