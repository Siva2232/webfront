import API from "./axios";

export function getOperationsInsights({ startDate, endDate }) {
  return API.get("/orders/analytics/insights", {
    params: { startDate, endDate },
  });
}
