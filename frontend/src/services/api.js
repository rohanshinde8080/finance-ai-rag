import axios from "axios";

// Detect if running in local development environment
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0");

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // In production / deployed domains (e.g. *.vercel.app):
  if (typeof window !== "undefined" && !isLocalhost) {
    // If envUrl is missing or points to localhost, always route to the live Render backend
    if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      return "https://finance-ai-rag.onrender.com/api/v1";
    }
    return envUrl;
  }

  // In local development:
  return envUrl || "http://localhost:8000/api/v1";
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
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

// Response interceptor with automatic retry on transient network errors / cold starts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isNetworkError =
      !error.response ||
      error.code === "ERR_NETWORK" ||
      error.code === "ERR_CONNECTION_CLOSED" ||
      error.message?.includes("Network Error") ||
      [502, 503, 504].includes(error.response?.status);

    // Auto-retry up to 2 times for transient network drops or backend cold starts
    if (config && isNetworkError && (!config._retryCount || config._retryCount < 2)) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delayMs = config._retryCount * 1200;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(config);
    }

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

