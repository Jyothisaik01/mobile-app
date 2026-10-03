import apiClient from './api';

export const productService = {
  getProducts: async (params = {}) => {
    try {
      const res = await apiClient.get('/products/public', { params });
      return res.data;
    } catch {
      try {
        const res = await apiClient.get('/products', { params });
        return res.data;
      } catch (err) {
        console.warn('Failed to load products from API:', err?.message);
        return { products: [], items: [] };
      }
    }
  },

  getProductById: async (id) => {
    try {
      const res = await apiClient.get(`/products/public/${id}`);
      return res.data;
    } catch {
      const res = await apiClient.get(`/products/${id}`);
      return res.data;
    }
  },

  getProductConfidence: async (id) => {
    try {
      const res = await apiClient.get(`/products/confidence/${id}`);
      return res.data?.confidenceInsights || null;
    } catch {
      return null;
    }
  },

  getCategories: async () => {
    try {
      const res = await apiClient.get('/products/search-meta');
      if (Array.isArray(res.data?.categories) && res.data.categories.length) {
        return res.data.categories.map((c) => (typeof c === 'string' ? c : c.name || String(c)));
      }
    } catch {}
    return ['Electronics', 'Accessories', 'Footwear', 'Clothing', 'Home & Kitchen', 'Beauty', 'Sports'];
  },

  getBanners: async () => {
    try {
      const res = await apiClient.get('/products/public-banners');
      return res.data || [];
    } catch {
      return [];
    }
  },

  getPublicCoupons: async () => {
    try {
      const res = await apiClient.get('/products/public-coupons');
      if (Array.isArray(res.data) && res.data.length) {
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to load public coupons:', err?.message);
    }
    return [];
  },
};

export default productService;
