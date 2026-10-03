import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';

LogBox.ignoreLogs(['Cannot connect to Expo CLI']);

import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { CompareProvider } from './src/context/CompareContext';
import AppNavigator from './src/navigation/AppNavigator';

import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Safely ensure top offset for toasts without crashing if called early
if (Toast && typeof Toast.show === 'function') {
  const originalToastShow = Toast.show;
  Toast.show = (options) => {
    try {
      return originalToastShow({
        position: 'top',
        topOffset: 52,
        ...options,
      });
    } catch (e) {
      console.warn('Toast show warning:', e);
    }
  };
}

/* Full-background rich top toasts matching web app (Green for success, Red for error, Blue for info) */
const toastConfig = {
  success: ({ text1, text2, hide }) => (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={hide}
      style={{
        width: '92%',
        backgroundColor: '#10b981',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <CheckCircle2 size={18} color="#ffffff" />
      </View>
      <View style={{ flex: 1, marginRight: 8 }}>
        {text1 ? (
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#ecfdf5', marginTop: 2 }}>
            {text2}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={hide}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ padding: 4 }}
      >
        <X size={15} color="rgba(255, 255, 255, 0.75)" />
      </TouchableOpacity>
    </TouchableOpacity>
  ),
  error: ({ text1, text2, hide }) => (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={hide}
      style={{
        width: '92%',
        backgroundColor: '#ef4444',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <AlertCircle size={18} color="#ffffff" />
      </View>
      <View style={{ flex: 1, marginRight: 8 }}>
        {text1 ? (
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#fef2f2', marginTop: 2 }}>
            {text2}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={hide}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ padding: 4 }}
      >
        <X size={15} color="rgba(255, 255, 255, 0.75)" />
      </TouchableOpacity>
    </TouchableOpacity>
  ),
  info: ({ text1, text2, hide }) => (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={hide}
      style={{
        width: '92%',
        backgroundColor: '#2563eb',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#1d4ed8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Info size={18} color="#ffffff" />
      </View>
      <View style={{ flex: 1, marginRight: 8 }}>
        {text1 ? (
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#eff6ff', marginTop: 2 }}>
            {text2}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={hide}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ padding: 4 }}
      >
        <X size={15} color="rgba(255, 255, 255, 0.75)" />
      </TouchableOpacity>
    </TouchableOpacity>
  ),
};

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: 8 }}>
            Inventory Prime
          </Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 20, lineHeight: 18 }}>
            {this.state.error?.message || 'A launch error occurred. Please tap retry to restart the app.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#0071e3',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>Retry Launch</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000000' }}>
      <RootErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <CompareProvider>
              <StatusBar style="light" backgroundColor="#000000" />
              <AppNavigator />
              <Toast config={toastConfig} position="top" topOffset={52} />
            </CompareProvider>
          </CartProvider>
        </AuthProvider>
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}
