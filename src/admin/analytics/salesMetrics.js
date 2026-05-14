import { eachDayOfInterval, format, subDays, differenceInCalendarDays } from "date-fns";
import { computeGstFromSubtotal, GST_TOTAL_RATE } from "../../utils/gstRates";

/** Local calendar bounds for YYYY-MM-DD strings */
export function parseLocalYMD(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function endOfLocalYMD(ymd) {
  const base = parseLocalYMD(ymd);
  if (!base) return null;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
}

export function orderTime(order) {
  const raw = order?.createdAt || order?.updatedAt;
  if (!raw) return null;
  const t = new Date(raw);
  return Number.isNaN(t.getTime()) ? null : t;
}

export function filterOrdersByDateRange(orders, startYmd, endYmd) {
  const start = parseLocalYMD(startYmd);
  const end = endOfLocalYMD(endYmd);
  if (!start || !end || start > end) return [];
  const list = Array.isArray(orders) ? orders : [];
  return list.filter((o) => {
    const t = orderTime(o);
    if (!t) return false;
    return t >= start && t <= end;
  });
}

export function getOrderSubtotal(order) {
  const items = order?.items;
  if (!Array.isArray(items) || items.length === 0) {
    const bd = order?.billDetails;
    if (bd?.subtotal != null && Number.isFinite(Number(bd.subtotal))) return Number(bd.subtotal);
    return 0;
  }
  return items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
}

export function getOrderGross(order) {
  const bd = order?.billDetails;
  if (bd?.grandTotal != null && Number.isFinite(Number(bd.grandTotal))) {
    return Number(bd.grandTotal);
  }
  if (order?.totalAmount != null && Number.isFinite(Number(order.totalAmount))) {
    return Number(order.totalAmount);
  }
  const sub = getOrderSubtotal(order);
  return computeGstFromSubtotal(sub).grandTotal;
}

/**
 * @returns {{ tax: number, estimated: boolean }}
 */
export function getOrderTax(order) {
  const bd = order?.billDetails;
  const cg = bd?.cgst;
  const sg = bd?.sgst;
  if (cg != null && sg != null && Number.isFinite(Number(cg)) && Number.isFinite(Number(sg))) {
    return { tax: Number(cg) + Number(sg), estimated: false };
  }
  const sub = getOrderSubtotal(order);
  return { tax: sub * GST_TOTAL_RATE, estimated: true };
}

export function previousRangeInclusive(startYmd, endYmd) {
  const start = parseLocalYMD(startYmd);
  const endDay = parseLocalYMD(endYmd);
  if (!start || !endDay || start > endDay) return { startYmd: null, endYmd: null };
  const days = Math.max(1, differenceInCalendarDays(endDay, start) + 1);
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(start, days);
  return {
    startYmd: format(prevStart, "yyyy-MM-dd"),
    endYmd: format(prevEnd, "yyyy-MM-dd"),
  };
}

function productCategoryLookup(products) {
  const map = new Map();
  (products || []).forEach((p) => {
    const id = p?._id != null ? String(p._id) : "";
    const name = (p?.name && String(p.name).trim().toLowerCase()) || "";
    const cat = p?.category != null ? String(p.category) : "";
    if (id) map.set(`id:${id}`, cat);
    if (name) map.set(`name:${name}`, cat);
  });
  return map;
}

function lineCategory(item, lookup) {
  const raw =
    item?.category != null && String(item.category).trim() !== ""
      ? String(item.category).trim()
      : "";
  if (raw) return raw;
  const pid = item?.product != null ? String(item.product) : "";
  if (pid && lookup.has(`id:${pid}`)) return lookup.get(`id:${pid}`) || "Uncategorized";
  const nm = (item?.name && String(item.name).trim().toLowerCase()) || "";
  if (nm && lookup.has(`name:${nm}`)) return lookup.get(`name:${nm}`) || "Uncategorized";
  return "Uncategorized";
}

export function aggregateFromOrders(ordersInRange, products, dishSearch) {
  const q = (dishSearch || "").trim().toLowerCase();
  const lookup = productCategoryLookup(products);

  const topMap = {};
  const catMap = {};
  const volMap = {};

  (ordersInRange || []).forEach((order) => {
    (order.items || []).forEach((it) => {
      const name = it?.name != null ? String(it.name) : "Item";
      if (q && !name.toLowerCase().includes(q)) return;
      const rev = (Number(it.price) || 0) * (Number(it.qty) || 0);
      const qty = Number(it.qty) || 0;
      const cat = lineCategory(it, lookup);

      if (!topMap[name]) topMap[name] = { name, count: 0, revenue: 0, price: Number(it.price) || 0 };
      topMap[name].count += qty;
      topMap[name].revenue += rev;

      catMap[cat] = (catMap[cat] || 0) + rev;

      if (!volMap[name]) volMap[name] = { name, qty: 0 };
      volMap[name].qty += qty;
    });
  });

  const topByRevenue = Object.values(topMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const categoryRevenue = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const bestSellersByVolume = Object.values(volMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    topByRevenue,
    categoryRevenue,
    bestSellersByVolume,
  };
}

export function buildDailySalesSeries(ordersInRange, startYmd, endYmd) {
  const start = parseLocalYMD(startYmd);
  const end = parseLocalYMD(endYmd);
  if (!start || !end || start > end) return [];

  const days = eachDayOfInterval({ start, end });
  const byKey = {};
  days.forEach((d) => {
    byKey[format(d, "yyyy-MM-dd")] = 0;
  });

  (ordersInRange || []).forEach((o) => {
    const t = orderTime(o);
    if (!t) return;
    const key = format(t, "yyyy-MM-dd");
    if (Object.prototype.hasOwnProperty.call(byKey, key)) {
      byKey[key] += getOrderGross(o);
    }
  });

  return days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return {
      name: format(d, "EEE"),
      dateKey: key,
      dateLabel: format(d, "d MMM"),
      sales: Math.round(byKey[key] || 0),
    };
  });
}

export function summarizeOrders(ordersInRange) {
  let totalGross = 0;
  let totalTax = 0;
  let anyTaxEstimated = false;
  (ordersInRange || []).forEach((order) => {
    totalGross += getOrderGross(order);
    const { tax, estimated } = getOrderTax(order);
    totalTax += tax;
    if (estimated) anyTaxEstimated = true;
  });
  const n = ordersInRange?.length || 0;
  return {
    totalGross,
    totalTax,
    orderCount: n,
    avgOrderValue: n > 0 ? totalGross / n : 0,
    taxLabel: anyTaxEstimated ? "Est. GST (5%)" : "GST collected",
  };
}
