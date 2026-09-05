// services/subjects.service.js
import api from '@/lib/api';

export const subjectsService = {
  async getAll(params = {}) {
    const { data } = await api.get('/subjects', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/subjects/${id}`);
    return data;
  },

  async create(subjectData) {
    const { data } = await api.post('/subjects', subjectData);
    return data;
  },

  async update(id, subjectData) {
    const { data } = await api.put(`/subjects/${id}`, subjectData);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/subjects/${id}`);
    return data;
  },

  async toggleStatus(id) {
    const { data } = await api.patch(`/subjects/${id}/toggle-status`);
    return data;
  },
};
