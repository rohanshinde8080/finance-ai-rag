import api from "./api";

export const chatService = {
  async listSessions() {
    const response = await api.get("/chat/sessions");
    return response.data;
  },

  async createSession(title = "New Conversation") {
    const response = await api.post("/chat/sessions", { title });
    return response.data;
  },

  async getSession(sessionId) {
    const response = await api.get(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  async deleteSession(sessionId) {
    const response = await api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  async deleteAllSessions() {
      const response = await api.delete("/chat/sessions");
      return response.data;
    },

  async askQuestion(sessionId, question, category = null, language = "English") {
      const response = await api.post("/chat/ask", {
        session_id: sessionId || null,
        question,
        category: category || null,
        language: language || "English",
      });
      return response.data;
    },

  async submitFeedback(messageId, rating, comments = "") {
    const response = await api.post("/feedback/", {
      message_id: messageId,
      rating,
      comments: comments || null,
    });
    return response.data;
  },

  async submitInquiry(comments, rating = 0) {
    const response = await api.post("/feedback/inquiry", {
      comments,
      rating,
    });
    return response.data;
  },
};

