import apiClient from './api';

export const notificationService = {
  getNotifications: async () => {
    try {
      const res = await apiClient.get('/notifications');
      return {
        notifications: Array.isArray(res.data?.notifications) ? res.data.notifications : (Array.isArray(res.data) ? res.data : []),
        unreadCount: res.data?.unreadCount || 0,
      };
    } catch (err) {
      console.warn('Notifications fetch notice:', err?.message);
      return { notifications: [], unreadCount: 0 };
    }
  },

  markAsRead: async (id) => {
    try {
      const res = await apiClient.patch(`/notifications/${id}/read`);
      return res.data;
    } catch {
      return null;
    }
  },

  markAllRead: async () => {
    try {
      const res = await apiClient.patch('/notifications/mark-all-read');
      return res.data;
    } catch {
      return null;
    }
  },
};

export default notificationService;
