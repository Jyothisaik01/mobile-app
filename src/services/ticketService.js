import apiClient from './api';

export const ticketService = {
  getMyTickets: async (params = {}) => {
    try {
      const res = await apiClient.get('/tickets/my', { params });
      return res.data;
    } catch (e) {
      console.warn('getMyTickets error:', e.message);
      return { tickets: [], counts: { all: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 } };
    }
  },

  createCustomerTicket: async (ticketData) => {
    const res = await apiClient.post('/tickets', ticketData);
    return res.data;
  },

  getTicketById: async (id) => {
    const res = await apiClient.get(`/tickets/${id}`);
    return res.data;
  },

  replyToTicket: async (id, text, attachments = []) => {
    const res = await apiClient.post(`/tickets/${id}/reply`, { text, attachments });
    return res.data;
  },

  resolveOrCloseTicket: async (id, status = 'resolved', resolutionSummary = '') => {
    const res = await apiClient.patch(`/tickets/${id}/close`, { status, resolutionSummary });
    return res.data;
  },
};

export default ticketService;

