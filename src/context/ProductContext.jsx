import { createContext, useContext, useEffect, useState, useMemo } from "react";
import API from "../api/axios";
import { io } from "socket.io-client";

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
  // Hydrate instantly from localStorage so the menu renders without waiting for API
  const [products, setProducts] = useState(() => {
    try {
      const stored = localStorage.getItem("products");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [categories, setCategories] = useState(() => {
    try {
      const stored = localStorage.getItem("categories");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [subitems, setSubitems] = useState([]);
  // If we have cached products, mark as not-loading so UI renders immediately
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const stored = localStorage.getItem("products");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });

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
          try { localStorage.setItem("categories", JSON.stringify(data)); } catch {}
        }
      }

      if (subitemsRes.status === "fulfilled") {
        const data = subitemsRes.value.data;
        setSubitems(Array.isArray(data) ? data : []);
      }

      if (productsRes.status === "fulfilled") {
        const list = Array.isArray(productsRes.value.data) ? productsRes.value.data : [];
        setProducts(list);
        try { localStorage.setItem("products", JSON.stringify(list)); } catch {}
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Listen for real-time updates from library/sub-item changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    socket.connect();

    socket.on("productsUpdated", () => {
      console.log("Real-time sync: Library changed, re-fetching products...");
      fetchProducts();
    });

    socket.on("subItemsUpdated", () => {
      console.log("Real-time sync: Sub-items changed, re-fetching...");
      fetchSubitems();
    });

    return () => {
      socket.off("productsUpdated");
      socket.off("subItemsUpdated");
      socket.disconnect();
    };
  }, []);

  // Ordered categories with preferred order — always returns name strings
  const orderedCategories = useMemo(() => {
    const preferredOrder = ["Starters", "Main Courses", "Desserts", "Beverages", "Others"];
    // Normalize to name strings regardless of whether entries are objects or strings
    const names = categories.map(c => (typeof c === 'string' ? c : c.name)).filter(Boolean);
    const unique = [...new Set(names)];
    unique.sort((a, b) => {
      const ia = preferredOrder.indexOf(a);
      const ib = preferredOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return unique;
  }, [categories]);

  // Sync when localStorage changes (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "products") {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setProducts(parsed);
        } catch {}
      }
      if (e.key === "categories") {
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
    localStorage.setItem("products", JSON.stringify(newProducts));
  };

  const saveCategories = (newCategories) => {
    setCategories(newCategories);
    localStorage.setItem("categories", JSON.stringify(newCategories));
  };

  const addProduct = async (productData) => {
    try {
      // avoid sending temporary id field to backend
      const { id, ...payload } = productData;
      const { data } = await API.post("/products", payload);
      const updated = [...products, data];
      setProducts(updated);
      try { localStorage.setItem("products", JSON.stringify(updated)); } catch {}
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
      try { localStorage.setItem("categories", JSON.stringify(updated)); } catch {}
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
      try { localStorage.setItem("products", JSON.stringify(updated)); } catch {}
      return data;
    } catch (error) {
      console.error("Error updating product:", error);
      // propagate so callers can react (show toast, etc.)
      throw error;
    }
  };

  const deleteProduct = async (id) => {
    try {
      await API.delete(`/products/${id}`);
      const updated = products.filter(p => p._id !== id);
      setProducts(updated);
      try { localStorage.setItem("products", JSON.stringify(updated)); } catch {}
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
      try { localStorage.setItem("products", JSON.stringify(updated)); } catch {}
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