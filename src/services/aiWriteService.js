import apiClient from './api';

/**
 * Mobile AI Write & Rewrite Service
 * Connects to /ai-write/generate endpoint supporting:
 * - support_ticket: generates or polishes customer ticket messages
 * - ticket_reply: draft replies for customer inquiries
 * - warranty_claim: generates structured diagnostic & malfunction report
 * - review_full / review_body: creates genuine ratings reviews based on stars
 * - refine_text: polishes, clarifies, or formalizes any draft text
 */

export const aiWriteService = {
  generateAiWrite: async ({ task, input = '', context = {}, options = {} }) => {
    try {
      const response = await apiClient.post('/ai-write/generate', {
        task,
        input: typeof input === 'string' ? input : '',
        context,
        options,
      });
      return response.data;
    } catch (err) {
      console.warn('AI Write API error:', err.message);
      throw err;
    }
  },

  getStatus: async () => {
    try {
      const response = await apiClient.get('/ai-write/status');
      return response.data;
    } catch {
      return { available: false };
    }
  },
};

export default aiWriteService;

