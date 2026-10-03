import apiClient from './api';

export const avatarService = {
  getMyAvatar: async () => {
    try {
      const res = await apiClient.get('/avatar/me');
      return res.data;
    } catch {
      return {
        gender: 'male',
        bodyType: 'athletic',
        heightCm: 178,
        skinTone: '#E0AC69',
        hairStyle: 'short_fade',
        hairColor: '#1a1a1a',
        currentOutfit: {},
        savedLooks: [],
      };
    }
  },

  updateProfile: async (profileData) => {
    try {
      const res = await apiClient.put('/avatar/profile', profileData);
      return res.data;
    } catch (e) {
      console.warn('Update avatar profile error:', e);
      return profileData;
    }
  },

  equipProduct: async (slot, productId) => {
    try {
      const res = await apiClient.post('/avatar/equip', { slot, productId });
      return res.data;
    } catch (e) {
      console.warn('Equip product error:', e);
      return null;
    }
  },

  getWardrobeCatalog: async (gender = 'Male') => {
    try {
      // First try gender-specific items from Bitmoji 3D wardrobe
      const res = await apiClient.get(`/avatar/items?gender=${gender}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
      const catRes = await apiClient.get('/avatar/catalog');
      return catRes.data?.catalog || catRes.data || [];
    } catch {
      return [
        {
          _id: 'app_1',
          name: 'Classic White Oversized Streetwear Tee',
          category: 'Tops',
          clothingType: 'top',
          price: 1299,
          image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
          slot: 'top',
          avatarColor: '#f8fafc',
        },
        {
          _id: 'app_2',
          name: 'Relaxed Fit Vintage Denim Jeans',
          category: 'Bottoms',
          clothingType: 'bottom',
          price: 2499,
          image: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop&q=80',
          slot: 'bottom',
          avatarColor: '#2563eb',
        },
        {
          _id: 'app_3',
          name: 'Nike Air Low-Top White Sneakers',
          category: 'Shoes',
          clothingType: 'shoes',
          price: 4995,
          image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80',
          slot: 'shoes',
          avatarColor: '#ffffff',
        },
        {
          _id: 'app_4',
          name: 'Midnight Black Leather Biker Jacket',
          category: 'Tops',
          clothingType: 'outerwear',
          price: 6499,
          image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80',
          slot: 'outerwear',
          avatarColor: '#09090b',
        },
      ];
    }
  },

  saveLook: async (lookName, outfitSnapshot) => {
    try {
      const res = await apiClient.post('/avatar/save-look', { lookName, outfitSnapshot });
      return res.data;
    } catch {
      return { success: true };
    }
  },
};

export default avatarService;
