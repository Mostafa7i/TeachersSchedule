// services/subjects.service.js
import api from '@/lib/api';

let cachedSubjects = null;
let cachedSubjectsTime = 0;
const SUBJECTS_CACHE_TTL = 30000; // 30 seconds

export const subjectsService = {
  async getAll(params = {}, force = false) {
    const isDefault = Object.keys(params).length === 0 || (Object.keys(params).length === 1 && params.isActive === true);
    const now = Date.now();
    if (!force && isDefault && cachedSubjects && now - cachedSubjectsTime < SUBJECTS_CACHE_TTL) {
      return cachedSubjects;
    }
    const { data } = await api.get('/subjects', { params });
    if (isDefault) {
      cachedSubjects = data;
      cachedSubjectsTime = now;
    }
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/subjects/${id}`);
    return data;
  },

  async create(subjectData) {
    const { data } = await api.post('/subjects', subjectData);
    cachedSubjects = null;
    return data;
  },

  async update(id, subjectData) {
    const { data } = await api.put(`/subjects/${id}`, subjectData);
    cachedSubjects = null;
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/subjects/${id}`);
    cachedSubjects = null;
    return data;
  },

  async toggleStatus(id) {
    const { data } = await api.patch(`/subjects/${id}/toggle-status`);
    cachedSubjects = null;
    return data;
  },
};
