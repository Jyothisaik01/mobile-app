import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomTabNavigator from './BottomTabNavigator';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import LoginScreen from '../screens/LoginScreen';
import DarwinChatScreen from '../screens/DarwinChatScreen';
import WishlistScreen from '../screens/WishlistScreen';
import AddressesScreen from '../screens/AddressesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import WalletScreen from '../screens/WalletScreen';
import RewardsScreen from '../screens/RewardsScreen';
import SharedCartScreen from '../screens/SharedCartScreen';
import WarrantyVaultScreen from '../screens/WarrantyVaultScreen';
import AvatarStudioScreen from '../screens/AvatarStudioScreen';
import CompareScreen from '../screens/CompareScreen';
import CustomerSupportScreen from '../screens/CustomerSupportScreen';
import colors from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

function SplashLoadingScreen() {
  return (
    <View style={styles.splashContainer}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.splashIcon}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <NavigationContainer theme={customDarkTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        {loading ? (
          <Stack.Screen name="SplashLoading" component={SplashLoadingScreen} />
        ) : !isAuthenticated ? (
          // When NOT logged in: opens Login Page directly
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // When logged in: opens Main Dashboard & features
          <>
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
            <Stack.Screen
              name="ProductDetails"
              component={ProductDetailsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="DarwinChat"
              component={DarwinChatScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Wishlist"
              component={WishlistScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Addresses"
              component={AddressesScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Wallet"
              component={WalletScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Rewards"
              component={RewardsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="SharedCart"
              component={SharedCartScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="WarrantyVault"
              component={WarrantyVaultScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="AvatarStudio"
              component={AvatarStudioScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Compare"
              component={CompareScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="CustomerSupport"
              component={CustomerSupportScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: {
    width: 90,
    height: 90,
    borderRadius: 20,
  },
});
