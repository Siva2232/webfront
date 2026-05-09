import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentRestaurantId, tenantKey, tenantRemove } from "../utils/tenantCache";

const CartContext = createContext();

// special table identifiers used when the customer chooses takeaway or
// when the staff creates a delivery/manual order without a specific table
export const TAKEAWAY_TABLE = "TAKEAWAY";
export const DELIVERY_TABLE = "DELIVERY";

const getCartKey = (table) => {
  const rid = getCurrentRestaurantId() || '';
  return `cart_${rid}_${table?.trim() || 'guest'}`;
};
const MAX_CART_ITEMS = 120;

const safeSetLocalStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    if (err && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED" || err.code === 22 || err.code === 1014)) {
      console.warn("localStorage quota exceeded, clearing non-critical caches", err);
      try {
        // Remove caches to free some space, keep cart data in memory for now.
        const _rid = getCurrentRestaurantId();
        tenantRemove("cachedOrders", _rid);
        tenantRemove("cachedBills", _rid);
        tenantRemove("cachedKitchenBills", _rid);
        tenantRemove("lastViewedProduct", _rid);
        // Retry once with reduced data if possible
        window.localStorage.setItem(key, value);
      } catch (inner) {
        console.warn("localStorage retry failed, dropping persistence for key", key, inner);
      }
    } else {
      throw err;
    }
  }
};

export const CartProvider = ({ children }) => {
  const [table, setTableState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "takeaway") {
      // use a sentinel string so backend still receives a value and UI knows it's a takeaway order
      return TAKEAWAY_TABLE;
    }
    const urlTable = params.get("table")?.trim()?.replace(/^0+/, "");
    const _rid = getCurrentRestaurantId();
    return urlTable || localStorage.getItem(tenantKey("lastUsedTable", _rid)) || "";
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
      const cartData = JSON.stringify(cart);
      safeSetLocalStorage(getCartKey(table), cartData);
      const _rid = getCurrentRestaurantId();
      localStorage.setItem(tenantKey("lastUsedTable", _rid), table);
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
      const ensureMax = (items) => (items.length > MAX_CART_ITEMS ? items.slice(-MAX_CART_ITEMS) : items);
      if (cartKey) {
        const exists = prev.find(
          (i) => i.cartKey === cartKey && (i.isTakeaway || false) === isTakeawayItem
        );
        if (exists) {
          return ensureMax(prev.map((i) =>
            i.cartKey === cartKey && (i.isTakeaway || false) === isTakeawayItem
              ? { ...i, qty: i.qty + (product.qty || 1) }
              : i
          ));
        }
        return ensureMax([...prev, { ...product, qty: product.qty || 1, isTakeaway: isTakeawayItem }]);
      }

      // For takeaway items, check if the same product exists with same takeaway status
      const exists = prev.find(
        (i) => (i._id || i.id) === (product._id || product.id) && !i.cartKey && (i.isTakeaway || false) === isTakeawayItem
      );
      if (exists) {
        return ensureMax(prev.map((i) =>
          (i._id || i.id) === (product._id || product.id) && !i.cartKey && (i.isTakeaway || false) === isTakeawayItem
            ? { ...i, qty: i.qty + 1 }
            : i
        ));
      }
      const next = [...prev, { ...product, qty: 1, isTakeaway: isTakeawayItem }];
      return ensureMax(next);
    });
  };

  /**
   * For plain items (no cartKey), `isTakeawayLine` selects dine-in vs takeaway row.
   * When omitted, defaults to dine-in only (false) so legacy callers don’t wipe both lines.
   */
  const updateQuantity = (id, newQty, cartKey = null, isTakeawayLine) => {
    if (newQty < 1) {
      removeFromCart(id, cartKey, isTakeawayLine);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (cartKey) return item.cartKey === cartKey ? { ...item, qty: newQty } : item;
        if ((item._id || item.id) !== id || item.cartKey) return item;
        const itemTa = !!(item.isTakeaway);
        const targetTa = isTakeawayLine === undefined ? false : !!isTakeawayLine;
        return itemTa === targetTa ? { ...item, qty: newQty } : item;
      })
    );
  };

  const removeFromCart = (id, cartKey = null, isTakeawayLine) => {
    setCart((prev) =>
      prev.filter((i) => {
        if (cartKey) return i.cartKey !== cartKey;
        if ((i._id || i.id) !== id || i.cartKey) return true;
        const itemTa = !!(i.isTakeaway);
        const targetTa = isTakeawayLine === undefined ? false : !!isTakeawayLine;
        return itemTa !== targetTa;
      })
    );
  };

  const updateCartItem = (cartKey, updateFn) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartKey === cartKey) {
          const updated = updateFn(item);
          // Recalculate price and cartKey if they change
          const addonsTotal = (updated.selectedAddons || []).reduce((sum, a) => sum + (a.price || 0) * (a.qty || 1), 0);
          
          let pPrice = updated.baseProductPrice || updated.price; // fallback if missing
          if (updated.hasPortions && updated.selectedPortion) {
            const pObj = updated.portions?.find(p => p.name === updated.selectedPortion);
            if (pObj) pPrice = pObj.price;
          }
          
          const newUnitPrice = pPrice + addonsTotal;
          
          const newCartKey = `${updated._id || updated.id}_${
            updated.selectedPortion || "base"
          }_${(updated.selectedAddons || [])
            .map((a) => `${a.name}x${a.qty || 1}`)
            .sort()
            .join("+")}`;

          return { ...updated, price: newUnitPrice, cartKey: newCartKey };
        }
        return item;
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
        updateCartItem,
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
