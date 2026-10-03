import apiClient from './api';

export const walletService = {
  getWallet: async () => {
    try {
      const res = await apiClient.get('/customers/wallet');
      return res.data;
    } catch {
      return { balance: 2500.00, currency: 'INR', transactions: [] };
    }
  },

  topUpWallet: async (amount, paymentMethod = 'UPI') => {
    const res = await apiClient.post('/customers/wallet/top-up', { amount: Number(amount), paymentMethod });
    return res.data;
  },

  getTransactions: async (page = 1, limit = 10) => {
    try {
      const res = await apiClient.get('/transactions', { params: { page, limit } });
      const items = Array.isArray(res.data) ? res.data : (res.data?.transactions || res.data?.items || []);
      const total = res.data?.total || items.length;
      return {
        transactions: items,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      };
    } catch {
      return {
        transactions: [],
        total: 0,
        page: 1,
        totalPages: 1,
      };
    }
  },

  getPaymentMethods: async () => {
    try {
      const res = await apiClient.get('/customers/payment-methods');
      return Array.isArray(res.data) ? res.data : (res.data?.paymentMethods || []);
    } catch {
      return [];
    }
  },

  addPaymentMethod: async (data) => {
    const res = await apiClient.post('/customers/payment-methods', data);
    return res.data;
  },

  deletePaymentMethod: async (id) => {
    const res = await apiClient.delete(`/customers/payment-methods/${id}`);
    return res.data;
  },
};

export default walletService;
