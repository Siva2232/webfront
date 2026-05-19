import { createContext, useContext, useState, useEffect } from "react";
import { syncRestaurantCache, getRestaurantIdForTenantData, tenantKey, tenantRemove } from "../utils/tenantCache";
import {
  canAddProductQty,
  getMaxLineQty,
  getProductId,
  tracksProductStock,
} from "../utils/productStockCart";

const CartContext = createContext();

// special table identifiers used when the customer chooses takeaway or
// when the staff creates a delivery/manual order without a specific table
export const TAKEAWAY_TABLE = "TAKEAWAY";
export const DELIVERY_TABLE = "DELIVERY";

const getCartKey = (table) => {
  const rid = getRestaurantIdForTenantData() || '';
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
        const _rid = getRestaurantIdForTenantData();
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
    const _rid = getRestaurantIdForTenantData();
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
      const _rid = getRestaurantIdForTenantData();
      if (table !== TAKEAWAY_TABLE && table !== DELIVERY_TABLE) {
        localStorage.setItem(tenantKey("lastUsedTable", _rid), table);
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
    const t = newTable?.trim() || "";
    let next;
    if (t === TAKEAWAY_TABLE || t === DELIVERY_TABLE) {
      next = t;
    } else {
      next = t.replace(/[^0-9]/g, "") || "";
    }
    if (next !== table) {
      setTableState(next);
    }
  };

  const addToCart = (product, isTakeawayItem = false) => {
    const addQty = Math.max(1, Math.floor(Number(product.qty) || 1));
    const preCheck = canAddProductQty(product, cart, addQty);
    if (!preCheck.ok) return preCheck;

    let blocked = null;

    setCart((prev) => {
      const check = canAddProductQty(product, prev, addQty);
      if (!check.ok) {
        blocked = check;
        return prev;
      }

      const cartKey = product.cartKey;
      const ensureMax = (items) => (items.length > MAX_CART_ITEMS ? items.slice(-MAX_CART_ITEMS) : items);

      if (cartKey) {
        const exists = prev.find(
          (i) => i.cartKey === cartKey && (i.isTakeaway || false) === isTakeawayItem
        );
        if (exists) {
          return ensureMax(
            prev.map((i) =>
              i.cartKey === cartKey && (i.isTakeaway || false) === isTakeawayItem
                ? { ...i, qty: i.qty + addQty }
                : i
            )
          );
        }
        return ensureMax([
          ...prev,
          { ...product, qty: addQty, isTakeaway: isTakeawayItem },
        ]);
      }

      const exists = prev.find(
        (i) =>
          getProductId(i) === getProductId(product) &&
          !i.cartKey &&
          (i.isTakeaway || false) === isTakeawayItem
      );
      if (exists) {
        return ensureMax(
          prev.map((i) =>
            getProductId(i) === getProductId(product) &&
            !i.cartKey &&
            (i.isTakeaway || false) === isTakeawayItem
              ? { ...i, qty: i.qty + addQty }
              : i
          )
        );
      }
      return ensureMax([
        ...prev,
        { ...product, qty: addQty, isTakeaway: isTakeawayItem },
      ]);
    });

    return blocked || { ok: true };
  };

  /**
   * For plain items (no cartKey), `isTakeawayLine` selects dine-in vs takeaway row.
   * When omitted, defaults to dine-in only (false) so legacy callers don’t wipe both lines.
   */
  const updateQuantity = (id, newQty, cartKey = null, isTakeawayLine) => {
    if (newQty < 1) {
      removeFromCart(id, cartKey, isTakeawayLine);
      return { ok: true };
    }

    let blocked = null;

    setCart((prev) => {
      const line = prev.find((item) => {
        if (cartKey) return item.cartKey === cartKey;
        if ((item._id || item.id) !== id || item.cartKey) return false;
        const itemTa = !!item.isTakeaway;
        const targetTa = isTakeawayLine === undefined ? false : !!isTakeawayLine;
        return itemTa === targetTa;
      });

      if (!line) return prev;

      if (tracksProductStock(line)) {
        const maxLine = getMaxLineQty(line, prev, line);
        if (newQty > maxLine) {
          blocked = {
            ok: false,
            message:
              maxLine <= 0
                ? "No more stock available for this item"
                : `Only ${maxLine} available for this item`,
          };
          return prev;
        }
      }

      return prev.map((item) => {
        if (cartKey) return item.cartKey === cartKey ? { ...item, qty: newQty } : item;
        if ((item._id || item.id) !== id || item.cartKey) return item;
        const itemTa = !!item.isTakeaway;
        const targetTa = isTakeawayLine === undefined ? false : !!isTakeawayLine;
        return itemTa === targetTa ? { ...item, qty: newQty } : item;
      });
    });

    return blocked || { ok: true };
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

  /** Decrease qty by 1 for menu card (−); works for plain items and portion/addon lines (cartKey). */
  const decrementProductFromCart = (id, isTakeawayLine) => {
    const pid = String(id);
    const targetTa = isTakeawayLine === undefined ? false : !!isTakeawayLine;

    setCart((prev) => {
      let targetIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        const item = prev[i];
        if (getProductId(item) !== pid) continue;
        if (!!item.isTakeaway !== targetTa) continue;
        targetIndex = i;
        break;
      }
      if (targetIndex === -1) return prev;

      const line = prev[targetIndex];
      if (line.qty > 1) {
        return prev.map((item, idx) =>
          idx === targetIndex ? { ...item, qty: item.qty - 1 } : item
        );
      }
      return prev.filter((_, idx) => idx !== targetIndex);
    });
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
        decrementProductFromCart,
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
