import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { getStoredToken, setStoredToken, getStoredUser, setStoredUser } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const storedToken = await getStoredToken();
      if (storedToken) {
        setToken(storedToken);
        // Fast restore from local cache so the dashboard renders immediately!
        const cachedUser = await getStoredUser();
        if (cachedUser) {
          setUser(cachedUser);
        }

        // Background sync latest profile
        try {
          const profile = await authService.getProfile();
          const activeUser = profile?.customer || profile?.user || profile || cachedUser;
          if (activeUser) {
            setUser(activeUser);
            await setStoredUser(activeUser);
          }
        } catch (profileErr) {
          console.warn('Profile sync notice:', profileErr?.message);
        }
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const activeToken = res?.token || null;
    const activeUser = res?.customer || res?.user || { email, name: email.split('@')[0] };

    setToken(activeToken);
    setUser(activeUser);
    if (activeUser) await setStoredUser(activeUser);
    return res;
  };

  const loginWithOtp = async (email, otp, userType = 'customer') => {
    const res = await authService.verifyOtpLogin(email, otp, userType);
    const activeToken = res?.token || null;
    const activeUser = res?.customer || res?.user || { email, name: email.split('@')[0] };

    setToken(activeToken);
    setUser(activeUser);
    if (activeUser) await setStoredUser(activeUser);
    return res;
  };

  const sendOtp = async (email, userType = 'customer', purpose = 'login') => {
    return await authService.sendOtp(email, userType, purpose);
  };


  const register = async (userData) => {
    const res = await authService.register(userData);
    const activeToken = res?.token || null;
    const activeUser = res?.customer || res?.user || { email: userData.email, name: userData.name };

    setToken(activeToken);
    setUser(activeUser);
    if (activeUser) await setStoredUser(activeUser);
    return res;
  };

  const logout = async () => {
    await authService.logout();
    await setStoredUser(null);
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const profile = await authService.getProfile();
      const activeUser = profile?.customer || profile?.user || profile || null;
      if (activeUser) {
        setUser(activeUser);
        await setStoredUser(activeUser);
      }
    } catch {}
  };

  const updateUserProfile = async (updates) => {
    const updated = await authService.updateProfile(updates);
    const activeUser = updated?.customer || updated?.user || updated || { ...user, ...updates };
    setUser(activeUser);
    await setStoredUser(activeUser);
    return activeUser;
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    return await authService.changePassword(currentPassword, newPassword, confirmPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        loginWithOtp,
        sendOtp,
        register,
        logout,
        refreshProfile,
        updateUserProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
