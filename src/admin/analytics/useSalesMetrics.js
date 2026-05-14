import { useMemo } from "react";
import {
  filterOrdersByDateRange,
  aggregateFromOrders,
  buildDailySalesSeries,
  summarizeOrders,
  previousRangeInclusive,
} from "./salesMetrics";

/**
 * Order-based sales analytics for a date range.
 * KPI totals use all orders in range; top lists respect `dishSearch` on line-item names.
 */
export function useSalesMetrics({ orders, products, dateRange, dishSearch }) {
  return useMemo(() => {
    const inRange = filterOrdersByDateRange(orders, dateRange.start, dateRange.end);
    const prev = previousRangeInclusive(dateRange.start, dateRange.end);
    const prevOrders =
      prev.startYmd && prev.endYmd
        ? filterOrdersByDateRange(orders, prev.startYmd, prev.endYmd)
        : [];

    const currentSummary = summarizeOrders(inRange);
    const previousSummary = summarizeOrders(prevOrders);
    const lists = aggregateFromOrders(inRange, products, dishSearch);
    const dailySales = buildDailySalesSeries(inRange, dateRange.start, dateRange.end);

    return {
      ordersInRange: inRange,
      previousRange: prev,
      previousOrders: prevOrders,
      currentSummary,
      previousSummary,
      dailySales,
      topByRevenue: lists.topByRevenue,
      categoryRevenue: lists.categoryRevenue,
      bestSellersByVolume: lists.bestSellersByVolume,
    };
  }, [orders, products, dateRange.start, dateRange.end, dishSearch]);
}
