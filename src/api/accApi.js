import API from './axios';

// ── Parties ──────────────────────────────────────────────────────────────────
export const getParties = (params) => API.get('/acc/parties', { params });
export const getParty = (id) => API.get(`/acc/parties/${id}`);
export const createParty = (data) => API.post('/acc/parties', data);
export const updateParty = (id, data) => API.put(`/acc/parties/${id}`, data);
export const deleteParty = (id) => API.delete(`/acc/parties/${id}`);

// ── Chart of Accounts ────────────────────────────────────────────────────────
export const getAccounts = (params) => API.get('/acc/accounts', { params });
export const getAccount = (id) => API.get(`/acc/accounts/${id}`);
export const createAccount = (data) => API.post('/acc/accounts', data);
export const updateAccount = (id, data) => API.put(`/acc/accounts/${id}`, data);
export const deleteAccount = (id) => API.delete(`/acc/accounts/${id}`);
export const seedChartOfAccounts = () => API.post('/acc/accounts/seed');

// ── Sales Orders ─────────────────────────────────────────────────────────────
export const getOrders = (params) => API.get('/acc/orders', { params });
export const getOrder = (id) => API.get(`/acc/orders/${id}`);
export const createOrder = (data) => API.post('/acc/orders', data);
export const updateOrder = (id, data) => API.put(`/acc/orders/${id}`, data);
export const deleteOrder = (id) => API.delete(`/acc/orders/${id}`);

// ── Purchases ────────────────────────────────────────────────────────────────
export const getPurchases = (params) => API.get('/acc/purchases', { params });
export const getPurchase = (id) => API.get(`/acc/purchases/${id}`);
export const createPurchase = (data) => API.post('/acc/purchases', data);
export const updatePurchase = (id, data) => API.put(`/acc/purchases/${id}`, data);
export const deletePurchase = (id) => API.delete(`/acc/purchases/${id}`);

// ── Expenses ─────────────────────────────────────────────────────────────────
export const getExpenses = (params) => API.get('/acc/expenses', { params });
export const getExpense = (id) => API.get(`/acc/expenses/${id}`);
export const createExpense = (data) => API.post('/acc/expenses', data);
export const updateExpense = (id, data) => API.put(`/acc/expenses/${id}`, data);
export const deleteExpense = (id) => API.delete(`/acc/expenses/${id}`);

// ── Loans / Advances ─────────────────────────────────────────────────────────
export const getLoans = (params) => API.get('/acc/loans', { params });
export const getLoan = (id) => API.get(`/acc/loans/${id}`);
export const createLoan = (data) => API.post('/acc/loans', data);
export const updateLoan = (id, data) => API.put(`/acc/loans/${id}`, data);
export const deleteLoan = (id) => API.delete(`/acc/loans/${id}`);

// ── Payments ─────────────────────────────────────────────────────────────────
export const getPayments = (params) => API.get('/acc/payments', { params });
export const createPayment = (data) => API.post('/acc/payments', data);
export const deletePayment = (id) => API.delete(`/acc/payments/${id}`);

// ── Ledger ───────────────────────────────────────────────────────────────────
export const getLedgerEntries = (params) => API.get('/acc/ledger', { params });
export const getAccountStatement = (id, params) => API.get(`/acc/ledger/account/${id}`, { params });

// ── Reports ──────────────────────────────────────────────────────────────────
export const getProfitLoss = (params) => API.get('/acc/reports/pl', { params });
export const getBalanceSheet = () => API.get('/acc/reports/balance-sheet');
export const getAgingReport = (params) => API.get('/acc/reports/aging', { params });
export const getDailyClosing = (params) => API.get('/acc/reports/daily', { params });
export const getPartyStatement = (id) => API.get(`/acc/reports/party/${id}`);
