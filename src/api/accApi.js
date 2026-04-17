import axios from './axios';

const accApi = {
  getDashboard: () => axios.get('/accounting/dashboard'),
  getLedgers: () => axios.get('/accounting/ledgers'),
  getLedgerHistory: (ledgerId) => axios.get(`/accounting/ledgers/${ledgerId}/history`),
  createLedger: (data) => axios.post('/accounting/ledgers', data),
  getTransactions: () => axios.get('/accounting/transactions'),
  payBill: (data) => axios.post('/accounting/bill-payment', data),
};

export default accApi;
