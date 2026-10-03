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

// Force all toasts across all screens to render on TOP
const originalToastShow = Toast.show;
Toast.show = (options) => {
  return originalToastShow({
    ...options,
    position: 'top',
    topOffset: 52,
  });
};

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

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000000' }}>
      <AuthProvider>
        <CartProvider>
          <CompareProvider>
            <StatusBar style="light" backgroundColor="#000000" />
            <AppNavigator />
            <Toast config={toastConfig} position="top" topOffset={52} />
          </CompareProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
