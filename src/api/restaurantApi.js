import API from "./axios";

// ── Public ─────────────────────────────────────────────────────────────────
export const getRestaurantBranding = (restaurantId) =>
  API.get(`/restaurants/${restaurantId}/branding`);

export const getRestaurantFeatures = (restaurantId) =>
  API.get(`/restaurants/${restaurantId}/features`, { skipCoalesce: true });

// ── Super Admin ────────────────────────────────────────────────────────────
export const getRestaurants      = (config)    => API.get("/restaurants", config);
export const getRestaurantById   = (id)        => API.get(`/restaurants/${id}`);
export const createRestaurant    = (data)      => API.post("/restaurants", data);
export const updateRestaurant    = (id, data)  => API.put(`/restaurants/${id}`, data);
export const updateBranding      = (id, data)  => API.put(`/restaurants/${id}/branding`, data);
export const updateFeatures      = (id, data)  => API.put(`/restaurants/${id}/features`, data);
export const assignPlan          = (id, data)  => API.put(`/restaurants/${id}/plan`, data);
export const deleteRestaurant    = (id)        => API.delete(`/restaurants/${id}`);
export const getAnalytics        = (config)    => API.get("/restaurants/analytics/overview", config);
export const renewSubscription   = (id, data)  => API.post(`/restaurants/${id}/renew`, data);

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
export const updateSuperAdminProfile = (data) => API.put("/superadmin/profile", data);
export const changeSuperAdminPassword = (data) => API.put("/superadmin/profile/password", data);

// ── Payments (Razorpay) ────────────────────────────────────────────────────
export const getPaymentConfig = () => API.get("/payments/config");
export const getPaymentConfigAdmin = () => API.get("/payments/config/admin");
export const updatePaymentConfig = (data) => API.put("/payments/config", data);
export const testPaymentConfig = () => API.post("/payments/config/test");
export const createCustomerOrder = (data) => API.post("/payments/create-order", data);
export const verifyCustomerPayment = (data) => API.post("/payments/verify", data);

// ── Subscription payments (platform Razorpay) ────────────────────────────────
export const createSubscriptionOrder = (data) => API.post("/subscriptions/create-order", data);
export const verifySubscriptionPayment = (data) => API.post("/subscriptions/verify", data);
export const activateSubscription = (data) => API.post("/subscriptions/activate", data);
// renewSubscription is defined above (supports optional body e.g. { force: true })

// ── Super Admin Platform Payments ────────────────────────────────────────────
export const getPlatformPaymentSettings = () => API.get("/superadmin/platform-payments/settings");
export const updatePlatformPaymentSettings = (data) => API.put("/superadmin/platform-payments/settings", data);
export const testPlatformPaymentSettings = () => API.post("/superadmin/platform-payments/settings/test");
export const getPlatformPaymentHistory = () => API.get("/superadmin/platform-payments/history");
export const getSubscriptionPaymentHistory = () => API.get("/subscriptions/payment-history");

// ── Super Admin Analytics Robot ─────────────────────────────────────────────
export const getAnalyticsRobotSnapshot = (config) =>
  API.get("/superadmin/analytics-robot/snapshot", config);
export const askAnalyticsRobot = (data) =>
  API.post("/superadmin/analytics-robot/ask", data);

// ── Super Admin Notifications ──────────────────────────────────────────────
export const getSANotifications = (config) => API.get("/sa-notifications", config);
export const markSANotificationRead = (id) => API.patch(`/sa-notifications/${id}/read`);
export const markAllSANotificationsRead = () => API.patch("/sa-notifications/read-all");
export const deleteSANotification = (id) => API.delete(`/sa-notifications/${id}`);

