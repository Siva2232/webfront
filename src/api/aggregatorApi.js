import API from "./axios";

export const getAggregatorConfig = () => API.get("/aggregator/config");
export const updateAggregatorConfig = (data) => API.put("/aggregator/config", data);
export const testAggregatorConfig = () => API.post("/aggregator/config/test");
export const syncAggregatorMenu = () => API.post("/aggregator/menu/sync");
export const getAggregatorMenuStatus = () => API.get("/aggregator/menu/status");
export const getAggregatorLogs = () => API.get("/aggregator/logs");
