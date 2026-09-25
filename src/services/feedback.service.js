// services/feedback.service.js
import api from "@/lib/api";

export const feedbackService = {
  // Teacher: Submit feedback/complaint
  async create(feedbackData) {
    const { data } = await api.post("/feedback", feedbackData);
    return data;
  },

  // Teacher: Get my submitted feedback
  async getMyFeedback() {
    const { data } = await api.get("/feedback/me");
    return data;
  },

  // Admin: Get all feedback with filters
  async getAll(params = {}) {
    const { data } = await api.get("/feedback/all", { params });
    return data;
  },

  // Admin: Reply to feedback
  async reply(id, payload) {
    const { data } = await api.put(`/feedback/${id}/reply`, payload);
    return data;
  },

  // Delete feedback
  async remove(id) {
    const { data } = await api.delete(`/feedback/${id}`);
    return data;
  },
};
