/** Cart + menu helpers for products with trackStock. */

export function getProductId(product) {
  return String(product?._id || product?.id || "");
}

export function tracksProductStock(product) {
  return Boolean(product?.trackStock);
}

export function productHasPortions(product) {
  return Boolean(product?.hasPortions && product?.portions?.length > 0);
}

export function findProductPortion(product, portionName) {
  if (!product?.portions?.length || !portionName) return null;
  const target = String(portionName).trim().toLowerCase();
  return (
    product.portions.find(
      (p) => String(p?.name || "").trim().toLowerCase() === target
    ) || null
  );
}

export function tracksPortionStock(product, portionName) {
  const portion = findProductPortion(product, portionName);
  return Boolean(portion?.trackStock);
}

export function getPortionStockLimit(product, portionName) {
  const portion = findProductPortion(product, portionName);
  if (!portion?.trackStock) return null;
  return Math.max(0, Math.floor(Number(portion.stock) || 0));
}

export function isPortionSoldOut(product, portionName) {
  const portion = findProductPortion(product, portionName);
  if (!portion) return false;
  if (portion.isAvailable === false) return true;
  const limit = getPortionStockLimit(product, portionName);
  if (limit !== null && limit <= 0) return true;
  return false;
}

export function isPortionAvailable(portion) {
  if (!portion || portion.isAvailable === false) return false;
  if (portion.trackStock) {
    return Math.max(0, Math.floor(Number(portion.stock) || 0)) > 0;
  }
  return true;
}

export function getPortionUnavailableInfo(product, portionName, cart = []) {
  const portion = findProductPortion(product, portionName);
  if (!portion || !isPortionAvailable(portion)) {
    return { selectable: false, title: "Sold out", reason: "No stock left" };
  }

  const limit = getStockLimit(product, portionName);
  const remaining = getRemainingStock(product, cart, portionName);
  const inCart =
    portionName && tracksPortionStock(product, portionName)
      ? countPortionQtyInCart(cart, getProductId(product), portionName)
      : productHasPortions(product)
        ? 0
        : countProductQtyInCart(cart, getProductId(product));

  if (remaining !== null && remaining <= 0) {
    if (inCart > 0) {
      const total = limit ?? inCart;
      return {
        selectable: false,
        title: "Sold out",
        reason: `All in cart (${inCart}/${total})`,
      };
    }
    return { selectable: false, title: "Sold out", reason: "No stock left" };
  }

  return { selectable: true, title: null, reason: null };
}

export function getPortionUnavailabilityMessage(product, portionName, cart = []) {
  const info = getPortionUnavailableInfo(product, portionName, cart);
  if (info.selectable) return null;
  return info.reason ? `${info.title} — ${info.reason}` : info.title;
}

export function isPortionSelectable(product, portionName, cart = []) {
  return getPortionUnavailableInfo(product, portionName, cart).selectable;
}

export function getStockLimit(product, portionName = null) {
  if (portionName) {
    if (tracksPortionStock(product, portionName)) {
      return getPortionStockLimit(product, portionName);
    }
    // Portioned menu: only per-portion trackStock applies — not the product-level pool.
    if (productHasPortions(product)) return null;
  }
  if (!tracksProductStock(product)) return null;
  return Math.max(0, Math.floor(Number(product.stock) || 0));
}

export function linePortionName(item) {
  if (item?.selectedPortion) return String(item.selectedPortion).trim();
  const key = item?.cartKey;
  if (typeof key === "string" && key.includes("_")) {
    const rest = key.slice(key.indexOf("_") + 1);
    const end = rest.indexOf("_");
    if (end > 0) {
      const portion = rest.slice(0, end);
      return portion === "base" ? "" : portion;
    }
  }
  return "";
}

/** Sum qty in cart for one product (all configurations / takeaway lines). */
export function countProductQtyInCart(cart, productId) {
  const pid = String(productId);
  return (cart || []).reduce((sum, item) => {
    if (getProductId(item) !== pid) return sum;
    return sum + (Number(item.qty) || 0);
  }, 0);
}

export function countPortionQtyInCart(cart, productId, portionName) {
  const pid = String(productId);
  const portion = String(portionName || "").trim().toLowerCase();
  if (!pid || !portion) return 0;
  return (cart || []).reduce((sum, item) => {
    if (getProductId(item) !== pid) return sum;
    const itemPortion = linePortionName(item).toLowerCase();
    if (itemPortion !== portion) return sum;
    return sum + (Number(item.qty) || 0);
  }, 0);
}

export function getRemainingStock(product, cart, portionName = null) {
  const limit = getStockLimit(product, portionName);
  if (limit === null) return null;
  const inCart =
    portionName && tracksPortionStock(product, portionName)
      ? countPortionQtyInCart(cart, getProductId(product), portionName)
      : countProductQtyInCart(cart, getProductId(product));
  return Math.max(0, limit - inCart);
}

