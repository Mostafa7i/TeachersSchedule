import api from "@/lib/api";

export const aiService = {
  async suggestLessonPlan(payload) {
    const { data } = await api.post("/ai/suggest-lesson", payload);
    return data;
  },
};
