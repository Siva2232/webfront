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
    if (table?.trim()) {
      localStorage.setItem(getCartKey(table), JSON.stringify(cart));
      localStorage.setItem("lastUsedTable", table);
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
      // If the product has a cartKey (configured with portions/addons), use it for matching
      const cartKey = product.cartKey;
      if (cartKey) {
        const exists = prev.find(
          (i) => i.cartKey === cartKey && (i.isTakeaway || false) === isTakeawayItem
        );
        if (exists) {
          return prev.map((i) =>
            i.cartKey === cartKey && (i.isTakeaway || false) === isTakeawayItem
              ? { ...i, qty: i.qty + (product.qty || 1) }
              : i
          );
        }
        return [...prev, { ...product, qty: product.qty || 1, isTakeaway: isTakeawayItem }];
      }

      // For takeaway items, check if the same product exists with same takeaway status
      const exists = prev.find(
        (i) => (i._id || i.id) === (product._id || product.id) && !i.cartKey && (i.isTakeaway || false) === isTakeawayItem
      );
      if (exists) {
        return prev.map((i) =>
          (i._id || i.id) === (product._id || product.id) && !i.cartKey && (i.isTakeaway || false) === isTakeawayItem
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      return [...prev, { ...product, qty: 1, isTakeaway: isTakeawayItem }];
    });
  };

  const updateQuantity = (id, newQty, cartKey = null) => {
    if (newQty < 1) {
      removeFromCart(id, cartKey);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (cartKey) return item.cartKey === cartKey ? { ...item, qty: newQty } : item;
        return (item._id || item.id) === id && !item.cartKey ? { ...item, qty: newQty } : item;
      })
    );
  };

  const removeFromCart = (id, cartKey = null) => {
    setCart((prev) =>
      prev.filter((i) => {
        if (cartKey) return i.cartKey !== cartKey;
        return !((i._id || i.id) === id && !i.cartKey);
      })
    );
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