export function canAddPortionQty(product, portionName, cart, addQty = 1) {
  const unavailable = getPortionUnavailableInfo(product, portionName, cart);
  if (!unavailable.selectable) {
    return {
      ok: false,
      message: unavailable.reason
        ? `${unavailable.title} — ${unavailable.reason}`
        : unavailable.title || "Sold out",
    };
  }
  const limit = getPortionStockLimit(product, portionName);
  if (limit === null) return { ok: true };

  const qty = Math.max(1, Math.floor(Number(addQty) || 1));
  const inCart = countPortionQtyInCart(cart, getProductId(product), portionName);
  const remaining = limit - inCart;

  if (remaining <= 0) {
    return {
      ok: false,
      message:
        limit === 1
          ? "Only 1 portion available — already in your cart"
          : `Only ${limit} available — your cart already has ${inCart}`,
      remaining: 0,
      limit,
      inCart,
    };
  }

  if (qty > remaining) {
    return {
      ok: false,
      message:
        remaining === 1
          ? "Only 1 more can be added"
          : `You can only add ${remaining} more (${limit} in stock)`,
      remaining,
      limit,
      inCart,
    };
  }

  return { ok: true, remaining: remaining - qty, limit, inCart };
}

export function canAddProductQty(product, cart, addQty = 1, portionName = null) {
  const portion = portionName || linePortionName(product);
  if (portion && tracksPortionStock(product, portion)) {
    return canAddPortionQty(product, portion, cart, addQty);
  }

  if (isProductSoldOut(product, cart)) {
    return { ok: false, message: "This item is sold out" };
  }

  const limit = getStockLimit(product);
  if (limit === null) return { ok: true };

  const qty = Math.max(1, Math.floor(Number(addQty) || 1));
  const inCart = countProductQtyInCart(cart, getProductId(product));
  const remaining = limit - inCart;

  if (remaining <= 0) {
    return {
      ok: false,
      message:
        limit === 1
          ? "Only 1 item available — already in your cart"
          : `Only ${limit} available — your cart already has ${inCart}`,
      remaining: 0,
      limit,
      inCart,
    };
  }

  if (qty > remaining) {
    return {
      ok: false,
      message:
        remaining === 1
          ? "Only 1 more can be added"
          : `You can only add ${remaining} more (${limit} in stock)`,
      remaining,
      limit,
      inCart,
    };
  }

  return { ok: true, remaining: remaining - qty, limit, inCart };
}

/** Max qty allowed for one cart line (other lines for same product count toward limit). */
export function getMaxLineQty(product, cart, lineItem) {
  const portion = linePortionName(lineItem);
  const limit = getStockLimit(product, portion || null);
  if (limit === null) return Infinity;

  const pid = getProductId(product);
  const totalInCart =
    portion && tracksPortionStock(product, portion)
      ? countPortionQtyInCart(cart, pid, portion)
      : countProductQtyInCart(cart, pid);
  const currentLineQty = Number(lineItem.qty) || 0;
  const otherQty = totalInCart - currentLineQty;

  return Math.max(0, limit - otherQty);
}

export function isProductSoldOut(product, cart = []) {
  if (product?.isAvailable === false) return true;

  const portions = product?.portions || [];
  if (productHasPortions(product)) {
    return !portions.some((p) => {
      if (!p?.name) return false;
      if (!tracksPortionStock(product, p.name)) {
        return p.isAvailable !== false;
      }
      return getPortionUnavailableInfo(product, p.name, cart).selectable;
    });
  }

  const remaining = getRemainingStock(product, cart);
  if (remaining !== null) return remaining <= 0;

  const limit = getStockLimit(product);
  if (limit !== null && limit <= 0) return true;
  return false;
}

export function buildPortionCartKey(productId, portionName, selectedAddons = []) {
  const addonKey = (selectedAddons || [])
    .map((a) => `${a.name}x${a.qty || 1}`)
    .sort()
    .join("+");
  return `${productId}_${portionName || "base"}_${addonKey}`;
}

export function buildPortionCartItem(product, portionName, selectedAddons = []) {
  const portion = findProductPortion(product, portionName);
  const basePrice = Number(product?.price) || 0;
  const unitPrice =
    (Number(portion?.price) || basePrice) +
    (selectedAddons || []).reduce((s, a) => s + (Number(a.price) || 0), 0);
  const cartKey = buildPortionCartKey(getProductId(product), portionName, selectedAddons);
  return {
    ...product,
    baseProductPrice: basePrice,
    selectedPortion: portionName,
    selectedAddons: (selectedAddons || []).map((a) => ({ ...a, qty: 1 })),
    price: unitPrice,
    qty: 1,
    cartKey,
  };
}

export function applyPortionCartDelta(cart, product, portionName, delta, selectedAddons = []) {
  const cartKey = buildPortionCartKey(getProductId(product), portionName, selectedAddons);

  if (delta > 0) {
    const check = canAddProductQty(product, cart, delta, portionName);
    if (!check.ok) return { ok: false, message: check.message, cart };
    const idx = cart.findIndex((i) => i.cartKey === cartKey);
    if (idx !== -1) {
      const copy = [...cart];
      copy[idx] = { ...copy[idx], qty: copy[idx].qty + delta };
      return { ok: true, cart: copy };
    }
    return {
      ok: true,
      cart: [...cart, { ...buildPortionCartItem(product, portionName, selectedAddons), qty: delta }],
    };
  }

  if (delta < 0) {
    const idx = cart.findIndex((i) => i.cartKey === cartKey);
    if (idx === -1) return { ok: true, cart };
    const copy = [...cart];
    const nextQty = copy[idx].qty + delta;
    if (nextQty <= 0) copy.splice(idx, 1);
    else copy[idx] = { ...copy[idx], qty: nextQty };
    return { ok: true, cart: copy };
  }

  return { ok: true, cart };
}
