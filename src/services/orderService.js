import apiClient from './api';

export const orderService = {
  getMyOrders: async () => {
    try {
      const res = await apiClient.get('/orders');
      return Array.isArray(res.data) ? res.data : (res.data?.orders || []);
    } catch (err) {
      console.warn('Failed to load orders:', err?.message);
      return [];
    }
  },

  createOrder: async (orderData) => {
    const res = await apiClient.post('/orders', orderData);
    return res.data;
  },

  cancelOrder: async (orderId) => {
    const res = await apiClient.post(`/orders/${orderId}/cancel`);
    return res.data;
  },

  requestReturn: async (orderId, reason = 'Item defective or size mismatch', comments = '') => {
    const res = await apiClient.post(`/orders/${orderId}/return`, { reason, comments });
    return res.data;
  },

  cancelReturn: async (orderId) => {
    const res = await apiClient.post(`/orders/${orderId}/cancel-return`);
    return res.data;
  },
};

export default orderService;
