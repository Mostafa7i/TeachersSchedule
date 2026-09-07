// services/timetableTemplates.service.js
import api from '@/lib/api';

export const timetableTemplatesService = {
  /** Get all available (unclaimed) templates */
  async getAll(params = {}) {
    const { data } = await api.get('/schedules/templates', { params });
    return data;
  },

  /** Get a single template with full entries */
  async getById(id) {
    const { data } = await api.get(`/schedules/templates/${id}`);
    return data;
  },

  /** Admin: create a new vacant timetable template */
  async create(payload) {
    const { data } = await api.post('/schedules/templates', payload);
    return data;
  },

  /** Admin: update name/subjects of a template */
  async update(id, payload) {
    const { data } = await api.put(`/schedules/templates/${id}`, payload);
    return data;
  },

  /** Admin: save all schedule entries for a template */
  async saveEntries(id, entries) {
    const { data } = await api.put(`/schedules/templates/${id}/entries`, { entries });
    return data;
  },

  /** Admin: delete a vacant template */
  async remove(id) {
    const { data } = await api.delete(`/schedules/templates/${id}`);
    return data;
  },

  /** Teacher: claim a template → converts entries to real Schedule docs */
  async claim(id, weekId) {
    const { data } = await api.post(`/schedules/templates/${id}/claim`, { weekId });
    return data;
  },

  /** Admin: assign a template directly to an existing teacher */
  async assignToTeacher(id, teacherId, weekId) {
    const { data } = await api.post(`/schedules/templates/${id}/assign`, { teacherId, weekId });
    return data;
  },

  /** Admin: unclaim / release a template so it becomes available again */
  async unclaim(id) {
    const { data } = await api.post(`/schedules/templates/${id}/unclaim`);
    return data;
  },
};
