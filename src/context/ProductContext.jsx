import { createContext, useContext, useEffect, useState, useMemo } from "react";
import API from "../api/axios";

const ProductContext = createContext();

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
      await Promise.all([fetchCategories(), fetchSubitems()]);
      const { data } = await API.get("/products");
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      try { localStorage.setItem("products", JSON.stringify(list)); } catch {}
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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
      setProducts([...products, data]);
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
      localStorage.setItem("categories", JSON.stringify(updated));
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
      setProducts(products.map(p => p._id === id ? data : p));
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
      setProducts(products.filter(p => p._id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const toggleAvailability = async (id) => {
    const product = products.find(p => p._id === id);
    if (!product) return;
    try {
      const { data } = await API.put(`/products/${id}`, { isAvailable: !product.isAvailable });
      setProducts(products.map(p => p._id === id ? data : p));
    } catch (error) {
      console.error("Error toggling availability:", error);
    }
  };

  const value = {
    products,
    categories,
    subitems,
    orderedCategories,
    addProduct,
    addCategory,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    fetchProducts,
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