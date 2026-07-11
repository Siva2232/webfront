/** Default stock fields for add-product forms. */
export const defaultStockFormFields = () => ({
  trackStock: false,
  stock: "",
});

export function validateStockForm({ trackStock, stock }) {
  if (!trackStock) return null;
  if (stock === "" || stock === undefined || stock === null) {
    return "Enter starting quantity when tracking stock";
  }
  if (Number(stock) < 0 || !Number.isFinite(Number(stock))) {
    return "Quantity must be 0 or greater";
  }
  return null;
}

/** Payload for POST/PUT /products — keeps manual vs quantity modes separate. */
export function buildStockApiPayload({ trackStock, stock, isAvailable = true }) {
  if (!trackStock) {
    return {
      trackStock: false,
      stock: 0,
      isAvailable: Boolean(isAvailable),
    };
  }
  const qty = Math.max(0, Math.floor(Number(stock) || 0));
  return {
    trackStock: true,
    stock: qty,
    isAvailable: qty > 0,
  };
}

export function validatePortionsStock(portions = []) {
  for (const p of portions) {
    if (!p?.trackStock) continue;
    if (p.stock === "" || p.stock === undefined || p.stock === null) {
      return `Enter quantity for portion "${p.name || "portion"}" when tracking stock`;
    }
    if (Number(p.stock) < 0 || !Number.isFinite(Number(p.stock))) {
      return `Portion "${p.name || "portion"}" quantity must be 0 or greater`;
    }
  }
  return null;
}

export function buildPortionApiPayload(p) {
  const name = String(p?.name || "").trim();
  const price = Number(p?.price) || 0;
  if (!p?.trackStock) {
    return {
      name,
      price,
      trackStock: false,
      stock: 0,
      isAvailable: p?.isAvailable !== false,
    };
  }
  const qty = Math.max(0, Math.floor(Number(p.stock) || 0));
  return {
    name,
    price,
    trackStock: true,
    stock: qty,
    isAvailable: qty > 0,
  };
}

export const defaultPortionFormFields = () => ({
  trackStock: false,
  stock: "",
});
