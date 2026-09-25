// services/feedback.service.js
import api from "@/lib/api";

export const feedbackService = {
  async create(feedbackData) {
    const { data } = await api.post("/feedback", feedbackData);
    return data;
  },
  async getMyFeedback() {
    const { data } = await api.get("/feedback/me");
    return data;
  },
  async getAll(params = {}) {
    const { data } = await api.get("/feedback/all", { params });
    return data;
  },
  async reply(id, payload) {
    const { data } = await api.put(`/feedback/${id}/reply`, payload);
    return data;
  },
  async remove(id) {
    const { data } = await api.delete(`/feedback/${id}`);
    return data;
  },
};
