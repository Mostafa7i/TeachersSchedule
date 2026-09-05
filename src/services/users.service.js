// services/users.service.js
import api from '@/lib/api';

export const usersService = {
  async getAll(params = {}) {
    const { data } = await api.get('/users', { params });
    return data;
  },

  async getTeachers(params = {}) {
    const { data } = await api.get('/users/teachers', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  async create(userData) {
    const { data } = await api.post('/users', userData);
    return data;
  },

  async update(id, userData) {
    const { data } = await api.put(`/users/${id}`, userData);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },

  async toggleStatus(id) {
    const { data } = await api.patch(`/users/${id}/toggle-status`);
    return data;
  },

  async resetPassword(id, newPassword) {
    const { data } = await api.patch(`/users/${id}/reset-password`, { newPassword });
    return data;
  },
};
