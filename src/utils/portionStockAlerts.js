/** Client-side portion / sub-item stock alerts for admin dashboards. */

export const PORTION_ALERT_THRESHOLD = 5;

export function collectPortionStockAlerts(products = [], threshold = PORTION_ALERT_THRESHOLD) {
  const alerts = [];

  for (const product of products || []) {
    if (!product?.portions?.length) continue;

    for (const portion of product.portions) {
      const name = String(portion?.name || "").trim();
      if (!name) continue;

      const trackStock = Boolean(portion.trackStock);
      const stock = Math.max(0, Math.floor(Number(portion.stock) || 0));
      const manualOut = portion.isAvailable === false;

      if (trackStock && stock <= threshold) {
        alerts.push({
          id: `${product._id || product.id}::${name}`,
          productId: String(product._id || product.id || ""),
          productName: product.name || "Item",
          portion: name,
          stock,
          issue: stock <= 0 ? "Sold out" : `${stock} left`,
          type: "portion",
          image: product.image || null,
        });
      } else if (!trackStock && manualOut) {
        alerts.push({
          id: `${product._id || product.id}::${name}`,
          productId: String(product._id || product.id || ""),
          productName: product.name || "Item",
          portion: name,
          stock: 0,
          issue: "Sold out",
          type: "portion",
          image: product.image || null,
        });
      }
    }
  }

  return alerts.sort((a, b) => a.stock - b.stock);
}

export function formatPortionAlertLabel(alert) {
  if (!alert) return "";
  return alert.portion
    ? `${alert.productName} · ${alert.portion}`
    : alert.productName || alert.name || "Item";
}
