import apiClient from './api';

export const sharedCartService = {
  getMySharedCarts: async (memberName) => {
    try {
      const params = memberName ? { memberName } : {};
      const res = await apiClient.get('/shared-cart/my', { params });
      return Array.isArray(res.data) ? res.data : (res.data?.carts || []);
    } catch (e) {
      console.warn('getMySharedCarts error:', e);
      return [];
    }
  },

  getSharedCart: async (idOrCode, memberName) => {
    const params = memberName ? { memberName } : {};
    const res = await apiClient.get(`/shared-cart/${idOrCode}`, { params });
    return res.data;
  },

  createSharedCart: async ({ name, template = 'trip', targetBudget = 0, creatorName = 'You' }) => {
    const res = await apiClient.post('/shared-cart/create', {
      name,
      template,
      targetBudget,
      creatorName,
    });
    return res.data;
  },

  joinSharedCart: async (shareCode, memberName = 'Friend') => {
    const res = await apiClient.post('/shared-cart/join', {
      shareCode,
      memberName,
    });
    return res.data;
  },

  addItemToCart: async (cartId, productId, quantity = 1, memberName = 'Member') => {
    const res = await apiClient.post(`/shared-cart/${cartId}/items`, {
      productId,
      quantity,
      memberName,
    });
    return res.data;
  },

  voteOnItem: async (cartId, itemId, vote = 'up', memberName = 'Member') => {
    const res = await apiClient.post(`/shared-cart/${cartId}/items/${itemId}/vote`, {
      vote,
      memberName,
    });
    return res.data;
  },

  postMessage: async (cartId, text, memberName = 'Member', productId = null) => {
    const res = await apiClient.post(`/shared-cart/${cartId}/messages`, {
      text,
      memberName,
      productId,
    });
    return res.data;
  },

  toggleReadyStatus: async (cartId, memberName = 'Member') => {
    const res = await apiClient.put(`/shared-cart/${cartId}/ready`, {
      memberName,
    });
    return res.data;
  },

  removeItem: async (cartId, itemId) => {
    const res = await apiClient.delete(`/shared-cart/${cartId}/items/${itemId}`);
    return res.data;
  },

  updateQuantity: async (cartId, itemId, quantity) => {
    const res = await apiClient.put(`/shared-cart/${cartId}/items/${itemId}`, { quantity });
    return res.data;
  },
};

export default sharedCartService;
