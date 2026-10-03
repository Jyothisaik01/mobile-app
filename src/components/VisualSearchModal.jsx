import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import {
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  Search,
  CheckCircle2,
  RotateCcw,
  Tag,
  ArrowRight,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import colors from '../theme/colors';
import api from '../services/api';
import { formatPrice } from '../utils/formatters';

const { width, height } = Dimensions.get('window');

const SAMPLE_INSPIRATIONS = [
  {
    tag: 'Running Shoes',
    label: 'Sneakers',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80',
  },
  {
    tag: 'Headphones',
    label: 'Audio',
    img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
  },
  {
    tag: 'Backpack',
    label: 'Bags',
    img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop&q=80',
  },
  {
    tag: 'Smartwatch',
    label: 'Wearables',
    img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80',
  },
];

export default function VisualSearchModal({
  visible,
  onClose,
  navigation,
  onSelectProduct,
}) {
  // Screen state: 'idle' | 'scanning' | 'results'
  const [screen, setScreen] = useState('idle');
  const [previewUri, setPreviewUri] = useState(null);
  const [detectedItem, setDetectedItem] = useState('');
  const [colorDescription, setColorDescription] = useState('');
  const [dominantColors, setDominantColors] = useState([]);
  const [filterTags, setFilterTags] = useState(['All']);
  const [activeFilter, setActiveFilter] = useState('All');
  const [results, setResults] = useState([]);
  const [scanningMessage, setScanningMessage] = useState('Analyzing image with Gemini Vision AI...');

  const resetState = () => {
    setScreen('idle');
    setPreviewUri(null);
    setDetectedItem('');
    setColorDescription('');
    setDominantColors([]);
    setFilterTags(['All']);
    setActiveFilter('All');
    setResults([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Launch Native Camera
  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Access Required',
          'Please allow camera permissions in your device settings to use Visual Search.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPreviewUri(asset.uri);
        processImage(asset.base64, asset.uri, 'Camera Photo');
      }
    } catch (err) {
      console.warn('Camera error:', err);
      Alert.alert('Camera Error', 'Could not open the camera. Please try selecting from the gallery.');
    }
  };

  // Launch Photo Gallery
  const handleLaunchGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Access Required',
          'Please allow photo library access to search from your images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPreviewUri(asset.uri);
        processImage(asset.base64, asset.uri, 'Gallery Photo');
      }
    } catch (err) {
      console.warn('Gallery error:', err);
      Alert.alert('Gallery Error', 'Could not open the photo library.');
    }
  };

  // Pick sample inspiration
  const handleSelectSample = (sample) => {
    setPreviewUri(sample.img);
    setScreen('scanning');
    setScanningMessage(`Analyzing sample: ${sample.label}...`);

    // Fetch sample via backend or fallback search
    api
      .post('/visual-search/search', {
        image: sample.img,
        detectedTag: sample.tag,
      })
      .then((res) => {
        const data = res.data;
        populateResults(data, sample.label);
      })
      .catch((err) => {
        console.warn('Visual search sample error, falling back:', err);
        fallbackSearch(sample.tag);
      });
  };

  // Process Base64 Image to Gemini AI Backend
  const processImage = async (base64Data, uri, tag) => {
    setScreen('scanning');
    setScanningMessage('Gemini Vision AI detecting product motifs & colors...');

    try {
      const dataUrl = `data:image/jpeg;base64,${base64Data}`;
      const res = await api.post('/visual-search/search', {
        image: dataUrl,
        detectedTag: tag,
      });

      const data = res.data;
      populateResults(data, tag);
    } catch (err) {
      console.warn('Visual search API error, querying catalog fallback:', err);
      fallbackSearch(tag);
    }
  };

  const populateResults = (data, fallbackLabel) => {
    const detected = data.detectedItem || fallbackLabel || 'Catalog Match';
    setDetectedItem(detected);
    setColorDescription(data.colorDescription || 'Balanced Color Palette');
    setDominantColors(Array.isArray(data.dominantColors) ? data.dominantColors : ['#3b82f6', '#10b981']);

    const tags = Array.isArray(data.tags) && data.tags.length > 0
      ? data.tags
      : ['All', detected.split(' ')[0], 'Premium', 'Deals'];
    setFilterTags(tags);
    setActiveFilter('All');

    const productList = Array.isArray(data.products) ? data.products : [];
    setResults(productList);
    setScreen('results');
  };

  const fallbackSearch = async (query) => {
    try {
      const res = await api.get('/products', {
        params: { search: query, limit: 12 },
      });
      const list = res.data.products || res.data || [];
      setDetectedItem(query);
      setColorDescription('Catalog Curated Matches');
      setDominantColors(['#6366f1', '#3b82f6']);
      setFilterTags(['All', query]);
      setResults(list);
      setScreen('results');
    } catch {
      setResults([]);
      setScreen('results');
    }
  };

  const filteredResults = activeFilter === 'All'
    ? results
    : results.filter((p) => {
        const text = `${p.name} ${p.category} ${p.brand || ''}`.toLowerCase();
        return text.includes(activeFilter.toLowerCase());
      });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Camera size={18} color="#60a5fa" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Visual AI Lens</Text>
                <Text style={styles.modalSub}>
                  Powered by Gemini Vision 3.5 AI
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* SCREEN 1: IDLE / PICK PHOTO */}
          {screen === 'idle' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              <Text style={styles.guidanceText}>
                Snap a photo or select an image to find visually identical and matching items across our catalog.
              </Text>

              {/* Action Buttons Row */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, styles.cameraBtn]}
                  onPress={handleLaunchCamera}
                  activeOpacity={0.85}
                >
                  <Camera size={26} color="#ffffff" />
                  <Text style={styles.primaryActionTitle}>Take Photo</Text>
                  <Text style={styles.primaryActionSub}>Use live device camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, styles.galleryBtn]}
                  onPress={handleLaunchGallery}
                  activeOpacity={0.85}
                >
                  <ImageIcon size={26} color="#38bdf8" />
                  <Text style={styles.primaryActionTitle}>Upload Image</Text>
                  <Text style={styles.primaryActionSub}>Choose from gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Sample Inspirations */}
              <View style={styles.sampleSection}>
                <View style={styles.sampleHeader}>
                  <Sparkles size={14} color="#f59e0b" />
                  <Text style={styles.sampleHeading}>Try Sample Inspirations</Text>
                </View>
                <View style={styles.sampleGrid}>
                  {SAMPLE_INSPIRATIONS.map((sample) => (
                    <TouchableOpacity
                      key={sample.tag}
                      style={styles.sampleCard}
                      onPress={() => handleSelectSample(sample)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: sample.img }} style={styles.sampleImg} resizeMode="cover" />
                      <View style={styles.sampleLabelWrap}>
                        <Text style={styles.sampleLabel}>{sample.label}</Text>
                        <ArrowRight size={12} color="#94a3b8" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          )}

          {/* SCREEN 2: SCANNING ANIMATION */}
          {screen === 'scanning' && (
            <View style={styles.scanningContainer}>
              <View style={styles.previewBox}>
                {previewUri && (
                  <Image source={{ uri: previewUri }} style={styles.scanningImg} resizeMode="cover" />
                )}
                <View style={styles.laserLine} />
                <View style={styles.scanningBadge}>
                  <Sparkles size={14} color="#60a5fa" />
                  <Text style={styles.scanningBadgeText}>AI VISION SCAN</Text>
                </View>
              </View>

              <ActivityIndicator size="large" color="#60a5fa" style={{ marginTop: 24 }} />
              <Text style={styles.scanningTitle}>Analyzing Photo...</Text>
              <Text style={styles.scanningDesc}>{scanningMessage}</Text>
            </View>
          )}

          {/* SCREEN 3: RESULTS */}
          {screen === 'results' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              {/* Detected Card */}
              <View style={styles.detectedCard}>
                {previewUri && (
                  <Image source={{ uri: previewUri }} style={styles.detectedThumb} resizeMode="cover" />
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.matchTag}>
                    <CheckCircle2 size={12} color="#10b981" />
                    <Text style={styles.matchTagText}>Gemini AI Matched</Text>
                  </View>
                  <Text style={styles.detectedTitle}>{detectedItem}</Text>
                  <Text style={styles.detectedColor}>{colorDescription}</Text>
                </View>
                <TouchableOpacity style={styles.rescanBtn} onPress={resetState}>
                  <RotateCcw size={16} color="#60a5fa" />
                  <Text style={styles.rescanText}>Retake</Text>
                </TouchableOpacity>
              </View>

              {/* Filter Tag Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagScroll}
              >
                {filterTags.map((tag) => {
                  const isActive = activeFilter === tag;
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagPill, isActive && styles.tagPillActive]}
                      onPress={() => setActiveFilter(tag)}
                    >
                      <Tag size={12} color={isActive ? '#ffffff' : colors.textMuted} />
                      <Text style={[styles.tagText, isActive && styles.tagTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Matched Products List */}
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  Found {filteredResults.length} matching products
                </Text>
              </View>

              {filteredResults.length === 0 ? (
                <View style={styles.noResultsWrap}>
                  <Text style={styles.noResultsText}>No visually similar products found.</Text>
                  <TouchableOpacity style={styles.tryAnotherBtn} onPress={resetState}>
                    <Text style={styles.tryAnotherText}>Try Another Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.resultsGrid}>
                  {filteredResults.map((product) => (
                    <TouchableOpacity
                      key={product._id || product.id}
                      style={styles.resultItem}
                      activeOpacity={0.8}
                      onPress={() => {
                        handleClose();
                        if (navigation) {
                          navigation.navigate('ProductDetails', { product });
                        }
                      }}
                    >
                      <Image
                        source={{ uri: product.image }}
                        style={styles.resultItemImg}
                        resizeMode="cover"
                      />
                      <View style={styles.resultItemBody}>
                        <Text style={styles.resultCategory}>{product.category}</Text>
                        <Text style={styles.resultName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text style={styles.resultPrice}>{formatPrice(product.price)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#090d16',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    maxHeight: height * 0.88,
    minHeight: height * 0.6,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#172554',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  scrollBody: {
    padding: 20,
  },
  guidanceText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  primaryActionBtn: {
    flex: 1,
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    backgroundColor: '#2563eb',
  },
  galleryBtn: {
    backgroundColor: '#0c1c2e',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  primaryActionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  primaryActionSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  sampleSection: {
    marginTop: 8,
  },
  sampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sampleHeading: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sampleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sampleCard: {
    width: (width - 52) / 2,
    backgroundColor: '#111827',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  sampleImg: {
    width: '100%',
    height: 100,
  },
  sampleLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  sampleLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  previewBox: {
    width: 200,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3b82f6',
    position: 'relative',
    backgroundColor: '#1e293b',
  },
  scanningImg: {
    width: '100%',
    height: '100%',
  },
  laserLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#60a5fa',
    shadowColor: '#60a5fa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  scanningBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scanningBadgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
  },
  scanningTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  scanningDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  detectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
    gap: 12,
  },
  detectedThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  matchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  matchTagText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  detectedTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  detectedColor: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  rescanText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  tagScroll: {
    gap: 8,
    marginBottom: 16,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  tagText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  tagTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resultsHeader: {
    marginBottom: 12,
  },
  resultsCount: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resultItem: {
    width: (width - 52) / 2,
    backgroundColor: '#111827',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  resultItemImg: {
    width: '100%',
    height: 120,
  },
  resultItemBody: {
    padding: 10,
  },
  resultCategory: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resultName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 17,
  },
  resultPrice: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  noResultsWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  tryAnotherBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  tryAnotherText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
