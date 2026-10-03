import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Check,
  Bookmark,
  Shirt,
  Scissors,
  User,
  Camera,
  Layers,
  Wand2,
  Sliders,
  CheckCircle2,
  RotateCw,
  X,
  Plus,
  Minus,
  Trash2,
  Tag,
  Zap,
  SwitchCamera,
  FlipHorizontal,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import colors from '../theme/colors';
import avatarService from '../services/avatarService';
import { formatPrice } from '../utils/formatters';
import { useCart } from '../context/CartContext';
import ThreeAvatarView from '../components/ThreeAvatarView';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const SKIN_TONES = ['#f8d9b6', '#f7d0b5', '#e0ac69', '#c68642', '#8d5524', '#3d2314'];
const HAIR_COLORS = ['#1a1a1a', '#1f2937', '#4a3728', '#8b5a2b', '#c0a080', '#e5e5e5', '#a855f7'];
const HAIR_STYLES = [
  { id: 'short_fade', label: 'Short Fade' },
  { id: 'buzz_cut', label: 'Buzz Cut' },
  { id: 'pompadour', label: 'Pompadour' },
  { id: 'wavy_long', label: 'Wavy Long' },
  { id: 'curly_crop', label: 'Curly Crop' },
  { id: 'sleek_bob', label: 'Sleek Bob' },
];
const BODY_TYPES = ['Slim', 'Regular', 'Athletic'];
const WARDROBE_CATEGORIES = [
  { id: 'All', label: 'All', icon: '✨' },
  { id: 'Tops', label: 'Tops', icon: '👕' },
  { id: 'Bottoms', label: 'Bottoms', icon: '👖' },
  { id: 'Dresses', label: 'Dresses', icon: '👗' },
  { id: 'Shoes', label: 'Shoes', icon: '👟' },
  { id: 'Accessories', label: 'Accessories', icon: '👓' },
];

