import axios from "axios";

// Detect if running in local development environment
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0");

// In production (e.g. Vercel), fall back to the live Render backend if VITE_API_BASE_URL is not set
const DEFAULT_API_URL = isLocalhost
  ? "http://localhost:8000/api/v1"
  : "https://finance-ai-rag.onrender.com/api/v1";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("finance_ai_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic 401 token expiry handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on 401 and redirect to login if not already there
      localStorage.removeItem("finance_ai_token");
      localStorage.removeItem("finance_ai_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

