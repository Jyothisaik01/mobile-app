import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  MapPin,
  X,
  Search,
  CheckCircle2,
  Navigation,
  Home,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import colors from '../theme/colors';
import locationService from '../services/locationService';
import addressService from '../services/addressService';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

const DEFAULT_COORDS = { lat: 17.7289, lng: 83.3195 }; // Visakhapatnam default

export default function AddressMapModal({
  visible,
  onClose,
  onAddressSaved,
  initialAddress = null,
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webViewRef = useRef(null);

  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [house, setHouse] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [addressType, setAddressType] = useState('Home'); // 'Home' | 'Work' | 'Other'

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialAddress) {
        const c = initialAddress.coordinates || DEFAULT_COORDS;
        setCoords(c);
        setFullName(initialAddress.fullName || user?.name || '');
        setPhone(initialAddress.phone || user?.phone || '');
        setHouse(initialAddress.house || initialAddress.addressLine1 || '');
        setArea(initialAddress.area || initialAddress.addressLine2 || '');
        setCity(initialAddress.city || '');
        setState(initialAddress.state || '');
        setPincode(initialAddress.pincode || initialAddress.postalCode || '');
        setFormattedAddress(initialAddress.formattedAddress || initialAddress.addressLine1 || '');
      } else {
        setFullName(user?.name || '');
        setPhone(user?.phone || '');
        setCoords(DEFAULT_COORDS);
        handleReverseGeocode(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng);
      }
    }
  }, [visible, initialAddress]);

  const handleReverseGeocode = async (lat, lng) => {
    setGeocoding(true);
    try {
      const res = await locationService.reverseGeocode(lat, lng);
      if (res) {
        setArea(res.area || res.addressLine2 || '');
        setCity(res.city || '');
        setState(res.state || '');
        setPincode(res.pincode || '');
        setFormattedAddress(res.formattedAddress || res.displayName || `${res.area || ''}, ${res.city || ''}`.trim());
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
    } finally {
      setGeocoding(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await locationService.searchLocation(query);
      setSearchResults(Array.isArray(results) ? results.slice(0, 5) : []);
    } catch (e) {
      console.warn('Search location failed:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (item) => {
    const lat = Number(item.lat || item.latitude);
    const lng = Number(item.lon || item.lng || item.longitude);
    if (lat && lng) {
      setCoords({ lat, lng });
      setSearchQuery(item.displayName || item.name || '');
      setSearchResults([]);
      handleReverseGeocode(lat, lng);

      // Pan map in WebView
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (window.panToCoords) {
            window.panToCoords(${lat}, ${lng});
          }
          true;
        `);
      }
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PIN_MOVED') {
        const { lat, lng } = data;
        setCoords({ lat, lng });
        handleReverseGeocode(lat, lng);
      } else if (data.type === 'MAP_READY') {
        setMapReady(true);
      }
    } catch (e) {
      console.warn('WebView message error:', e);
    }
  };

  const handleSave = async () => {
    const line1 = house ? `${house}, ${area || formattedAddress}` : (area || formattedAddress);
    if (!line1 || !city || !pincode) {
      Toast.show({
        type: 'error',
        text1: 'Incomplete Address',
        text2: 'Please ensure house/street, city and pincode are filled.',
        position: 'bottom',
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        fullName: fullName || user?.name || 'Customer',
        phone: phone || user?.phone || '9876543210',
        addressLine1: line1,
        addressLine: line1,
        area: area || city,
        city: city,
        state: state || 'State',
        postalCode: pincode,
        pincode: pincode,
        country: 'India',
        type: addressType,
        coordinates: coords,
        formattedAddress: formattedAddress || line1,
        isDefault: true,
      };

      const saved = await addressService.createAddress(payload);
      Toast.show({
        type: 'success',
        text1: 'Address Pinned & Saved! 📍',
        text2: `${city}, ${pincode}`,
        position: 'bottom',
      });
      if (onAddressSaved) onAddressSaved(saved || payload);
      onClose();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Save Address',
        text2: err.message || 'Please check fields and try again.',
        position: 'bottom',
      });
    } finally {
      setSaving(false);
    }
  };

  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #050811; }
    .custom-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
    }
    .custom-badge {
      background: #4f46e5;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.45);
      margin-bottom: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .custom-pin svg {
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
    }
  </style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    const initialLat = ${coords.lat};
    const initialLng = ${coords.lng};

    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([initialLat, initialLng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: '',
      html: \`
        <div class="custom-pin">
          <div class="custom-badge">📍 Drag pin to set location</div>
          <svg width="36" height="48" viewBox="0 0 384 512" fill="#4f46e5" xmlns="http://www.w3.org/2000/svg">
            <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
            <circle cx="192" cy="192" r="70" fill="#ffffff"/>
          </svg>
        </div>
      \`,
      iconSize: [36, 48],
      iconAnchor: [18, 48]
    });

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: pinIcon
    }).addTo(map);

    marker.on('dragend', function(e) {
      const pos = e.target.getLatLng();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'PIN_MOVED',
          lat: pos.lat,
          lng: pos.lng
        }));
      }
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      map.panTo(e.latlng);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'PIN_MOVED',
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }));
      }
    });

    window.panToCoords = function(lat, lng) {
      const target = [lat, lng];
      marker.setLatLng(target);
      map.setView(target, 16);
    };

    setTimeout(function() {
      map.invalidateSize();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    }, 200);
  </script>
</body>
</html>
  `;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerCloseBtn}>
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Pin Delivery Location</Text>
            <Text style={styles.headerSub}>Move pin on map to set your doorstep address</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarWrap}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search area, landmark or street name..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searching && <ActivityIndicator size="small" color="#38bdf8" />}
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <X size={15} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsDropdown}>
            {searchResults.map((res, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchResultItem}
                onPress={() => handleSelectSearchResult(res)}
              >
                <MapPin size={15} color="#60a5fa" style={{ marginTop: 2 }} />
                <Text style={styles.searchResultText} numberOfLines={2}>
                  {res.displayName || res.name || res.formattedAddress}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Interactive Map */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: leafletHtml }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            scrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />

          {geocoding && (
            <View style={styles.geocodingPill}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.geocodingText}>Resolving address pin...</Text>
            </View>
          )}

          {/* Quick GPS Center Button */}
          <TouchableOpacity
            style={styles.gpsFab}
            onPress={() => {
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  if (window.panToCoords) {
                    window.panToCoords(${DEFAULT_COORDS.lat}, ${DEFAULT_COORDS.lng});
                  }
                  true;
                `);
                handleReverseGeocode(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng);
              }
            }}
          >
            <Navigation size={18} color="#38bdf8" />
          </TouchableOpacity>
        </View>

        {/* Bottom Form Sheet */}
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={[styles.formContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Pinned Address Preview Card */}
          <View style={styles.addressPreviewCard}>
            <View style={styles.addressPreviewHeader}>
              <View style={styles.badgeRow}>
                <CheckCircle2 size={13} color="#10b981" />
                <Text style={styles.badgeText}>Pinned Location</Text>
              </View>
              <Text style={styles.coordsText}>
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </Text>
            </View>
            <Text style={styles.previewAddressText}>
              {formattedAddress || `${city || 'Location'}, ${pincode || ''}`}
            </Text>
          </View>

          {/* House / Flat / Street Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>House / Flat / Building No. *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="e.g. Flat 402, Skyline Towers, Main Road"
              placeholderTextColor="#64748b"
              value={house}
              onChangeText={setHouse}
            />
          </View>

          {/* Area & Landmark */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Area / Street / Colony</Text>
            <TextInput
              style={styles.inputField}
              placeholder="e.g. Cyber Hills Colony"
              placeholderTextColor="#64748b"
              value={area}
              onChangeText={setArea}
            />
          </View>

          {/* City, State & Pincode in 1 row */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="City"
                placeholderTextColor="#64748b"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Pincode *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Pincode"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={pincode}
                onChangeText={setPincode}
              />
            </View>
          </View>

          {/* Full Name & Phone Number */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Recipient Name</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Name"
                placeholderTextColor="#64748b"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Phone"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Address Tag (Home, Work, Other) */}
          <View style={styles.typeSelectorRow}>
            {['Home', 'Work', 'Other'].map((t) => {
              const isSelected = addressType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typePill, isSelected && styles.typePillActive]}
                  onPress={() => setAddressType(t)}
                >
                  {t === 'Home' && <Home size={13} color={isSelected ? '#ffffff' : '#94a3b8'} />}
                  {t === 'Work' && <Briefcase size={13} color={isSelected ? '#ffffff' : '#94a3b8'} />}
                  {t === 'Other' && <MapPin size={13} color={isSelected ? '#ffffff' : '#94a3b8'} />}
                  <Text style={[styles.typePillText, isSelected && styles.typePillTextActive]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save Address Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Save & Use Pinned Location</Text>
                <ArrowRight size={18} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050811',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0b1120',
    gap: 12,
  },
  headerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    padding: 0,
  },
  searchResultsDropdown: {
    backgroundColor: '#0f172a',
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 180,
    zIndex: 99,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  searchResultText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
  },
  mapContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#050811',
  },
  geocodingPill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  geocodingText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  gpsFab: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  formScroll: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  formContent: {
    padding: 16,
    gap: 12,
  },
  addressPreviewCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  addressPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  coordsText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewAddressText: {
    fontSize: 13,
    color: '#f8fafc',
    lineHeight: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  inputField: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    color: '#ffffff',
    fontSize: 13,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  typePillActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  typePillTextActive: {
    color: '#38bdf8',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
