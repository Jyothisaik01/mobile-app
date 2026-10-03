import apiClient from './api';

export const rewardsService = {
  getRewards: async (customerId) => {
    try {
      const res = await apiClient.get('/rewards', { params: { customerId } });
      return res.data;
    } catch {
      return {
        points: 450,
        tier: 'Platinum Member',
        redeemedPoints: 100,
        history: [
          { title: 'Purchase Reward', points: 150, date: '2 days ago' },
          { title: 'Review Bonus', points: 50, date: '1 week ago' },
        ],
      };
    }
  },

  redeemPoints: async (points, couponId) => {
    const res = await apiClient.post('/rewards/redeem', { points, couponId });
    return res.data;
  },
};

export default rewardsService;
