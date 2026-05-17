/** Cart + menu helpers for products with trackStock. */

export function getProductId(product) {
  return String(product?._id || product?.id || "");
}

export function tracksProductStock(product) {
  return Boolean(product?.trackStock);
}

export function getStockLimit(product) {
  if (!tracksProductStock(product)) return null;
  return Math.max(0, Math.floor(Number(product.stock) || 0));
}

/** Sum qty in cart for one product (all configurations / takeaway lines). */
export function countProductQtyInCart(cart, productId) {
  const pid = String(productId);
  return (cart || []).reduce((sum, item) => {
    if (getProductId(item) !== pid) return sum;
    return sum + (Number(item.qty) || 0);
  }, 0);
}

export function getRemainingStock(product, cart) {
  const limit = getStockLimit(product);
  if (limit === null) return null;
  const inCart = countProductQtyInCart(cart, getProductId(product));
  return Math.max(0, limit - inCart);
}

export function canAddProductQty(product, cart, addQty = 1) {
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
  const limit = getStockLimit(product);
  if (limit === null) return Infinity;

  const pid = getProductId(product);
  const totalInCart = countProductQtyInCart(cart, pid);
  const currentLineQty = Number(lineItem.qty) || 0;
  const otherQty = totalInCart - currentLineQty;

  return Math.max(0, limit - otherQty);
}

export function isProductSoldOut(product) {
  if (product?.isAvailable === false) return true;
  const limit = getStockLimit(product);
  if (limit !== null && limit <= 0) return true;
  return false;
}
