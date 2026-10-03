import apiClient from './api';

export const wishlistService = {
  getWishlist: async () => {
    try {
      const res = await apiClient.get('/wishlist');
      return Array.isArray(res.data) ? res.data : res.data?.items || [];
    } catch (err) {
      console.warn('Failed to load wishlist:', err?.message);
      return [];
    }
  },

  addToWishlist: async (productId) => {
    const res = await apiClient.post('/wishlist', { productId });
    return res.data;
  },

  removeFromWishlist: async (id) => {
    const res = await apiClient.delete(`/wishlist/${id}`);
    return res.data;
  },

  getCollections: async () => {
    try {
      const res = await apiClient.get('/wishlist/collections');
      return Array.isArray(res.data) ? res.data : (res.data?.collections || []);
    } catch (err) {
      console.warn('Failed to load collections:', err?.message);
      return [];
    }
  },

  createCollection: async (payload) => {
    const res = await apiClient.post('/wishlist/collections', payload);
    return res.data;
  },

  deleteCollection: async (id) => {
    const res = await apiClient.delete(`/wishlist/collections/${id}`);
    return res.data;
  },
};

export default wishlistService;