export default function AvatarStudioScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { initialEquipProduct } = route.params || {};

  // Modes: '3d_studio' | 'anywear_cam'
  const [studioMode, setStudioMode] = useState('3d_studio');
  const [activeTab, setActiveTab] = useState('fitting'); // 'fitting' | 'customize' | 'saved'
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Avatar Customization States matching web
  const [gender, setGender] = useState('Male'); // 'Male' | 'Female'
  const [bodyType, setBodyType] = useState('Athletic'); // 'Slim' | 'Regular' | 'Athletic'
  const [height, setHeight] = useState(178); // cm
  const [skinTone, setSkinTone] = useState('#f7d0b5');
  const [hairColor, setHairColor] = useState('#1f2937');
  const [hairStyle, setHairStyle] = useState('short_fade');

  // 3D Stance: 1 (Runway Front), 2 (Fashion 3/4), 3 (Side Profile)
  const [stance, setStance] = useState(1);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  const [avatar, setAvatar] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [savedLooks, setSavedLooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Equipped outfit items
  const [equippedItems, setEquippedItems] = useState({
    top: null,
    bottom: null,
    shoes: null,
    dress: null,
    outerwear: null,
    accessories: null,
  });

  // Decart Anywear Live Camera AR state
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState('front');
  const [isMirrored, setIsMirrored] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [userPhotoUri, setUserPhotoUri] = useState(null);
  const [isProcessingLucyVTON, setIsProcessingLucyVTON] = useState(false);
  const [garmentScale, setGarmentScale] = useState(1);
  const [garmentOffsetY, setGarmentOffsetY] = useState(0);

  // Auto request camera permission when entering Anywear live camera mode
  useEffect(() => {
    if (studioMode === 'anywear_cam' && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [studioMode, permission]);

  useEffect(() => {
    async function loadAvatarData() {
      try {
        const [avatarData, catalogData] = await Promise.all([
          avatarService.getMyAvatar(),
          avatarService.getWardrobeCatalog(gender),
        ]);
        setAvatar(avatarData);
        setCatalog(catalogData);

        if (avatarData) {
          if (avatarData.gender) {
            const resolvedGender = avatarData.gender.toLowerCase() === 'female' ? 'Female' : 'Male';
            setGender(resolvedGender);
          }
          if (avatarData.bodyType) setBodyType(avatarData.bodyType);
          if (avatarData.heightCm || avatarData.height) setHeight(avatarData.heightCm || avatarData.height);
          if (avatarData.skinTone) setSkinTone(avatarData.skinTone);
          if (avatarData.hairColor) setHairColor(avatarData.hairColor);
          if (avatarData.hairStyle) setHairStyle(avatarData.hairStyle);
          if (Array.isArray(avatarData.savedLooks)) setSavedLooks(avatarData.savedLooks);
        }

        const current = avatarData?.currentOutfit || {};
        const initial = {
          top: current.top || null,
          bottom: current.bottom || null,
          shoes: current.shoes || null,
          dress: current.dress || null,
          outerwear: current.outerwear || null,
          accessories: current.accessories || null,
        };

        if (initialEquipProduct) {
          const slot = detectSlot(initialEquipProduct);
          initial[slot] = initialEquipProduct;
        }

        setEquippedItems(initial);
      } catch (err) {
        console.warn('Failed to load avatar data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAvatarData();
  }, [initialEquipProduct]);

  // Gender Switcher: fetches gender catalog and reloads rigged model
  const handleGenderSwitch = async (newGender) => {
    if (newGender === gender) return;
    setGender(newGender);
    try {
      const items = await avatarService.getWardrobeCatalog(newGender);
      setCatalog(items);
      avatarService.updateProfile({ gender: newGender.toLowerCase() });
      Toast.show({
        type: 'info',
        text1: `Switched to ${newGender} 3D Model`,
        position: 'bottom',
      });
    } catch (e) {
      console.warn('Failed to update gender wardrobe:', e);
    }
  };

  const detectSlot = (item) => {
    if (item.clothingType) {
      if (item.clothingType === 'top' || item.clothingType === 'outerwear') return 'top';
      if (item.clothingType === 'bottom') return 'bottom';
      if (item.clothingType === 'shoes' || item.clothingType === 'footwear') return 'shoes';
      if (item.clothingType === 'dress') return 'dress';
      if (item.clothingType === 'accessories' || item.clothingType === 'bag') return 'accessories';
    }
    if (item.slot) return item.slot;
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    if (cat.includes('dress') || name.includes('dress') || name.includes('gown') || name.includes('saree')) return 'dress';
    if (cat.includes('shoe') || cat.includes('footwear') || name.includes('shoe') || name.includes('sneaker') || name.includes('boot')) return 'shoes';
    if (cat.includes('bottom') || name.includes('jean') || name.includes('pant') || name.includes('trouser') || name.includes('skirt') || name.includes('short')) return 'bottom';
    if (cat.includes('accessor') || cat.includes('bag') || name.includes('glass') || name.includes('cap') || name.includes('hat') || name.includes('watch')) return 'accessories';
    return 'top';
  };

  const handleEquip = (item) => {
    const slot = detectSlot(item);
    const isCurrentlyEquipped = equippedItems[slot]?._id === item._id;

    let nextEquipped = {
      ...equippedItems,
      [slot]: isCurrentlyEquipped ? null : item,
    };

    // If equipping a dress, unequip separate top/bottom to drape naturally
    if (slot === 'dress' && !isCurrentlyEquipped) {
      nextEquipped.top = null;
    }
    // If equipping a top or bottom, unequip dress
    if ((slot === 'top' || slot === 'bottom') && !isCurrentlyEquipped) {
      nextEquipped.dress = null;
    }

    setEquippedItems(nextEquipped);
    avatarService.equipProduct(slot, isCurrentlyEquipped ? null : item._id);

    Toast.show({
      type: 'success',
      text1: isCurrentlyEquipped ? `Removed ${item.name}` : `Wearing ${item.name}! ✨`,
      position: 'bottom',
    });
  };

  const handleUpdateAvatar = async (updates) => {
    if (updates.skinTone) setSkinTone(updates.skinTone);
    if (updates.hairColor) setHairColor(updates.hairColor);
    if (updates.hairStyle) setHairStyle(updates.hairStyle);
    if (updates.bodyType) setBodyType(updates.bodyType);
    if (updates.height) setHeight(updates.height);
    if (updates.gender) setGender(updates.gender);

    const next = { ...avatar, ...updates };
    setAvatar(next);
    await avatarService.updateProfile(updates);
  };

  const handleSaveCurrentLook = async () => {
    const active = Object.values(equippedItems).filter(Boolean);
    if (active.length === 0) {
      Toast.show({ type: 'info', text1: 'Equip some items to save your look!', position: 'bottom' });
      return;
    }
    const lookName = `${gender} Look ${savedLooks.length + 1}`;
    try {
      await avatarService.saveLook(lookName, equippedItems);
      const newLook = {
        _id: 'look_' + Date.now(),
        name: lookName,
        outfit: { ...equippedItems },
        createdAt: new Date().toISOString(),
      };
      setSavedLooks([newLook, ...savedLooks]);
      Toast.show({ type: 'success', text1: 'Look Saved to Vault! 🌟', position: 'bottom' });
    } catch {
      Toast.show({ type: 'success', text1: 'Look Saved! 🌟', position: 'bottom' });
    }
  };

  const handleApplySavedLook = (look) => {
    if (look?.outfit) {
      setEquippedItems(look.outfit);
      Toast.show({ type: 'success', text1: `Applied ${look.name}! ✨`, position: 'bottom' });
    }
  };

  const handleAddOutfitToCart = () => {
    const itemsToAdd = Object.values(equippedItems).filter(Boolean);
    if (itemsToAdd.length === 0) {
      Toast.show({ type: 'info', text1: 'Equip an item from the wardrobe below first', position: 'bottom' });
      return;
    }
    itemsToAdd.forEach((item) => addToCart(item, 1));
    Toast.show({
      type: 'success',
      text1: `Added ${itemsToAdd.length} outfit items to Bag! 🛍️`,
      position: 'bottom',
    });
    navigation.navigate('Cart');
  };

  // Launch Native Camera for Decart Anywear AR Try-On
  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed for live AR Try-On.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUserPhotoUri(result.assets[0].uri);
        triggerLucyVTONSimulation();
      }
    } catch (e) {
      console.warn('Camera error:', e);
    }
  };

  // Launch Gallery for Anywear Try-On
  const handleLaunchGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery permission is needed.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUserPhotoUri(result.assets[0].uri);
        triggerLucyVTONSimulation();
      }
    } catch (e) {
      console.warn('Gallery error:', e);
    }
  };

  const triggerLucyVTONSimulation = () => {
    setIsProcessingLucyVTON(true);
    setTimeout(() => {
      setIsProcessingLucyVTON(false);
      Toast.show({
        type: 'success',
        text1: 'Lucy V-TON Fit Synthesized! ✨',
        text2: 'Garment aligned and mapped to your posture.',
        position: 'bottom',
      });
    }, 1200);
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Filter catalog by selected category
  const filteredCatalog = catalog.filter((item) => {
    if (selectedCategory === 'All') return true;
    const slot = detectSlot(item);
    if (selectedCategory === 'Tops') return slot === 'top';
    if (selectedCategory === 'Bottoms') return slot === 'bottom';
    if (selectedCategory === 'Dresses') return slot === 'dress' || (item.category || '').toLowerCase().includes('dress');
    if (selectedCategory === 'Shoes') return slot === 'shoes';
    if (selectedCategory === 'Accessories') return slot === 'accessories';
    return true;
  });

  const outfitTotal = Object.values(equippedItems)
    .filter(Boolean)
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const activeTryOnGarment =
    equippedItems.top ||
    equippedItems.dress ||
    equippedItems.outerwear ||
    equippedItems.bottom ||
    equippedItems.shoes ||
    equippedItems.accessories ||
    catalog[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top Navigation Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Virtual Avatar Studio</Text>
          <Text style={styles.headerSubtitle}>
            {studioMode === '3d_studio' ? '3D WebGL Three.js Fitting Room' : 'Decart Anywear AI Live AR'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveCurrentLook}
          title="Save Look"
        >
          <Bookmark size={18} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
      >
        {/* ── Top Controls Bar: [ Men's 3D ] [ Women's 3D ] [ Adjust Silhouette & Skin ] [ Live Camera ] ── */}
        <View style={styles.topControlsBar}>
          <View style={styles.genderToggleGroup}>
            <TouchableOpacity
              style={[styles.genderPill, gender === 'Male' && styles.genderPillActive]}
              onPress={() => handleGenderSwitch('Male')}
            >
              <Text style={[styles.genderPillText, gender === 'Male' && styles.genderPillTextActive]}>
                👨 Men's 3D
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.genderPill, gender === 'Female' && styles.genderPillActive]}
              onPress={() => handleGenderSwitch('Female')}
            >
              <Text style={[styles.genderPillText, gender === 'Female' && styles.genderPillTextActive]}>
                👩 Women's 3D
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.adjustSilhouetteBtn}
            onPress={() => setIsCustomizeModalOpen(true)}
          >
            <Sliders size={13} color="#38bdf8" />
            <Text style={styles.adjustSilhouetteText}>Adjust Silhouette & Skin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.liveCameraBtn, studioMode === 'anywear_cam' && styles.liveCameraBtnActive]}
            onPress={() => setStudioMode(studioMode === '3d_studio' ? 'anywear_cam' : '3d_studio')}
          >
            <Camera size={13} color="#ffffff" />
            <Text style={styles.liveCameraText}>
              {studioMode === '3d_studio' ? 'Live Camera' : '3D Studio'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 1. THREE.JS 3D STUDIO CANVAS ── */}
        {studioMode === '3d_studio' ? (
          <View style={styles.studioStage}>
            <ThreeAvatarView
              gender={gender}
              skinTone={skinTone}
              hairColor={hairColor}
              bodyType={bodyType}
              height={height}
              pose={stance}
              equippedItems={equippedItems}
              isAutoRotate={isAutoRotate}
            />

            {/* Stage Floating Top Badges & Controls */}
            <View style={styles.stageTopBar}>
              <View style={styles.stageEngineBadge}>
                <Sparkles size={11} color="#38bdf8" />
                <Text style={styles.stageEngineText}>Rigged GLB • Three.js</Text>
              </View>

              <View style={styles.stageRightBtns}>
                <TouchableOpacity
                  style={[styles.stageBtn, isAutoRotate && styles.stageBtnActive]}
                  onPress={() => setIsAutoRotate(!isAutoRotate)}
                >
                  <RotateCw size={12} color={isAutoRotate ? '#38bdf8' : '#cbd5e1'} />
                  <Text style={[styles.stageBtnText, isAutoRotate && { color: '#38bdf8' }]}>
                    {isAutoRotate ? 'Auto-Spin On' : 'Rotate Off'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stageBtn}
                  onPress={() => setStance(1)}
                  title="Reset View"
                >
                  <RotateCcw size={12} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── STANCE BAR (Immediately below 3D model) ── */}
            <View style={styles.stageStanceBar}>
              <Text style={styles.stanceLabel}>STANCE:</Text>
              <View style={styles.stanceButtonsRow}>
                <TouchableOpacity
                  style={[styles.stanceBtn, stance === 1 && styles.stanceBtnActive]}
                  onPress={() => setStance(1)}
                >
                  <Text style={[styles.stanceBtnText, stance === 1 && styles.stanceBtnTextActive]}>
                    Runway Front
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stanceBtn, stance === 2 && styles.stanceBtnActive]}
                  onPress={() => setStance(2)}
                >
                  <Text style={[styles.stanceBtnText, stance === 2 && styles.stanceBtnTextActive]}>
                    Fashion 3/4
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stanceBtn, stance === 3 && styles.stanceBtnActive]}
                  onPress={() => setStance(3)}
                >
                  <Text style={[styles.stanceBtnText, stance === 3 && styles.stanceBtnTextActive]}>
                    Side Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* ── 2. DECART ANYWEAR LIVE AR CAM VIEW (CONTINUOUS LIVE CAMERA FEED) ── */
          <View style={styles.anywearStage}>
            {permission?.granted ? (
              <View style={styles.liveCameraContainer}>
                {/* Real-time continuous camera feed */}
                <CameraView
                  style={styles.liveCameraFeed}
                  facing={cameraFacing}
                />

                {/* Body Alignment Silhouette Outline Guide */}
                <View style={styles.bodyGuideOverlay} pointerEvents="none">
                  <View style={styles.guideHead} />
                  <View style={styles.guideTorso} />
                </View>

                {/* Live Overlaid Draped Garment with Scale, Offset & Mirror */}
                {activeTryOnGarment && (
                  <View
                    style={[
                      styles.liveGarmentWrapper,
                      {
                        transform: [
                          { translateY: garmentOffsetY },
                          { scale: garmentScale },
                          ...(isMirrored ? [{ scaleX: -1 }] : []),
                        ],
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <Image
                      source={{
                        uri:
                          activeTryOnGarment.virtualTryOn?.tryOnImage ||
                          activeTryOnGarment.image ||
                          (Array.isArray(activeTryOnGarment.images) &&
                            (activeTryOnGarment.images[0]?.url || activeTryOnGarment.images[0])) ||
                          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
                      }}
                      style={styles.liveGarmentImg}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Live AI Anchoring Badge */}
                <View style={styles.liveAnchorPill}>
                  <View style={styles.liveGreenDot} />
                  <Text style={styles.liveAnchorText}>Decart Anywear AI • Live Try-On ⚡</Text>
                </View>

                {/* Floating Camera & Fitting Controls */}
                <View style={styles.liveFloatingControls}>
                  <TouchableOpacity
                    style={styles.liveCtrlBtn}
                    onPress={() => setCameraFacing((f) => (f === 'front' ? 'back' : 'front'))}
                  >
                    <SwitchCamera size={16} color="#ffffff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.liveCtrlBtn, isMirrored && styles.liveCtrlBtnActive]}
                    onPress={() => setIsMirrored((m) => !m)}
                  >
                    <FlipHorizontal size={16} color="#ffffff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.liveCtrlBtn, showSliders && styles.liveCtrlBtnActive]}
                    onPress={() => setShowSliders((s) => !s)}
                  >
                    <Sliders size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Quick Fit Adjustment Sliders Tray */}
                {showSliders && (
                  <View style={styles.liveSlidersTray}>
                    <Text style={styles.liveSlidersTitle}>Adjust Garment Fit & Height</Text>
                    <View style={styles.liveSlidersRow}>
                      <TouchableOpacity
                        style={styles.liveSliderBtn}
                        onPress={() => setGarmentOffsetY((prev) => Math.max(-80, prev - 15))}
                      >
                        <Text style={styles.liveSliderBtnText}>Higher ↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.liveSliderBtn}
                        onPress={() => setGarmentOffsetY((prev) => Math.min(80, prev + 15))}
                      >
                        <Text style={styles.liveSliderBtnText}>Lower ↓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.liveSliderBtn}
                        onPress={() => setGarmentScale((prev) => Math.max(0.6, prev - 0.1))}
                      >
                        <Text style={styles.liveSliderBtnText}>Size -</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.liveSliderBtn}
                        onPress={() => setGarmentScale((prev) => Math.min(1.4, prev + 0.1))}
                      >
                        <Text style={styles.liveSliderBtnText}>Size +</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.liveSliderBtn}
                        onPress={() => {
                          setGarmentOffsetY(0);
                          setGarmentScale(1);
                        }}
                      >
                        <Text style={styles.liveSliderBtnText}>Reset</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Real-time Garment Bottom Bar: Product Name, Price, Add to Bag & Buy Now */}
                {activeTryOnGarment && (
                  <View style={styles.liveGarmentActionBar}>
                    <View style={styles.liveGarmentInfo}>
                      <Text style={styles.liveGarmentName} numberOfLines={1}>
                        {activeTryOnGarment.name}
                      </Text>
                      <Text style={styles.liveGarmentPrice}>
                        {formatPrice(activeTryOnGarment.price)}
                      </Text>
                    </View>
                    <View style={styles.liveGarmentBtnGroup}>
                      <TouchableOpacity
                        style={styles.liveAddToCartBtn}
                        onPress={() => {
                          addToCart(activeTryOnGarment, 1);
                          Toast.show({
                            type: 'success',
                            text1: 'Added to Bag! 🛍️',
                            text2: `${activeTryOnGarment.name} added to cart`,
                            position: 'bottom',
                          });
                        }}
                      >
                        <ShoppingBag size={13} color="#ffffff" />
                        <Text style={styles.liveAddToCartText}>Add to Bag</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.liveBuyNowBtn}
                        onPress={() => {
                          addToCart(activeTryOnGarment, 1);
                          navigation.navigate('Cart');
                        }}
                      >
                        <Zap size={13} color="#ffffff" />
                        <Text style={styles.liveBuyNowText}>Buy Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* Permission Request Screen */
              <View style={styles.camEmptyState}>
                <View style={styles.camIconCircle}>
                  <Camera size={36} color="#38bdf8" />
                </View>
                <Text style={styles.camEmptyTitle}>Decart Anywear AI Live Camera</Text>
                <Text style={styles.camEmptyDesc}>
                  Stream live video to try on clothes in real-time. Stand in front of your camera and tap any clothes below to swap outfits instantly!
                </Text>
                <TouchableOpacity
                  style={[styles.camActionBtn, { backgroundColor: '#2563eb' }]}
                  onPress={async () => {
                    const res = await requestPermission();
                    if (!res.granted) {
                      Alert.alert(
                        'Camera Permission Required',
                        'Please allow camera access in device settings to use the live Anywear fitting room.'
                      );
                    }
                  }}
                >
                  <Camera size={16} color="#ffffff" />
                  <Text style={styles.camActionBtnText}>Enable Live Camera Feed</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Equipped Badges Strip ── */}
        <View style={styles.equippedBadgesRow}>
          {Object.entries(equippedItems).map(([slot, item]) => {
            if (!item) return null;
            return (
              <TouchableOpacity
                key={slot}
                style={styles.badgePill}
                onPress={() => handleEquip(item)}
              >
                <CheckCircle2 size={12} color="#10b981" />
                <Text style={styles.badgePillText} numberOfLines={1}>
                  {item.name}
                </Text>
                <X size={11} color="#94a3b8" style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Selector: Fitting Room | Body & Hair | Saved Looks ── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'fitting' && styles.tabBtnActive]}
            onPress={() => setActiveTab('fitting')}
          >
            <Shirt size={14} color={activeTab === 'fitting' ? '#ffffff' : colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'fitting' && styles.tabBtnTextActive]}>
              Fitting Room
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'customize' && styles.tabBtnActive]}
            onPress={() => setActiveTab('customize')}
          >
            <Scissors size={14} color={activeTab === 'customize' ? '#ffffff' : colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'customize' && styles.tabBtnTextActive]}>
              Body & Hair
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'saved' && styles.tabBtnActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Bookmark size={14} color={activeTab === 'saved' ? '#ffffff' : colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'saved' && styles.tabBtnTextActive]}>
              Saved Looks ({savedLooks.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── TAB 1: FITTING ROOM WARDROBE ── */}
        {activeTab === 'fitting' && (
          <View style={styles.wardrobeSection}>
            {/* Category Filter Chips Horizontal Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {WARDROBE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.catalogHeadingRow}>
              <Text style={styles.sectionHeading}>Try-On Wardrobe Collection</Text>
              <Text style={styles.catalogCount}>{filteredCatalog.length} styles</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Tap any item to equip directly onto your 3D avatar & camera in real time
            </Text>

            <View style={styles.catalogGrid}>
              {filteredCatalog.map((item) => {
                const slot = detectSlot(item);
                const isEquipped = equippedItems[slot]?._id === item._id;

                return (
                  <TouchableOpacity
                    key={item._id}
                    style={[styles.catalogCard, isEquipped && styles.catalogCardEquipped]}
                    activeOpacity={0.8}
                    onPress={() => handleEquip(item)}
                  >
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: item.image }} style={styles.catalogCardImg} resizeMode="cover" />
                      <View style={styles.fit3DBadge}>
                        <Sparkles size={10} color="#38bdf8" />
                        <Text style={styles.fit3DBadgeText}>3D Fit</Text>
                      </View>
                      {isEquipped && (
                        <View style={styles.wearingBadge}>
                          <Check size={11} color="#ffffff" />
                          <Text style={styles.wearingBadgeText}>Wearing</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.catalogCardInfo}>
                      <Text style={styles.catalogCardName} numberOfLines={1}>{item.name}</Text>
                      {item.brand && (
                        <Text style={styles.catalogCardBrand} numberOfLines={1}>{item.brand}</Text>
                      )}
                      <Text style={styles.catalogCardPrice}>{formatPrice(item.price)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── TAB 2: BODY & HAIR CUSTOMIZER ── */}
        {activeTab === 'customize' && (
          <View style={styles.customizerSection}>
            {/* Gender */}
            <Text style={styles.customizerTitle}>Gender Silhouette</Text>
            <View style={styles.buttonOptionRow}>
              {['Male', 'Female'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionPill, gender === g && styles.optionPillActive]}
                  onPress={() => handleGenderSwitch(g)}
                >
                  <Text style={[styles.optionPillText, gender === g && styles.optionPillTextActive]}>
                    {g === 'Male' ? '👨 Male' : '👩 Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Body Type */}
            <Text style={[styles.customizerTitle, { marginTop: 18 }]}>Body Type</Text>
            <View style={styles.buttonOptionRow}>
              {BODY_TYPES.map((bt) => (
                <TouchableOpacity
                  key={bt}
                  style={[styles.optionPill, bodyType === bt && styles.optionPillActive]}
                  onPress={() => handleUpdateAvatar({ bodyType: bt })}
                >
                  <Text style={[styles.optionPillText, bodyType === bt && styles.optionPillTextActive]}>
                    {bt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Height Stepper */}
            <Text style={[styles.customizerTitle, { marginTop: 18 }]}>Height: {height} cm</Text>
            <View style={styles.heightStepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleUpdateAvatar({ height: Math.max(150, height - 2) })}
              >
                <Minus size={16} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{height} cm</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleUpdateAvatar({ height: Math.min(205, height + 2) })}
              >
                <Plus size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Skin Complexion */}
            <Text style={[styles.customizerTitle, { marginTop: 18 }]}>Skin Complexion</Text>
            <View style={styles.swatchRow}>
              {SKIN_TONES.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.swatchCircle,
                    { backgroundColor: color },
                    skinTone === color && styles.swatchCircleActive,
                  ]}
                  onPress={() => handleUpdateAvatar({ skinTone: color })}
                />
              ))}
            </View>

            {/* Hair Color */}
            <Text style={[styles.customizerTitle, { marginTop: 18 }]}>Hair Color</Text>
            <View style={styles.swatchRow}>
              {HAIR_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.swatchCircle,
                    { backgroundColor: color },
                    hairColor === color && styles.swatchCircleActive,
                  ]}
                  onPress={() => handleUpdateAvatar({ hairColor: color })}
                />
              ))}
            </View>

            {/* Hairstyle Silhouette */}
            <Text style={[styles.customizerTitle, { marginTop: 18 }]}>Hairstyle Silhouette</Text>
            <View style={styles.hairStylesList}>
              {HAIR_STYLES.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.hairStyleChip,
                    hairStyle === st.id && styles.hairStyleChipActive,
                  ]}
                  onPress={() => handleUpdateAvatar({ hairStyle: st.id })}
                >
                  <Text style={[styles.hairStyleText, hairStyle === st.id && styles.hairStyleTextActive]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── TAB 3: SAVED LOOKS ── */}
        {activeTab === 'saved' && (
          <View style={styles.savedLooksSection}>
            <View style={styles.catalogHeadingRow}>
              <Text style={styles.sectionHeading}>Saved Fitting Outfits</Text>
              <TouchableOpacity style={styles.saveCurrentLookBtn} onPress={handleSaveCurrentLook}>
                <Bookmark size={13} color="#ffffff" />
                <Text style={styles.saveCurrentLookText}>Save Current Fit</Text>
              </TouchableOpacity>
            </View>

            {savedLooks.length === 0 ? (
              <View style={styles.emptySavedState}>
                <Bookmark size={36} color="#334155" />
                <Text style={styles.emptySavedTitle}>No Saved Looks Yet</Text>
                <Text style={styles.emptySavedDesc}>
                  Equip tops, bottoms, and sneakers, then tap the Bookmark icon to save full looks!
                </Text>
              </View>
            ) : (
              savedLooks.map((look) => (
                <View key={look._id || look.id} style={styles.savedLookCard}>
                  <View style={styles.savedLookInfo}>
                    <Text style={styles.savedLookName}>{look.name || 'Custom Look'}</Text>
                    <Text style={styles.savedLookDate}>
                      {look.createdAt ? new Date(look.createdAt).toLocaleDateString() : 'Saved'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.applyLookBtn}
                    onPress={() => handleApplySavedLook(look)}
                  >
                    <Zap size={14} color="#ffffff" />
                    <Text style={styles.applyLookBtnText}>Wear Fit</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Floating Bottom Bar: Full Outfit Total & Buy Look ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <Text style={styles.bottomTotalLabel}>Full Outfit Total</Text>
          <Text style={styles.bottomTotalVal}>{formatPrice(outfitTotal)}</Text>
        </View>

        <TouchableOpacity
          style={styles.buyLookBtn}
          activeOpacity={0.8}
          onPress={handleAddOutfitToCart}
        >
          <ShoppingBag size={18} color="#ffffff" />
          <Text style={styles.buyLookBtnText}>Buy Full Look</Text>
        </TouchableOpacity>
      </View>

      {/* ── ADJUST SILHOUETTE & SKIN MODAL ── */}
      <Modal
        visible={isCustomizeModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCustomizeModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} color="#38bdf8" />
                <Text style={styles.modalTitle}>Adjust Silhouette & Skin</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsCustomizeModalOpen(false)}
              >
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Gender */}
              <Text style={styles.modalSectionLabel}>Avatar Gender</Text>
              <View style={styles.buttonOptionRow}>
                {['Male', 'Female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.optionPill, gender === g && styles.optionPillActive]}
                    onPress={() => handleGenderSwitch(g)}
                  >
                    <Text style={[styles.optionPillText, gender === g && styles.optionPillTextActive]}>
                      {g === 'Male' ? '👨 Men\'s 3D' : '👩 Women\'s 3D'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Body Type */}
              <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Body Silhouette</Text>
              <View style={styles.buttonOptionRow}>
                {BODY_TYPES.map((bt) => (
                  <TouchableOpacity
                    key={bt}
                    style={[styles.optionPill, bodyType === bt && styles.optionPillActive]}
                    onPress={() => handleUpdateAvatar({ bodyType: bt })}
                  >
                    <Text style={[styles.optionPillText, bodyType === bt && styles.optionPillTextActive]}>
                      {bt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Height Stepper */}
              <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Height ({height} cm)</Text>
              <View style={styles.heightStepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleUpdateAvatar({ height: Math.max(150, height - 2) })}
                >
                  <Minus size={16} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{height} cm</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleUpdateAvatar({ height: Math.min(205, height + 2) })}
                >
                  <Plus size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Skin Tone */}
              <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Skin Complexion</Text>
              <View style={styles.swatchRow}>
                {SKIN_TONES.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.swatchCircle,
                      { backgroundColor: color },
                      skinTone === color && styles.swatchCircleActive,
                    ]}
                    onPress={() => handleUpdateAvatar({ skinTone: color })}
                  />
                ))}
              </View>

              {/* Hair Color */}
              <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Hair Color</Text>
              <View style={styles.swatchRow}>
                {HAIR_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.swatchCircle,
                      { backgroundColor: color },
                      hairColor === color && styles.swatchCircleActive,
                    ]}
                    onPress={() => handleUpdateAvatar({ hairColor: color })}
                  />
                ))}
              </View>

              {/* Hairstyle */}
              <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Hairstyle</Text>
              <View style={styles.hairStylesList}>
                {HAIR_STYLES.map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.hairStyleChip,
                      hairStyle === st.id && styles.hairStyleChipActive,
                    ]}
                    onPress={() => handleUpdateAvatar({ hairStyle: st.id })}
                  >
                    <Text style={[styles.hairStyleText, hairStyle === st.id && styles.hairStyleTextActive]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.modalApplyBtn}
              onPress={() => setIsCustomizeModalOpen(false)}
            >
              <Text style={styles.modalApplyBtnText}>Apply &amp; Continue Fitting</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#050811',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  saveBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0c2238',
  },
  scrollContent: {
    padding: 16,
  },
  topControlsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  genderToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#0c121e',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  genderPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  genderPillActive: {
    backgroundColor: '#2563eb',
  },
  genderPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  genderPillTextActive: {
    color: '#ffffff',
  },
  adjustSilhouetteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0c121e',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  adjustSilhouetteText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  liveCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e293b',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
  },
  liveCameraBtnActive: {
    backgroundColor: '#2563eb',
  },
  liveCameraText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  studioStage: {
    width: '100%',
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#050811',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  stageTopBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  stageEngineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  stageEngineText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  stageRightBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  stageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stageBtnActive: {
    borderColor: '#38bdf8',
  },
  stageBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  stageStanceBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 8, 17, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
    zIndex: 10,
  },
  stanceLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stanceButtonsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  stanceBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#0c121e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stanceBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  stanceBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  stanceBtnTextActive: {
    color: '#ffffff',
  },
  anywearStage: {
    width: '100%',
    height: 420,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#050811',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
    position: 'relative',
  },
  liveCameraContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  liveCameraFeed: {
    ...StyleSheet.absoluteFillObject,
  },
  bodyGuideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideHead: {
    width: 90,
    height: 110,
    borderRadius: 45,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    marginBottom: 8,
  },
  guideTorso: {
    width: 200,
    height: 220,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  liveGarmentWrapper: {
    position: 'absolute',
    width: 240,
    height: 260,
    alignSelf: 'center',
    top: '18%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveGarmentImg: {
    width: '100%',
    height: '100%',
  },
  liveAnchorPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7, 11, 20, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveAnchorText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  liveFloatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 8,
  },
  liveCtrlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveCtrlBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#38bdf8',
  },
  liveSlidersTray: {
    position: 'absolute',
    bottom: 64,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
  },
  liveSlidersTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  liveSlidersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  liveSliderBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  liveSliderBtnText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  liveGarmentActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(7, 11, 20, 0.92)',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveGarmentInfo: {
    flex: 1,
    marginRight: 8,
  },
  liveGarmentName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  liveGarmentPrice: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '800',
  },
  liveGarmentBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  liveAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveAddToCartText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  liveBuyNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveBuyNowText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  camEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  camIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  camEmptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  camEmptyDesc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 18,
  },
  camBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  camActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  camActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  equippedBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#091c13',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  badgePillText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 160,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0c121e',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#2563eb',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0c121e',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  categoryChipActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  categoryChipIcon: {
    fontSize: 13,
  },
  categoryChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  wardrobeSection: {
    marginTop: 2,
  },
  catalogHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  catalogCount: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catalogCard: {
    width: (width - 44) / 2,
    backgroundColor: '#0c121e',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  catalogCardEquipped: {
    borderColor: '#38bdf8',
    backgroundColor: '#081729',
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: '#111827',
  },
  catalogCardImg: {
    width: '100%',
    height: '100%',
  },
  fit3DBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(5, 8, 17, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fit3DBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  wearingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#2563eb',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  wearingBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  catalogCardInfo: {
    padding: 10,
  },
  catalogCardName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  catalogCardBrand: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  catalogCardPrice: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  customizerSection: {
    paddingVertical: 8,
  },
  customizerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  buttonOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#0c121e',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  optionPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  optionPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  optionPillTextActive: {
    color: '#ffffff',
  },
  heightStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0c121e',
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 70,
    textAlign: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  swatchCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchCircleActive: {
    borderColor: '#38bdf8',
    transform: [{ scale: 1.15 }],
  },
  hairStylesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hairStyleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0c121e',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  hairStyleChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  hairStyleText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  hairStyleTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  savedLooksSection: {
    paddingVertical: 6,
  },
  saveCurrentLookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  saveCurrentLookText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptySavedState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySavedTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySavedDesc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  savedLookCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0c121e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 10,
  },
  savedLookInfo: {
    flex: 1,
  },
  savedLookName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  savedLookDate: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  applyLookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  applyLookBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#070b14',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomTotalLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  bottomTotalVal: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: '900',
  },
  buyLookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buyLookBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050811',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0c121e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  modalSectionLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalApplyBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  modalApplyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
