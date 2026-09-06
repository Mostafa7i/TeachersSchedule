// services/schedules.service.js
import api from "@/lib/api";

export const schedulesService = {
  async getByWeek(weekId, params = {}) {
    const { data } = await api.get(`/schedules/week/${weekId}`, { params });
    return data;
  },

  async getForTeacher(weekId) {
    const { data } = await api.get("/schedules/teacher/me", {
      params: { weekId },
    });
    return data;
  },

  async getTeacherTimetable(teacherId, weekId) {
    const { data } = await api.get(
      `/schedules/teacher-timetable/${teacherId}`,
      {
        params: { weekId },
      },
    );
    return data;
  },

  async getCompletionStats(weekId) {
    const { data } = await api.get("/schedules/completion-stats", {
      params: weekId ? { weekId } : {},
    });
    return data;
  },

  async saveTeacherTimetable(payload) {
    const { data } = await api.post(
      "/schedules/save-teacher-timetable",
      payload,
    );
    return data;
  },

  async saveMasterCell(payload) {
    const { data } = await api.post("/schedules/master-cell", payload);
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/schedules/${id}`);
    return data;
  },

  async create(scheduleData) {
    const { data } = await api.post("/schedules", scheduleData);
    return data;
  },

  async update(id, scheduleData) {
    const { data } = await api.put(`/schedules/${id}`, scheduleData);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/schedules/${id}`);
    return data;
  },

  async bulkFillGrade(payload) {
    const { data } = await api.post("/schedules/bulk-fill-grade", payload);
    return data;
  },

  async copyWeek(sourceWeekId, targetWeekId, overwrite = false) {
    const { data } = await api.post("/schedules/copy-week", {
      sourceWeekId,
      targetWeekId,
      overwrite,
    });
    return data;
  },
};

export const weeksService = {
  async getAll(params = {}) {
    const { data } = await api.get("/weeks", { params });
    return data;
  },

  async getCurrent() {
    const { data } = await api.get("/weeks/current");
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/weeks/${id}`);
    return data;
  },

  async create(weekData) {
    const { data } = await api.post("/weeks", weekData);
    return data;
  },

  async update(id, weekData) {
    const { data } = await api.put(`/weeks/${id}`, weekData);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/weeks/${id}`);
    return data;
  },
};
