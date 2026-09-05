import api from '@/lib/api';

export const notificationsService = {
  async getMyNotifications(params = {}) {
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  async markAsRead(id) {
    const { data } = await api.put(`/notifications/${id}/read`);
    return data;
  },

  async markAllAsRead() {
    const { data } = await api.put('/notifications/read-all');
    return data;
  },

  async sendReminder(payload) {
    const { data } = await api.post('/notifications/send-reminder', payload);
    return data;
  },
};
