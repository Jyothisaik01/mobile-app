import apiClient from './api';

export const darwinService = {
  chatWithDarwin: async ({
    message,
    conversationId = null,
    conversationHistory = [],
    currentProductContext = null,
  }) => {
    try {
      const res = await apiClient.post('/darwin/chat', {
        message,
        conversationId,
        conversationHistory,
        currentProductContext,
      });
      return res.data;
    } catch (err) {
      console.warn('Darwin chat error:', err?.response?.data || err?.message);
      return {
        reply: "I'm having a little trouble connecting to my knowledge base right now. Could you please try again in a moment?",
        suggestions: [
          'Show top laptops',
          'Explore trending electronics',
          'Check my orders',
        ],
      };
    }
  },

  getSuggestions: async () => {
    try {
      const res = await apiClient.get('/darwin/suggestions');
      return res.data?.suggestions || [
        'Recommend best laptops under $2000',
        'Find trending sneakers and streetwear',
        'Which smartphones have best cameras?',
        'Track my latest order',
      ];
    } catch {
      return [
        'Recommend best laptops under $2000',
        'Find trending sneakers and streetwear',
        'Which smartphones have best cameras?',
        'Track my latest order',
      ];
    }
  },

  getDarwinConversations: async () => {
    const res = await apiClient.get('/darwin/conversations');
    return res.data;
  },

  createDarwinConversation: async (title = 'New Shopping Chat') => {
    const res = await apiClient.post('/darwin/conversations', { title });
    return res.data;
  },

  getDarwinConversation: async (id) => {
    const res = await apiClient.get(`/darwin/conversations/${id}`);
    return res.data;
  },

  renameDarwinConversation: async (id, title) => {
    const res = await apiClient.patch(`/darwin/conversations/${id}`, { title });
    return res.data;
  },

  deleteDarwinConversation: async (id) => {
    const res = await apiClient.delete(`/darwin/conversations/${id}`);
    return res.data;
  },

  getDarwinSettings: async () => {
    const res = await apiClient.get('/darwin/settings');
    return res.data;
  },

  updateDarwinSettings: async (settings) => {
    const res = await apiClient.patch('/darwin/settings', settings);
    return res.data;
  },
};

export default darwinService;

