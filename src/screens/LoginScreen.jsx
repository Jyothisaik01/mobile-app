import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Lock, User, LogIn, UserPlus, KeyRound, RefreshCw } from 'lucide-react-native';
import colors from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login, loginWithOtp, sendOtp, register } = useAuth();

  // Mode: 'password' | 'otp' | 'register'
  const [authMode, setAuthMode] = useState('otp');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const canGoBack = navigation?.canGoBack && navigation.canGoBack();

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      Toast.show({
        type: 'error',
        text1: 'Valid Email Required',
        text2: 'Please enter a valid email address to receive OTP.',
        position: 'bottom',
      });
      return;
    }

    try {
      setSendingOtp(true);
      const res = await sendOtp(email.trim().toLowerCase(), 'customer', 'login');
      setOtpSent(true);
      setCountdown(60);
      Toast.show({
        type: 'success',
        text1: 'OTP Sent! ✉️',
        text2: `A 6-digit verification code was sent to ${email.trim()}`,
        position: 'bottom',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Send Code',
        text2: err.response?.data?.msg || err.message || 'Could not dispatch OTP email. Try again.',
        position: 'bottom',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async () => {
    if (authMode === 'otp') {
      if (!email || !otp) {
        Toast.show({
          type: 'error',
          text1: 'Missing Fields',
          text2: 'Please enter your email and the 6-digit OTP code.',
          position: 'bottom',
        });
        return;
      }

      try {
        setLoading(true);
        await loginWithOtp(email.trim().toLowerCase(), otp.trim());
        Toast.show({
          type: 'success',
          text1: 'Welcome! 🎉',
          text2: 'OTP verified successfully.',
          position: 'bottom',
        });
        if (canGoBack) {
          navigation.goBack();
        }
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: err.response?.data?.msg || err.message || 'Invalid or expired OTP code.',
          position: 'bottom',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Password Login or Register
    if (!email || !password || (authMode === 'register' && !name)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all required fields.',
        position: 'bottom',
      });
      return;
    }

    try {
      setLoading(true);
      if (authMode === 'register') {
        await register({ name, email, password });
        Toast.show({
          type: 'success',
          text1: 'Welcome to Inventory! 🎉',
          text2: 'Account created successfully.',
          position: 'bottom',
        });
      } else {
        await login(email, password);
        Toast.show({
          type: 'success',
          text1: 'Signed In',
          text2: 'Welcome back!',
          position: 'bottom',
        });
      }
      if (canGoBack) {
        navigation.goBack();
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: authMode === 'register' ? 'Registration Failed' : 'Sign In Failed',
        text2: err.response?.data?.msg || err.message || 'Please check your credentials.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {canGoBack ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.headerTitle}>
          {authMode === 'register'
            ? 'Create Account'
            : authMode === 'otp'
            ? 'OTP Quick Login'
            : 'Password Sign In'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandingSection}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>INVENTORY PRIME</Text>
          <Text style={styles.brandSubtitle}>
            {authMode === 'register'
              ? 'Join our community for seamless shopping and fast order tracking'
              : authMode === 'otp'
              ? 'Instant passwordless login with one-time email code'
              : 'Sign in to access your saved cart, orders, and synchronized profile'}
          </Text>
        </View>

        {/* Tab Switcher: Exactly 2 Tabs matching Web App (Password Login & OTP Login) */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabItem, (authMode === 'password' || authMode === 'register') && styles.tabItemActive]}
            onPress={() => setAuthMode('password')}
          >
            <Lock size={14} color={(authMode === 'password' || authMode === 'register') ? '#ffffff' : colors.textMuted} />
            <Text style={[styles.tabItemText, (authMode === 'password' || authMode === 'register') && styles.tabItemTextActive]}>
              Password Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, authMode === 'otp' && styles.tabItemActive]}
            onPress={() => setAuthMode('otp')}
          >
            <KeyRound size={14} color={authMode === 'otp' ? '#ffffff' : colors.textMuted} />
            <Text style={[styles.tabItemText, authMode === 'otp' && styles.tabItemTextActive]}>
              OTP Login
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          {authMode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={colors.textMuted} />
                <TextInput
                  placeholder="John Doe"
                  placeholderTextColor={colors.textMuted}
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={colors.textMuted} />
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* OTP Mode Fields */}
          {authMode === 'otp' && (
            <>
              {otpSent ? (
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputLabel}>6-Digit OTP Code</Text>
                    {countdown > 0 ? (
                      <Text style={styles.countdownText}>Resend in {countdown}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOtp} disabled={sendingOtp}>
                        <Text style={styles.resendText}>Resend Code</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.inputWrapper}>
                    <KeyRound size={18} color={colors.textMuted} />
                    <TextInput
                      placeholder="123456"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.textInput, { letterSpacing: 4, fontWeight: '700', fontSize: 16 }]}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>
              ) : null}

              {!otpSent ? (
                <TouchableOpacity
                  style={styles.sendOtpBtn}
                  disabled={sendingOtp || !email}
                  activeOpacity={0.8}
                  onPress={handleSendOtp}
                >
                  {sendingOtp ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Mail size={16} color="#ffffff" />
                      <Text style={styles.submitBtnText}>Send Verification Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.submitBtn}
                  disabled={loading || otp.length < 6}
                  activeOpacity={0.8}
                  onPress={handleSubmit}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <LogIn size={18} color="#ffffff" />
                      <Text style={styles.submitBtnText}>Verify & Sign In</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Password Mode / Register Mode Fields */}
          {authMode !== 'otp' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={colors.textMuted} />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                disabled={loading}
                activeOpacity={0.8}
                onPress={handleSubmit}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    {authMode === 'register' ? (
                      <UserPlus size={18} color="#ffffff" />
                    ) : (
                      <LogIn size={18} color="#ffffff" />
                    )}
                    <Text style={styles.submitBtnText}>
                      {authMode === 'register' ? 'Register' : 'Sign In'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer helper */}
        <View style={styles.toggleRow}>
          <Text style={styles.togglePrompt}>
            {authMode === 'register' ? 'Already have an account?' : "Don't have an account yet?"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (authMode === 'register') setAuthMode('password');
              else setAuthMode('register');
            }}
          >
            <Text style={styles.toggleAction}>
              {authMode === 'register' ? 'Sign In' : 'Create an Account'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  brandingSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginBottom: 12,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {
    flex: 1,
    color: colors.text,
    marginLeft: 10,
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  togglePrompt: {
    color: colors.textMuted,
    fontSize: 14,
  },
  toggleAction: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabItemText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sendOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  countdownText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  resendText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
});
