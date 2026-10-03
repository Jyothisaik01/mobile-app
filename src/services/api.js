import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';

const TOKEN_KEY = 'user_auth_token';

export const getStoredToken = async () => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (err) {
    console.warn('Error reading auth token:', err);
    return null;
  }
};

export const setStoredToken = async (token) => {
  try {
    if (Platform.OS === 'web') {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
      return;
    }
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (err) {
    console.warn('Error setting auth token:', err);
  }
};

const USER_KEY = 'user_auth_profile';

export const getStoredUser = async () => {
  try {
    const raw = Platform.OS === 'web'
      ? localStorage.getItem(USER_KEY)
      : await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

export const setStoredUser = async (user) => {
  try {
    if (user) {
      const val = JSON.stringify(user);
      if (Platform.OS === 'web') localStorage.setItem(USER_KEY, val);
      else await SecureStore.setItemAsync(USER_KEY, val);
    } else {
      if (Platform.OS === 'web') localStorage.removeItem(USER_KEY);
      else await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch (err) {
    console.warn('Error saving user to storage:', err);
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await setStoredToken(null);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
