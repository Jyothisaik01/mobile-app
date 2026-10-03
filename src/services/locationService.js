import apiClient from './api';

export const REGIONAL_HUBS = [
  { code: 'HUB-HYD-01', name: 'Hyderabad Regional Hub', city: 'Hyderabad', state: 'Telangana', deliveryTime: '2-4 Hours Express' },
  { code: 'HUB-BLR-01', name: 'Bengaluru Central Hub', city: 'Bengaluru', state: 'Karnataka', deliveryTime: 'Same Day' },
  { code: 'HUB-GNT-01', name: 'Guntur - Amaravati Regional Hub', city: 'Guntur', state: 'Andhra Pradesh', deliveryTime: 'Next Day' },
  { code: 'HUB-VJA-01', name: 'Vijayawada Central Logistics Park', city: 'Vijayawada', state: 'Andhra Pradesh', deliveryTime: 'Same Day' },
  { code: 'HUB-CHE-01', name: 'Chennai Central Logistics Hub', city: 'Chennai', state: 'Tamil Nadu', deliveryTime: 'Same Day' },
  { code: 'HUB-MUM-01', name: 'Mumbai Western Logistics Hub', city: 'Mumbai', state: 'Maharashtra', deliveryTime: 'Same Day' },
  { code: 'HUB-DEL-01', name: 'Delhi NCR Mega Warehouse', city: 'Delhi NCR', state: 'Delhi', deliveryTime: 'Same Day' },
];

export const locationService = {
  getAllHubs: async () => {
    try {
      const res = await apiClient.get('/location/hubs');
      return Array.isArray(res.data) && res.data.length ? res.data : REGIONAL_HUBS;
    } catch {
      return REGIONAL_HUBS;
    }
  },

  getNearestHub: async (city = 'Hyderabad') => {
    try {
      const res = await apiClient.get('/location/nearest-hub', { params: { city } });
      return res.data;
    } catch {
      return REGIONAL_HUBS[0];
    }
  },

  searchLocation: async (q) => {
    try {
      const res = await apiClient.get('/location/search', { params: { q } });
      return res.data;
    } catch {
      return [];
    }
  },

  reverseGeocode: async (lat, lng) => {
    try {
      const res = await apiClient.get('/location/reverse-geocode', { params: { lat, lng } });
      return res.data;
    } catch (err) {
      console.warn('Reverse geocode error:', err);
      return null;
    }
  },
};

export default locationService;
