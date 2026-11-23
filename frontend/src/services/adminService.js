import api from "./api";

export const adminService = {
  async getDashboardStats() {
    const response = await api.get("/admin/dashboard/stats");
    return response.data;
  },

  async listUsers(skip = 0, limit = 50, search = "") {
    const params = { skip, limit };
    if (search) params.search = search;
    const response = await api.get("/admin/users", { params });
    return response.data;
  },

  async updateUserStatus(userId, isActive) {
    const response = await api.patch(`/admin/users/${userId}/status`, {
      is_active: isActive,
    });
    return response.data;
  },

  async getFeedbackSummary(limit = 20) {
    const response = await api.get("/admin/feedback/summary", {
      params: { limit },
    });
    return response.data;
  },

  async getAuditLogs(skip = 0, limit = 50) {
    const response = await api.get("/admin/audit-logs", {
      params: { skip, limit },
    });
    return response.data;
  },
};

