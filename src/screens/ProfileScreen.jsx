import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Package,
  MapPin,
  Moon,
  Server,
  LogOut,
  LogIn,
  ChevronRight,
  Shield,
  Smartphone,
  Heart,
  Sparkles,
  CreditCard,
  Gift,
  Users,
  ShieldCheck,
  Bell,
  Shirt,
  Wallet,
  Pencil,
  Camera,
  Trash2,
  CheckCircle2,
  X,
  Upload,
  Lock,
  Headphones,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import colors from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import Toast from 'react-native-toast-message';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout, updateUserProfile, changePassword } = useAuth();

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Change password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleOpenPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      Toast.show({
        type: 'error',
        text1: 'Current Password Required',
        text2: 'Please enter your current password.',
        position: 'bottom',
      });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'New Password Too Short',
        text2: 'Password must be at least 6 characters.',
        position: 'bottom',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Passwords Do Not Match',
        text2: 'New password and confirmation must match.',
        position: 'bottom',
      });
      return;
    }
    try {
      setSavingPassword(true);
      await changePassword(currentPassword, newPassword, confirmPassword);
      setShowPasswordModal(false);
      Toast.show({
        type: 'success',
        text1: 'Password Changed Successfully! 🔐',
        text2: 'Your account credentials have been updated.',
        position: 'bottom',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Change Password',
        text2: err.response?.data?.message || err.message || 'Check your current password',
        position: 'bottom',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setEditAvatar(user?.avatar || '');
    setShowEditProfileModal(true);
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is needed to select a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const photoUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setEditAvatar(photoUri);
      }
    } catch (err) {
      console.warn('Avatar pick error:', err);
    }
  };

  const handleCameraAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is needed to take a profile photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const photoUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setEditAvatar(photoUri);
      }
    } catch (err) {
      console.warn('Avatar camera error:', err);
    }
  };

  const handleDeleteAvatar = () => {
    setEditAvatar('');
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      if (updateUserProfile) {
        await updateUserProfile({
          name: editName.trim() || user?.name,
          email: editEmail.trim() || user?.email,
          phone: editPhone.trim(),
          avatar: editAvatar,
        });
      }
      setShowEditProfileModal(false);
      Toast.show({
        type: 'success',
        text1: 'Profile Details Saved! ✨',
        text2: 'Your email, photo and profile details have been updated.',
        position: 'bottom',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: err.message || 'Could not update profile',
        position: 'bottom',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    Toast.show({
      type: 'info',
      text1: 'Signed Out',
      text2: 'You have been logged out successfully.',
      position: 'bottom',
    });
  };

  const displayName = user?.name || user?.username || (isAuthenticated ? 'Customer' : 'Guest User');
  const displayEmail = user?.email || (isAuthenticated ? 'customer@inventory.com' : 'Sign in to access your profile');
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Services</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
      >
        {/* User Profile Card with Photo & Edit Option */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.85}
          onPress={handleOpenEditModal}
        >
          <View style={styles.avatarWrap}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials || 'GU'}</Text>
              </View>
            )}
            <View style={styles.avatarPencilBadge}>
              <Pencil size={11} color="#ffffff" />
            </View>
          </View>
          <View style={styles.userInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.editProfileLink}>Edit Profile &gt;</Text>
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{displayEmail}</Text>
            {user?.phone ? <Text style={styles.userPhoneText}>{user.phone}</Text> : null}
          </View>
        </TouchableOpacity>

        {/* Section 1: Wallet & Loyalty */}
        <Text style={styles.sectionHeader}>Finances & Rewards</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Wallet')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#1e3a5f' }]}>
                <Wallet size={18} color="#38bdf8" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Digital Wallet & Balance</Text>
                <Text style={styles.menuSubLabel}>Instant top-up & transactions</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Wallet', { initialTab: 'methods' })}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#2d1b4e' }]}>
                <CreditCard size={18} color="#c084fc" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Saved Payment Methods</Text>
                <Text style={styles.menuSubLabel}>Manage UPI IDs, credit & debit cards</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Rewards')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#3b2503' }]}>
                <Gift size={18} color="#f59e0b" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Rewards & Loyalty Vault</Text>
                <Text style={styles.menuSubLabel}>Tier benefits & voucher redemption</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SharedCart')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#3b0764' }]}>
                <Users size={18} color="#c084fc" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Shared Group Cart</Text>
                <Text style={styles.menuSubLabel}>Collaborate & vote with friends</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('WarrantyVault')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#022c22' }]}>
                <ShieldCheck size={18} color="#10b981" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Warranty Vault & Protection</Text>
                <Text style={styles.menuSubLabel}>Active product coverage & claims</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AvatarStudio')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#082f49' }]}>
                <Shirt size={18} color="#38bdf8" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Virtual 3D Avatar Studio</Text>
                <Text style={styles.menuSubLabel}>Interactive fitting room & dress try-on</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section 2: Personal & Activity */}
        <Text style={styles.sectionHeader}>Activity & Orders</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Orders')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#172554' }]}>
                <Package size={18} color="#60a5fa" />
              </View>
              <Text style={styles.menuLabel}>My Orders</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#3b0d18' }]}>
                <Heart size={18} color="#f43f5e" fill="#f43f5e" />
              </View>
              <Text style={styles.menuLabel}>My Wishlist</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Addresses')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#042f2e' }]}>
                <MapPin size={18} color="#2dd4bf" />
              </View>
              <Text style={styles.menuLabel}>Delivery Addresses</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#311042' }]}>
                <Bell size={18} color="#e879f9" />
              </View>
              <Text style={styles.menuLabel}>Notifications & Updates</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('DarwinChat')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#1e1b4b', overflow: 'hidden' }]}>
                <Image
                  source={{ uri: `${BASE_URL}/darwin-mascot-circle.png` }}
                  style={{ width: 26, height: 26, borderRadius: 13 }}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.menuLabel}>Darwin AI Shopping Assistant</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CustomerSupport')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#0c4a6e' }]}>
                <Headphones size={18} color="#38bdf8" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Customer Support & Help Center</Text>
                <Text style={styles.menuSubLabel}>Track tickets, FAQs & 24/7 assistance</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section 2: App & System Info */}
        <Text style={styles.sectionHeader}>Security & System</Text>
        <View style={styles.menuGroup}>
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={handleOpenPasswordModal}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#312e81' }]}>
                  <Lock size={18} color="#a5b4fc" />
                </View>
                <View>
                  <Text style={styles.menuLabel}>Change Account Password</Text>
                  <Text style={styles.menuSubLabel}>Update security credentials</Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#2e1065' }]}>
                <Server size={18} color="#c084fc" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Connected Backend</Text>
                <Text style={styles.menuSubLabel} numberOfLines={1}>{BASE_URL}</Text>
              </View>
            </View>
            <View style={styles.activeTag}>
              <Text style={styles.activeTagText}>Active</Text>
            </View>
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#111827' }]}>
                <Moon size={18} color="#facc15" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Theme</Text>
                <Text style={styles.menuSubLabel}>Complete OLED True Black (#000000)</Text>
              </View>
            </View>
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#14532d' }]}>
                <Smartphone size={18} color="#4ade80" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Platform & Build</Text>
                <Text style={styles.menuSubLabel}>Android APK Ready (Expo SDK 57)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Authentication Button */}
        <View style={styles.authSection}>
          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.logoutBtn}
              activeOpacity={0.8}
              onPress={handleLogout}
            >
              <LogOut size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginCtaBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Login')}
            >
              <LogIn size={18} color="#ffffff" />
              <Text style={styles.loginCtaText}>Sign In / Register</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile & Photo Modal */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile & Details</Text>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Photo Avatar Preview with Action Buttons */}
              <View style={styles.modalAvatarContainer}>
                <View style={styles.modalAvatarWrap}>
                  {editAvatar ? (
                    <Image source={{ uri: editAvatar }} style={styles.modalAvatarImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Text style={styles.modalAvatarInitial}>{initials || 'GU'}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.modalAvatarCamBtn} onPress={handleCameraAvatar}>
                    <Camera size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Photo Action Buttons: Camera, Upload & Delete */}
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity style={styles.takePhotoBtn} onPress={handleCameraAvatar}>
                    <Camera size={13} color="#ffffff" />
                    <Text style={styles.takePhotoText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.uploadPhotoBtn} onPress={handlePickAvatar}>
                    <Upload size={13} color="#ffffff" />
                    <Text style={styles.uploadPhotoText}>Upload Photo</Text>
                  </TouchableOpacity>

                  {editAvatar ? (
                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={handleDeleteAvatar}>
                      <Trash2 size={13} color="#ef4444" />
                      <Text style={styles.deletePhotoText}>Delete Photo</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Form Inputs */}
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your Full Name"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="10-digit mobile number"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editEmail}
                onChangeText={setEditEmail}
                editable={true}
                placeholder="Email Address"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.saveProfileBtn, savingProfile && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#ffffff" />
                    <Text style={styles.saveProfileBtnText}>Save Profile Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* App Themed Sign Out Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconCircle}>
              <LogOut size={26} color="#ef4444" />
            </View>

            <Text style={styles.logoutModalHeading}>Sign Out?</Text>
            <Text style={styles.logoutModalBody}>
              Are you sure you want to sign out? Your bag items, wishlist, and profile details will remain safely saved.
            </Text>

            <View style={styles.logoutModalBtnRow}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutConfirmText}>Yes, Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.passwordIconCircle}>
                  <Lock size={18} color="#818cf8" />
                </View>
                <Text style={styles.modalTitle}>Change Account Password</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.passwordHint}>
                Create a strong password with at least 6 characters to keep your account secure.
              </Text>

              {/* Current Password */}
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPw}
                  placeholder="Enter current password"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowCurrentPw(!showCurrentPw)}
                >
                  {showCurrentPw ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>

              {/* New Password */}
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPw}
                  placeholder="Enter new password (min. 6 chars)"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPw(!showNewPw)}
                >
                  {showNewPw ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Confirm New Password */}
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showNewPw}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.savePasswordBtn, savingPassword && { opacity: 0.7 }]}
                onPress={handleSavePassword}
                disabled={savingPassword}
                activeOpacity={0.8}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Lock size={16} color="#ffffff" />
                    <Text style={styles.savePasswordBtnText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  userEmail: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  menuSubLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  activeTag: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  authSection: {
    marginTop: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    height: 48,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: '700',
  },
  loginCtaBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
  },
  loginCtaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  avatarPencilBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#050811',
  },
  editProfileLink: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  userPhoneText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  modalAvatarContainer: {
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  modalAvatarWrap: {
    position: 'relative',
  },
  modalAvatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#38bdf8',
  },
  modalAvatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  modalAvatarInitial: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  modalAvatarCamBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  photoActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  takePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  takePhotoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadPhotoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  deletePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deletePhotoText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    marginTop: 4,
  },
  saveProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 8,
  },
  saveProfileBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0c121e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 4,
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoutModalCard: {
    width: '100%',
    backgroundColor: '#0c121e',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  logoutIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logoutModalHeading: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutModalBody: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
  },
  logoutModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutCancelText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  passwordIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordHint: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 4,
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  savePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 22,
    marginBottom: 10,
  },
  savePasswordBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
