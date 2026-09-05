// services/settings.service.js
import api from '@/lib/api';

export const settingsService = {
  async get() {
    const { data } = await api.get('/school-settings');
    return data;
  },

  async update(settingsData) {
    const { data } = await api.put('/school-settings', settingsData);
    return data;
  },

  async uploadLogo(formData) {
    const { data } = await api.post('/school-settings/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

export const auditLogsService = {
  async getAll(params = {}) {
    const { data } = await api.get('/audit-logs', { params });
    return data;
  },
};
