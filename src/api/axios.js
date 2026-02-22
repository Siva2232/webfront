import axios from "axios";

// dynamic baseURL: use Vite environment variable (prefix VITE_) or fallback to relative path
const baseURL = import.meta.env.VITE_API_URL || "/api";
const API = axios.create({
  baseURL,
});

// Add a request interceptor to include the auth token
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
}, (error) => {
  return Promise.reject(error);
});

export default API;
