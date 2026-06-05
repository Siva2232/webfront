export function formatDurationMinutes(mins) {
  if (mins == null || !Number.isFinite(Number(mins))) return "—";
  const n = Math.round(Number(mins));
  if (n < 60) return `${n}m`;
  const hours = Math.floor(n / 60);
  const rem = n % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

/**
 * Append catalog products with zero sales so low-performer list is actionable.
 * @param {Array} lowPerformingMenu - from API
 * @param {Array} products - catalog
 * @param {number} maxItems
 */
export function mergeZeroSaleProducts(lowPerformingMenu, products, maxItems = 8) {
  const sold = new Map(
    (lowPerformingMenu || []).map((r) => [String(r.name).toLowerCase(), r])
  );
  const merged = [...(lowPerformingMenu || [])];

  (products || []).forEach((p) => {
    const name = p?.name != null ? String(p.name) : "";
    if (!name) return;
    const key = name.toLowerCase();
    if (!sold.has(key)) {
      merged.push({ name, qty: 0, revenue: 0, noSales: true });
      sold.set(key, merged[merged.length - 1]);
    }
  });

  return merged
    .sort((a, b) => {
      if (a.qty !== b.qty) return a.qty - b.qty;
      return a.revenue - b.revenue;
    })
    .slice(0, maxItems);
}

export const EMPTY_INSIGHTS = {
  range: { start: null, end: null },
  summary: {
    busiestDay: null,
    quietestDay: null,
    busiestHour: null,
    avgCustomerSpend: 0,
    uniqueCustomers: 0,
    avgDiningDurationMinutes: null,
    diningSampleSize: 0,
    topCustomer: null,
  },
  hourlyBreakdown: [],
  dailyBreakdown: [],
  lowPerformingMenu: [],
  forecast: {
    horizonDays: 7,
    expectedOrders: 0,
    expectedRevenue: 0,
    dailyAvgOrders: 0,
    dailyAvgRevenue: 0,
  },
};
