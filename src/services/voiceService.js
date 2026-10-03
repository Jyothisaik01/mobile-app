import apiClient from './api';

export const voiceService = {
  isAvailable: () => true,
  requestPermission: async () => true,
};

export default voiceService;
