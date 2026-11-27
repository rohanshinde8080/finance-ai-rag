import api from "./api";

export const docService = {
  async listDocuments(skip = 0, limit = 50, category = null) {
    const params = { skip, limit };
    if (category) params.category = category;
    const response = await api.get("/documents", { params });
    return response.data;
  },

  async getDocument(docId) {
    const response = await api.get(`/documents/${docId}`);
    return response.data;
  },

  async uploadDocument(file, title, category) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("category", category);

    const response = await api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 120000,
    });
    return response.data;
  },

  async deleteDocument(docId) {
    const response = await api.delete(`/documents/${docId}`);
    return response.data;
  },

  async reprocessDocument(docId) {
    const response = await api.post(`/documents/${docId}/reprocess`, null, {
      timeout: 120000,
    });
    return response.data;
  },
};

