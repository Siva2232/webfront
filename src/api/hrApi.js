import API from './axios';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const hrLogin = (data) => API.post('/hr/staff/login', data);
export const getMyHRProfile = () => API.get('/hr/staff/me');
export const changeMyHRPassword = (data) => API.put('/hr/staff/me/password', data);

// ── Staff ─────────────────────────────────────────────────────────────────────
export const getAllStaff = (params) => API.get('/hr/staff', { params });
/** Active HR staff with `isCashier` — for POS bill print picker */
export const getStaffCashiers = () => API.get('/hr/staff/cashiers');
export const getStaffById = (id) => API.get(`/hr/staff/${id}`);
export const createStaff = (data) => API.post('/hr/staff', data);
export const updateStaff = (id, data) => API.put(`/hr/staff/${id}`, data);
export const deleteStaff = (id) => API.delete(`/hr/staff/${id}`);
export const uploadStaffDocument = (id, data) => API.post(`/hr/staff/${id}/documents`, data);
export const deleteStaffDocument = (id, docId) => API.delete(`/hr/staff/${id}/documents/${docId}`);

// ── Attendance ────────────────────────────────────────────────────────────────
export const getAttendance = (params) => API.get('/hr/attendance', { params });
export const markAttendance = (data) => API.post('/hr/attendance', data);
export const updateAttendance = (id, data) => API.put(`/hr/attendance/${id}`, data);
export const deleteAttendance = (id) => API.delete(`/hr/attendance/${id}`);
export const getAttendanceSummary = (staffId, params) => API.get(`/hr/attendance/summary/${staffId}`, { params });
export const getMyAttendance = (params) => API.get('/hr/attendance/mine', { params });
export const locationAttendance = (data) => API.post('/hr/attendance/location', data);
export const getAttendanceLocation = () => API.get('/hr/attendance/location-config');
export const setAttendanceLocation = (data) => API.post('/hr/attendance/location-config', data);

// ── Leaves ────────────────────────────────────────────────────────────────────
export const getLeaves = (params) => API.get('/hr/leaves', { params });
export const applyLeave = (data) => API.post('/hr/leaves', data);
export const updateLeave = (id, data) => API.put(`/hr/leaves/${id}`, data);
export const deleteLeave = (id) => API.delete(`/hr/leaves/${id}`);
export const getMyLeaves = (params) => API.get('/hr/leaves/mine', { params });

// ── Shifts ────────────────────────────────────────────────────────────────────
export const getShifts = () => API.get('/hr/shifts');
export const getShiftById = (id) => API.get(`/hr/shifts/${id}`);
export const createShift = (data) => API.post('/hr/shifts', data);
export const updateShift = (id, data) => API.put(`/hr/shifts/${id}`, data);
export const deleteShift = (id) => API.delete(`/hr/shifts/${id}`);
export const assignStaffToShift = (id, data) => API.put(`/hr/shifts/${id}/assign`, data);

// ── Payroll ───────────────────────────────────────────────────────────────────
export const getPayrolls = (params) => API.get('/hr/payroll', { params });
export const getPayrollById = (id) => API.get(`/hr/payroll/${id}`);
export const generatePayroll = (data) => API.post('/hr/payroll/generate', data);
export const generatePayrollAll = (data) => API.post('/hr/payroll/generate-all', data);
export const updatePayroll = (id, data) => API.put(`/hr/payroll/${id}`, data);
export const sendPayslip = (id) => API.post(`/hr/payroll/${id}/send-payslip`);
export const getMyPayrolls = () => API.get('/hr/payroll/mine');
export const getPayslipPDFUrl = (id) => `/api/hr/payroll/${id}/payslip-pdf`;
