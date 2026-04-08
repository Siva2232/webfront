import API from "./axios";

// ── Public ─────────────────────────────────────────────────────────────────
export const getRestaurantBranding = (restaurantId) =>
  API.get(`/restaurants/${restaurantId}/branding`);

// ── Super Admin ────────────────────────────────────────────────────────────
export const getRestaurants      = ()          => API.get("/restaurants");
export const getRestaurantById   = (id)        => API.get(`/restaurants/${id}`);
export const createRestaurant    = (data)      => API.post("/restaurants", data);
export const updateRestaurant    = (id, data)  => API.put(`/restaurants/${id}`, data);
export const updateBranding      = (id, data)  => API.put(`/restaurants/${id}/branding`, data);
export const updateFeatures      = (id, data)  => API.put(`/restaurants/${id}/features`, data);
export const assignPlan          = (id, data)  => API.put(`/restaurants/${id}/plan`, data);
export const deleteRestaurant    = (id)        => API.delete(`/restaurants/${id}`);
export const getAnalytics        = ()          => API.get("/restaurants/analytics/overview");

// ── Plans ──────────────────────────────────────────────────────────────────
export const getPlans   = ()         => API.get("/plans");
export const getPlan    = (id)       => API.get(`/plans/${id}`);
export const createPlan = (data)     => API.post("/plans", data);
export const updatePlan = (id, data) => API.put(`/plans/${id}`, data);
export const deletePlan = (id)       => API.delete(`/plans/${id}`);

// ── Super Admin Auth ───────────────────────────────────────────────────────
export const superAdminLogin    = (data) => API.post("/superadmin/login", data);
export const superAdminRegister = (data) => API.post("/superadmin/register", data);
export const getSuperAdminMe    = ()     => API.get("/superadmin/me");
