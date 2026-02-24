import axios from "axios";

// dynamic baseURL: choose between development/local and production endpoints
// Production builds should set VITE_API_BASE_URL to the full API URL (e.g. https://myapp.com/api).
// During local development we prefer to hit the backend running on localhost:5000 via Vite proxy,
// but you can override it with VITE_API_BASE_URL_DEV if needed.
//
// Usage examples:
//   # dev (default)
//   npm run dev
//   # force a custom URL for the dev server
//   VITE_API_BASE_URL_DEV=http://localhost:5000/api npm run dev
//   # production build
//   VITE_API_BASE_URL=https://backend.example.com/api npm run build

const isProd = import.meta.env.PROD;
const baseURL = isProd
  ? import.meta.env.VITE_API_BASE_URL || "https://backend-res-ikeb.onrender.com/api"
  : import.meta.env.VITE_API_BASE_URL_DEV || "/api";

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

// Add a response interceptor to handle 401 errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear local storage for all roles and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");
      localStorage.removeItem("isAdminLoggedIn");
      localStorage.removeItem("isKitchenLoggedIn");
      
      // We can't use useNavigate here as it's not a component, 
      // but we can use window.location
      if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/menu")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
