import API from "./axios";

export const getAggregatorOverview = () =>
  API.get("/superadmin/aggregator/overview");

export const getAggregatorRestaurants = () =>
  API.get("/superadmin/aggregator/restaurants");

export const getAggregatorLogs = (params = {}) =>
  API.get("/superadmin/aggregator/logs", { params });

export const getPlatformAggregatorSettings = () =>
  API.get("/superadmin/aggregator/platform-settings");

export const updatePlatformAggregatorSettings = (data) =>
  API.put("/superadmin/aggregator/platform-settings", data);

export const testPlatformAggregatorSettings = () =>
  API.post("/superadmin/aggregator/platform-settings/test");
