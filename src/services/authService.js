import apiClient, { setStoredToken, getStoredToken } from './api';

export const authService = {
  // Customer Login
  login: async (email, password) => {
    try {
      const res = await apiClient.post('/customers/login', { email, password });
      if (res.data?.token) {
        await setStoredToken(res.data.token);
      }
      return res.data;
    } catch (err) {
      // Fallback to vendor /auth/login if customer fails with 404 or 401
      if (err.response?.status === 404 || err.response?.status === 401) {
        try {
          const vendorRes = await apiClient.post('/auth/login', { email, password });
          if (vendorRes.data?.token) {
            await setStoredToken(vendorRes.data.token);
          }
          return vendorRes.data;
        } catch {
          throw err;
        }
      }
      throw err;
    }
  },

  // Send OTP for email verification / OTP login
  sendOtp: async (email, userType = 'customer', purpose = 'login') => {
    const res = await apiClient.post('/auth/send-otp', { email, userType, purpose });
    return res.data;
  },

  // Verify OTP Login
  verifyOtpLogin: async (email, otp, userType = 'customer') => {
    const res = await apiClient.post('/auth/verify-otp-login', { email, otp, userType });
    if (res.data?.token) {
      await setStoredToken(res.data.token);
    }
    return res.data;
  },

  // Customer Register
  register: async (userData) => {
    const res = await apiClient.post('/customers/register', userData);
    if (res.data?.token) {
      await setStoredToken(res.data.token);
    }
    return res.data;
  },

  getProfile: async () => {
    try {
      const res = await apiClient.get('/customers/me');
      return res.data;
    } catch {
      const res = await apiClient.get('/auth/me');
      return res.data;
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await apiClient.patch('/customers/me', data);
      return res.data;
    } catch {
      const res = await apiClient.patch('/auth/me', data);
      return res.data;
    }
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    try {
      const res = await apiClient.patch('/customers/me/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      return res.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const res = await apiClient.patch('/auth/change-password', {
          currentPassword,
          newPassword,
        });
        return res.data;
      }
      throw err;
    }
  },

  logout: async () => {
    await setStoredToken(null);
  },

  isAuthenticated: async () => {
    const token = await getStoredToken();
    return !!token;
  },
};

export default authService;
