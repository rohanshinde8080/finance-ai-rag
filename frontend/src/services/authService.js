import api from "./api";

export const authService = {
  async register(fullName, email, password) {
    const response = await api.post("/auth/register", {
      full_name: fullName,
      email,
      password,
    });
    return response.data;
  },

  async login(email, password) {
    const response = await api.post("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  async getMe() {
    const response = await api.get("/auth/me");
    return response.data;
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("finance_ai_token");
      localStorage.removeItem("finance_ai_user");
    }
  },
};

