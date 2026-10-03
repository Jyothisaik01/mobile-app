import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Plus, Trash2, CheckCircle2, ArrowLeft, X, Navigation } from 'lucide-react-native';
import colors from '../theme/colors';
import addressService from '../services/addressService';
import AddressMapModal from '../components/AddressMapModal';
import Toast from 'react-native-toast-message';

export default function AddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (e) {
      console.warn('Addresses fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddAddress = async () => {
    if (!addressLine || !city || !postalCode) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please fill address line, city & pincode.', position: 'bottom' });
      return;
    }

    try {
      setSaving(true);
      await addressService.createAddress({
        fullName: fullName || 'Customer',
        phone: phone || '9999999999',
        addressLine,
        city,
        state: state || 'State',
        postalCode,
        country: 'India',
        isDefault: addresses.length === 0,
      });

      Toast.show({ type: 'success', text1: 'Address Added', position: 'bottom' });
      setShowAddModal(false);
      // Reset form
      setFullName('');
      setPhone('');
      setAddressLine('');
      setCity('');
      setState('');
      setPostalCode('');
      fetchAddresses();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to save address', position: 'bottom' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await addressService.setDefaultAddress(id);
      Toast.show({ type: 'success', text1: 'Default Address Updated', position: 'bottom' });
      fetchAddresses();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to set default', position: 'bottom' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await addressService.deleteAddress(id);
      Toast.show({ type: 'info', text1: 'Address Deleted', position: 'bottom' });
      fetchAddresses();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to delete address', position: 'bottom' });
    }
  };

  const renderAddress = ({ item }) => {
    const isDefault = item.isDefault;

    return (
      <View style={[styles.card, isDefault && styles.cardDefault]}>
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <MapPin size={16} color={colors.primaryLight} />
            <Text style={styles.personName}>{item.fullName || 'Home Address'}</Text>
          </View>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <CheckCircle2 size={12} color="#10b981" />
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>

        <Text style={styles.addressLine}>{item.addressLine}</Text>
        <Text style={styles.cityState}>
          {item.city}, {item.state} - {item.postalCode}
        </Text>
        {item.phone && <Text style={styles.phoneText}>Phone: {item.phone}</Text>}

        <View style={styles.cardActions}>
          {!isDefault && (
            <TouchableOpacity
              style={styles.setDefaultBtn}
              onPress={() => handleSetDefault(item._id)}
            >
              <Text style={styles.setDefaultText}>Set as Default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item._id)}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Addresses</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Map Action Banner */}
      <View style={styles.mapActionBanner}>
        <View style={styles.mapBannerLeft}>
          <View style={styles.mapBannerIcon}>
            <MapPin size={18} color="#38bdf8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mapBannerTitle}>Interactive Map Pinning</Text>
            <Text style={styles.mapBannerDesc}>Pin your exact doorstep & coordinates for zero-drop express deliveries</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.mapBannerBtn}
          onPress={() => setShowMapModal(true)}
        >
          <Navigation size={14} color="#ffffff" />
          <Text style={styles.mapBannerBtnText}>Pin on Map</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderAddress}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MapPin size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No saved addresses</Text>
              <Text style={styles.emptySub}>Pin your address on the map or enter manually for 1-tap checkout</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.addFirstBtn, { backgroundColor: '#4f46e5' }]}
                  onPress={() => setShowMapModal(true)}
                >
                  <Navigation size={15} color="#ffffff" />
                  <Text style={styles.addFirstBtnText}>Pin on Map</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addFirstBtn}
                  onPress={() => setShowAddModal(true)}
                >
                  <Plus size={15} color="#ffffff" />
                  <Text style={styles.addFirstBtnText}>Manual Entry</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      )}

      {/* Interactive Map Modal */}
      <AddressMapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        onAddressSaved={() => fetchAddresses()}
      />

      {/* Add Address Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Delivery Address</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Map Action Inside Add Modal */}
            <TouchableOpacity
              style={styles.modalMapPinBtn}
              onPress={() => {
                setShowAddModal(false);
                setShowMapModal(true);
              }}
            >
              <MapPin size={16} color="#38bdf8" />
              <Text style={styles.modalMapPinBtnText}>Locate &amp; Pin Address on Map 🗺️</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Receiver's name"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Street / Building / Flat</Text>
              <TextInput
                style={styles.input}
                placeholder="House No., Street Name, Area"
                placeholderTextColor={colors.textMuted}
                value={addressLine}
                onChangeText={setAddressLine}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    placeholderTextColor={colors.textMuted}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.inputLabel}>Postal Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pincode"
                    placeholderTextColor={colors.textMuted}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveAddressBtn}
                disabled={saving}
                onPress={handleAddAddress}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveAddressBtnText}>Save Address</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardDefault: {
    borderColor: colors.primary,
    backgroundColor: '#0c0e18',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  addressLine: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  cityState: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  phoneText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setDefaultBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setDefaultText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFirstBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: colors.text,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  saveAddressBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveAddressBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  mapActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
    gap: 12,
  },
  mapBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mapBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  mapBannerDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  mapBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mapBannerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalMapPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0c1a2e',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 16,
  },
  modalMapPinBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
});
