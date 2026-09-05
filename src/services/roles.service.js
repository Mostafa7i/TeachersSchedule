// services/roles.service.js
import api from '@/lib/api';

export const rolesService = {
  async getAll() {
    const { data } = await api.get('/roles');
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/roles/${id}`);
    return data;
  },

  async create(roleData) {
    const { data } = await api.post('/roles', roleData);
    return data;
  },

  async update(id, roleData) {
    const { data } = await api.put(`/roles/${id}`, roleData);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/roles/${id}`);
    return data;
  },
};

export const permissionsService = {
  async getAll() {
    const { data } = await api.get('/permissions');
    return data;
  },
};
