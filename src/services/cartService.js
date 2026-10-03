import apiClient from './api';

export const cartService = {
  getCart: async () => {
    try {
      const res = await apiClient.get('/cart');
      return res.data;
    } catch (err) {
      return [];
    }
  },

  addToCart: async (productId, qty = 1) => {
    const res = await apiClient.post('/cart', { productId, qty });
    return res.data;
  },

  updateCartItem: async (itemId, qty) => {
    const res = await apiClient.patch(`/cart/${itemId}`, { qty });
    return res.data;
  },

  removeCartItem: async (itemId) => {
    const res = await apiClient.delete(`/cart/${itemId}`);
    return res.data;
  },

  saveForLater: async (itemId) => {
    const res = await apiClient.patch(`/cart/${itemId}/save-for-later`);
    return res.data;
  },

  moveToCart: async (itemId) => {
    const res = await apiClient.patch(`/cart/${itemId}/move-to-cart`);
    return res.data;
  },

  checkoutCart: async (payload) => {
    const res = await apiClient.post('/cart/checkout', payload);
    return res.data;
  },
};

export default cartService;
