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
