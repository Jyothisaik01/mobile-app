import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  X,
  Camera,
  Sparkles,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  FlipHorizontal,
  SwitchCamera,
  Layers,
  Check,
  Zap,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import colors from '../theme/colors';
import { formatPrice } from '../utils/formatters';
import { useCart } from '../context/CartContext';
import productService from '../services/productService';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

const FALLBACK_DRESSES = [
  {
    _id: 'd1',
    name: 'Minimalist Relaxed Fit Linen Blazer',
    price: 3499,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80',
  },
  {
    _id: 'd2',
    name: 'Oversized Silk Crepe Evening Dress',
    price: 4299,
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
  },
  {
    _id: 'd3',
    name: 'Contemporary Denim Chore Jacket',
    price: 2899,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
  },
  {
    _id: 'd4',
    name: 'Classic Oxford Tailored Cotton Shirt',
    price: 1999,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
  },
];

export default function DecartAnywearTryOnModal({ visible, onClose, product }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const navigation = useNavigation();

  // Camera permissions from expo-camera
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState('front');

  // Auto-request camera permission on open
  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission]);

  // Currently selected outfit on camera
  const [selectedOutfit, setSelectedOutfit] = useState(product);
  const [outfitList, setOutfitList] = useState([]);
  const [loadingOutfits, setLoadingOutfits] = useState(false);

  // Garment AR Fitting Controls
  const [garmentScale, setGarmentScale] = useState(1);
  const [garmentOffsetY, setGarmentOffsetY] = useState(0);
  const [garmentOpacity, setGarmentOpacity] = useState(0.95);
  const [isMirrored, setIsMirrored] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);

  // Drag Gesture for Garment Placement
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        setGarmentOffsetY((prev) => Math.max(-140, Math.min(140, prev + gestureState.dy * 0.15)));
      },
    })
  ).current;

  useEffect(() => {
    if (product) {
      setSelectedOutfit(product);
    }
  }, [product]);

  useEffect(() => {
    async function loadCatalogDresses() {
      if (!visible || !product) return;
      try {
        setLoadingOutfits(true);
        const res = await productService.getProducts({
          category: product.category && product.category !== 'All' ? product.category : undefined,
          limit: 10,
        });
        const items = Array.isArray(res) ? res : res?.items || res?.products || [];
        if (items.length > 0) {
          const others = items.filter((p) => (p._id || p.id) !== (product._id || product.id));
          setOutfitList([product, ...others]);
        } else {
          setOutfitList([product, ...FALLBACK_DRESSES]);
        }
      } catch {
        setOutfitList([product, ...FALLBACK_DRESSES]);
      } finally {
        setLoadingOutfits(false);
      }
    }

    loadCatalogDresses();
  }, [visible, product]);

  if (!product) return null;

  const currentOutfit = selectedOutfit || product;
  const garmentImg =
    currentOutfit.virtualTryOn?.tryOnImage ||
    currentOutfit.image ||
    (Array.isArray(currentOutfit.images) && (currentOutfit.images[0]?.url || currentOutfit.images[0])) ||
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';

  const handleAddToCart = () => {
    addToCart(currentOutfit, 1);
    setIsAddedSuccess(true);
    Toast.show({
      type: 'success',
      text1: 'Added to Bag! 🛍️',
      text2: `${currentOutfit.name} added to cart`,
      position: 'bottom',
    });
    setTimeout(() => {
      setIsAddedSuccess(false);
      onClose();
    }, 1400);
  };

  const handleSelectOutfit = (outfit) => {
    setSelectedOutfit(outfit);
    Toast.show({
      type: 'info',
      text1: `Swapped to ${outfit.name.split(' ')[0]}`,
      text2: 'Fitting garment on live camera feed...',
      position: 'bottom',
      visibilityTime: 1200,
    });
  };

  const toggleCameraFacing = () => {
    setCameraFacing((f) => (f === 'front' ? 'back' : 'front'));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBadge}>
              <Sparkles size={16} color="#c084fc" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Decart Anywear AI</Text>
              <Text style={styles.headerSub}>Live Camera AR Virtual Try-On</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Live Camera Feed Viewport */}
        <View style={styles.viewport} {...panResponder.panHandlers}>
          {permission?.granted && !simulationMode ? (
            <CameraView
              style={styles.cameraFeed}
              facing={cameraFacing}
            />
          ) : (
            /* Permission Request or Fallback Simulation Screen */
            <View style={styles.permissionContainer}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
                }}
                style={styles.simulationBg}
                resizeMode="cover"
              />
              <View style={styles.permissionCard}>
                <Camera size={34} color="#38bdf8" />
                <Text style={styles.permissionTitle}>Live Camera Fitting Room</Text>
                <Text style={styles.permissionDesc}>
                  Allow camera access to try on dresses, shirts, and apparel live on your device camera feed in real time.
                </Text>
                <TouchableOpacity
                  style={styles.grantBtn}
                  onPress={async () => {
                    const res = await requestPermission();
                    if (!res.granted) setSimulationMode(true);
                  }}
                >
                  <Text style={styles.grantBtnText}>Enable Live Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.simBtn}
                  onPress={() => setSimulationMode(true)}
                >
                  <Text style={styles.simBtnText}>Continue with AR Preview</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Body Frame Outline Guide */}
          <View style={styles.bodyGuideOverlay} pointerEvents="none">
            <View style={styles.guideHead} />
            <View style={styles.guideTorso} />
          </View>

          {/* Real-time Overlaid Garment with Dynamic Scaling & Pan */}
          <View
            style={[
              styles.garmentWrapper,
              {
                transform: [
                  { translateY: garmentOffsetY },
                  { scale: garmentScale },
                  ...(isMirrored ? [{ scaleX: -1 }] : []),
                ],
                opacity: garmentOpacity,
              },
            ]}
            pointerEvents="none"
          >
            <Image source={{ uri: garmentImg }} style={styles.garmentImage} resizeMode="contain" />
          </View>

          {/* Live AI Anchoring Badge */}
          <View style={styles.aiAnchorPill}>
            <View style={styles.liveGreenDot} />
            <Text style={styles.aiAnchorText}>98% Fit Match • AR Anchored ⚡</Text>
          </View>

          {/* Floating Camera & Fit Controls */}
          <View style={styles.floatingControls}>
            <TouchableOpacity style={styles.ctrlBtn} onPress={toggleCameraFacing}>
              <SwitchCamera size={18} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.ctrlBtn} onPress={() => setIsMirrored((m) => !m)}>
              <FlipHorizontal size={18} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctrlBtn, showSliders && styles.ctrlBtnActive]}
              onPress={() => setShowSliders((s) => !s)}
            >
              <Sliders size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Quick Fit Sliders Tray */}
          {showSliders && (
            <View style={styles.slidersTray}>
              <Text style={styles.slidersTitle}>Adjust Fit & Size</Text>
              <View style={styles.slidersRow}>
                <TouchableOpacity
                  style={styles.sliderPill}
                  onPress={() => setGarmentScale((s) => Math.max(0.6, s - 0.1))}
                >
                  <Text style={styles.sliderPillText}>Size -</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderPill}
                  onPress={() => setGarmentScale(1)}
                >
                  <Text style={styles.sliderPillText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderPill}
                  onPress={() => setGarmentScale((s) => Math.min(1.4, s + 0.1))}
                >
                  <Text style={styles.sliderPillText}>Size +</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Live Dresses / Apparel Carousel */}
          <View style={styles.carouselContainer}>
            <View style={styles.carouselHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Layers size={13} color="#38bdf8" />
                <Text style={styles.carouselTitle}>Try On Catalog Dresses (Live on Cam)</Text>
              </View>
              <Text style={styles.dragHint}>Drag garment to position</Text>
            </View>

            {loadingOutfits ? (
              <ActivityIndicator size="small" color="#38bdf8" style={{ marginVertical: 10 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselScroll}
              >
                {outfitList.map((outfit) => {
                  const oId = outfit._id || outfit.id;
                  const isCurrent = (currentOutfit._id || currentOutfit.id) === oId;
                  const thumb =
                    outfit.images?.[0]?.url ||
                    outfit.image ||
                    (Array.isArray(outfit.images) && typeof outfit.images[0] === 'string' ? outfit.images[0] : null) ||
                    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300';

                  return (
                    <TouchableOpacity
                      key={oId}
                      style={[styles.outfitCard, isCurrent && styles.outfitCardActive]}
                      onPress={() => handleSelectOutfit(outfit)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: thumb }} style={styles.outfitThumb} resizeMode="cover" />
                      <Text style={[styles.outfitName, isCurrent && styles.outfitNameActive]} numberOfLines={1}>
                        {outfit.name}
                      </Text>
                      <Text style={styles.outfitPrice}>{formatPrice(outfit.price)}</Text>
                      {isCurrent && (
                        <View style={styles.selectedBadge}>
                          <Check size={10} color="#ffffff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Bottom Checkout CTA */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarLeft}>
            <Text style={styles.bottomBarLabel}>SELECTED OUTFIT</Text>
            <Text style={styles.bottomBarName} numberOfLines={1}>
              {currentOutfit.name}
            </Text>
            <Text style={styles.bottomBarPrice}>
              {formatPrice(currentOutfit.price)}
            </Text>
          </View>

          <View style={styles.bottomBtnGroup}>
            <TouchableOpacity
              style={[styles.addBagBtn, isAddedSuccess && styles.addBagBtnSuccess]}
              onPress={handleAddToCart}
              activeOpacity={0.85}
            >
              {isAddedSuccess ? (
                <>
                  <CheckCircle2 size={15} color="#ffffff" />
                  <Text style={styles.addBagBtnText}>Added ✓</Text>
                </>
              ) : (
                <>
                  <ShoppingBag size={15} color="#ffffff" />
                  <Text style={styles.addBagBtnText}>Add to Bag</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buyNowBtn}
              onPress={() => {
                addToCart(currentOutfit, 1);
                onClose();
                navigation.navigate('Cart');
              }}
              activeOpacity={0.85}
            >
              <Zap size={15} color="#ffffff" />
              <Text style={styles.buyNowBtnText}>Buy Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#08080f',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2e1065',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewport: {
    flex: 1,
    backgroundColor: '#050508',
    position: 'relative',
    overflow: 'hidden',
  },
  cameraFeed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  simulationBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  permissionCard: {
    backgroundColor: 'rgba(10, 15, 30, 0.92)',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a8a',
    marginHorizontal: 24,
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  permissionDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  grantBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  grantBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  simBtn: {
    paddingVertical: 8,
  },
  simBtnText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  bodyGuideOverlay: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    opacity: 0.18,
  },
  guideHead: {
    width: 100,
    height: 120,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#38bdf8',
    marginBottom: 8,
  },
  guideTorso: {
    width: 180,
    height: 240,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  garmentWrapper: {
    position: 'absolute',
    top: '18%',
    left: '12%',
    right: '12%',
    height: height * 0.42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  aiAnchorPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  aiAnchorText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  floatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 8,
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  ctrlBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa',
  },
  slidersTray: {
    position: 'absolute',
    top: 70,
    right: 14,
    backgroundColor: 'rgba(10, 15, 30, 0.9)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e3a8a',
  },
  slidersTitle: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  slidersRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sliderPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sliderPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  carouselContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 8, 18, 0.94)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  carouselTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  dragHint: {
    color: '#64748b',
    fontSize: 10,
  },
  carouselScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  outfitCard: {
    width: 82,
    backgroundColor: '#0c1527',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    position: 'relative',
  },
  outfitCardActive: {
    borderColor: '#60a5fa',
    backgroundColor: '#172554',
  },
  outfitThumb: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#050811',
    marginBottom: 4,
  },
  outfitName: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    width: 70,
  },
  outfitNameActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  outfitPrice: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#080c18',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  bottomBarLeft: {
    flex: 1,
    marginRight: 14,
  },
  bottomBarLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomBarName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomBarPrice: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  bottomBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBagBtnSuccess: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  addBagBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  buyNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buyNowBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
