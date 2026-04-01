import API from "./axios";

// Ledgers
export const getLedgers = (params) => API.get("/accounting/ledgers", { params });
export const getLedger = (id) => API.get(`/accounting/ledgers/${id}`);
export const createLedger = (data) => API.post("/accounting/ledgers", data);
export const updateLedger = (id, data) => API.put(`/accounting/ledgers/${id}`, data);
export const deleteLedger = (id) => API.delete(`/accounting/ledgers/${id}`);
export const getLedgerStatement = (id, params) => API.get(`/accounting/ledgers/${id}/statement`, { params });

// Transactions
export const getTransactions = (params) => API.get("/accounting/transactions", { params });
export const getTransaction = (id) => API.get(`/accounting/transactions/${id}`);
export const createTransaction = (data) => API.post("/accounting/transactions", data);
export const deleteTransaction = (id) => API.delete(`/accounting/transactions/${id}`);
export const createExpense = (data) => API.post("/accounting/transactions/expense", data);
export const createIncome = (data) => API.post("/accounting/transactions/income", data);

// Categories
export const getCategories = (params) => API.get("/accounting/categories", { params });
export const createCategory = (data) => API.post("/accounting/categories", data);
export const updateCategory = (id, data) => API.put(`/accounting/categories/${id}`, data);
export const deleteCategory = (id) => API.delete(`/accounting/categories/${id}`);

// Reports
export const getSummary = (params) => API.get("/accounting/reports/summary", { params });
export const getMonthlyReport = (params) => API.get("/accounting/reports/monthly", { params });
export const getCashFlow = (params) => API.get("/accounting/reports/cashflow", { params });
export const getProfitLoss = (params) => API.get("/accounting/reports/pl", { params });
export const getDashboardStats = () => API.get("/accounting/reports/dashboard");

// Recurring
export const getRecurring = () => API.get("/accounting/recurring");
export const createRecurring = (data) => API.post("/accounting/recurring", data);
export const updateRecurring = (id, data) => API.put(`/accounting/recurring/${id}`, data);
export const deleteRecurring = (id) => API.delete(`/accounting/recurring/${id}`);
