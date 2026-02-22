import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

const getCartKey = (table) => `cart_${table?.trim() || 'guest'}`;

export const CartProvider = ({ children }) => {
  const [table, setTableState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
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

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((i) => (i._id || i.id) === (product._id || product.id));
      if (exists) {
        return prev.map((i) =>
          (i._id || i.id) === (product._id || product.id) ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...product, qty: 1 }];
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

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => (i._id || i.id) !== id));
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
