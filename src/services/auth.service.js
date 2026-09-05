// services/auth.service.js
import api from '@/lib/api';

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async googleLogin(payload) {
    const { data } = await api.post('/auth/google', payload);
    return data;
  },

  async completeProfile(payload) {
    const { data } = await api.put('/auth/complete-profile', payload);
    return data;
  },

  async logout() {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async changePassword(oldPassword, newPassword) {
    const { data } = await api.put('/auth/change-password', { oldPassword, newPassword });
    return data;
  },
};
