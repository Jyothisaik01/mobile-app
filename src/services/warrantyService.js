import apiClient from './api';

export const warrantyService = {
  getMyWarranties: async () => {
    try {
      const res = await apiClient.get('/warranties');
      return Array.isArray(res.data) ? res.data : (res.data?.warranties || []);
    } catch {
      return [];
    }
  },

  getMyClaims: async () => {
    try {
      const res = await apiClient.get('/warranties/claims');
      return Array.isArray(res.data) ? res.data : (res.data?.claims || []);
    } catch {
      return [];
    }
  },

  registerWarranty: async (data) => {
    const res = await apiClient.post('/warranties/register', data);
    return res.data;
  },

  raiseClaim: async (data) => {
    const res = await apiClient.post('/warranties/claim', data);
    return res.data;
  },
};

export default warrantyService;

