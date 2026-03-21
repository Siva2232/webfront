import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

// special table identifiers used when the customer chooses takeaway or
// when the staff creates a delivery/manual order without a specific table
export const TAKEAWAY_TABLE = "TAKEAWAY";
export const DELIVERY_TABLE = "DELIVERY";

const getCartKey = (table) => `cart_${table?.trim() || 'guest'}`;

export const CartProvider = ({ children }) => {
  const [table, setTableState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "takeaway") {
      // use a sentinel string so backend still receives a value and UI knows it's a takeaway order
      return TAKEAWAY_TABLE;
    }
    const urlTable = params.get("table")?.trim()?.replace(/^0+/, "");
    return urlTable || localStorage.getItem("lastUsedTable") || "";
  });

  const [cart, setCart] = useState(() => {
    if (!table) return [];
    try {
      return JSON.parse(localStorage.getItem(getCartKey(table)) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!table?.trim()) {
      return;
    }

    try {
      const safeCart = cart.map((item) => {
        // reduce potential payload size: don't persist huge base64 images
        const { image, ...rest } = item;
        return rest;
      });
      localStorage.setItem(getCartKey(table), JSON.stringify(safeCart));
      localStorage.setItem("lastUsedTable", table);
    } catch (error) {
      // In low quota situations (or if user blocks storage), avoid crash
      console.warn("CartLocalStorage: could not persist cart due to quota or storage error", error);

      if (error && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
        // keep in app state but remove stale storage to free space
        try {
          localStorage.removeItem(getCartKey(table));
        } catch (removeErr) {
          console.warn("CartLocalStorage: could not clear cart key after quota exceeded", removeErr);
        }
      }
    }
  }, [cart, table]);

  useEffect(() => {
    if (!table?.trim()) {
      setCart([]);
      return;
    }
    try {
      const saved = localStorage.getItem(getCartKey(table));
      setCart(saved ? JSON.parse(saved) : []);
    } catch {
      setCart([]);
    }
  }, [table]);

  const setTable = (newTable) => {
    const clean = newTable?.trim()?.replace(/[^0-9]/g, "") || "";
    if (clean !== table) {
      setTableState(clean);
    }
  };

  const addToCart = (product, isTakeawayItem = false) => {
    setCart((prev) => {
      const key = JSON.stringify(product.selectedOptions || []);
      const exists = prev.find(
        (i) =>
          (i._id || i.id) === (product._id || product.id) &&
          (i.isTakeaway || false) === isTakeawayItem &&
          JSON.stringify(i.selectedOptions || []) === key
      );

      if (exists) {
        return prev.map((i) =>
          (i._id || i.id) === (product._id || product.id) &&
          (i.isTakeaway || false) === isTakeawayItem &&
          JSON.stringify(i.selectedOptions || []) === key
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }

      return [...prev, { ...product, qty: 1, isTakeaway: isTakeawayItem }];
    });
  };

  const updateQuantity = (id, newQty) => {
    if (newQty < 1) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) => ((item._id || item.id) === id ? { ...item, qty: newQty } : item))
    );
  };

  const removeFromCart = (idOrItem, selectedOptions = null) => {
    setCart((prev) => {
      if (!idOrItem) return prev;

      if (typeof idOrItem === "object") {
        const id = idOrItem._id || idOrItem.id;
        const key = JSON.stringify(idOrItem.selectedOptions || []);
        return prev.filter((i) => {
          const currentKey = JSON.stringify(i.selectedOptions || []);
          return !(
            (i._id || i.id) === id &&
            (selectedOptions ? JSON.stringify(selectedOptions) === currentKey : key === currentKey)
          );
        });
      }

      const id = idOrItem;
      if (selectedOptions) {
        const key = JSON.stringify(selectedOptions || []);
        return prev.filter((i) => {
          const currentKey = JSON.stringify(i.selectedOptions || []);
          return !((i._id || i.id) === id && currentKey === key);
        });
      }

      return prev.filter((i) => (i._id || i.id) !== id);
    });
  };

  const clearCart = () => {
    if (table?.trim()) {
      localStorage.removeItem(getCartKey(table));
    }
    setCart([]);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalAmount,
        table,
        setTable,
        isTableSelected: !!table?.trim(),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
