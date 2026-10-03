import apiClient from './api';

export const addressService = {
  getAddresses: async () => {
    try {
      const res = await apiClient.get('/addresses');
      return Array.isArray(res.data) ? res.data : res.data?.addresses || [];
    } catch (err) {
      console.warn('Failed to load addresses:', err?.message);
      return [];
    }
  },

  createAddress: async (data) => {
    const res = await apiClient.post('/addresses', data);
    return res.data;
  },

  updateAddress: async (id, data) => {
    const res = await apiClient.patch(`/addresses/${id}`, data);
    return res.data;
  },

  setDefaultAddress: async (id) => {
    const res = await apiClient.patch(`/addresses/${id}/default`);
    return res.data;
  },

  deleteAddress: async (id) => {
    const res = await apiClient.delete(`/addresses/${id}`);
    return res.data;
  },
};

export default addressService;
