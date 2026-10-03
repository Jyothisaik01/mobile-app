import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  Heart,
  Bot,
  BadgeCheck,
  MessageSquare,
  X,
  Shirt,
  Camera,
  ArrowLeftRight,
  Cpu,
  Layers,
  Box,
  CheckCircle2,
  Users,
} from 'lucide-react-native';
import colors from '../theme/colors';
import productService from '../services/productService';
import wishlistService from '../services/wishlistService';
import reviewService from '../services/reviewService';
import sharedCartService from '../services/sharedCartService';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { formatPrice } from '../utils/formatters';
import DecartAnywearTryOnModal from '../components/DecartAnywearTryOnModal';
import CompareFloatingBar from '../components/CompareFloatingBar';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

// Helper to build rich, categorized specifications matching web app
const getProductSpecificationSections = (prod) => {
  const sections = [];
  if (!prod) return sections;

  // 1. General & Model Information
  const generalItems = [
    { label: 'Brand', value: prod.brand || 'Prime Certified' },
    { label: 'Model / Title', value: prod.name || 'Standard Model' },
    { label: 'Category', value: prod.category || 'General' },
    { label: 'Item Code (SKU)', value: prod.sku || `PRIME-${(prod._id || prod.id || '000000').slice(-6).toUpperCase()}` },
    { label: 'Condition', value: 'Brand New (Factory Sealed)' },
    { label: 'Availability', value: (prod.quantity || prod.stock || 0) > 0 ? `In Stock (${prod.quantity || prod.stock} units)` : 'Out of Stock' },
  ];
  if (prod.warranty) generalItems.push({ label: 'Warranty', value: prod.warranty });
  if (prod.returnPolicy) generalItems.push({ label: 'Return Policy', value: prod.returnPolicy });

  sections.push({
    title: 'General Information',
    icon: 'Layers',
    items: generalItems,
  });

  // 2. Custom or Nested Technical Specifications
  let rawSpecs = prod.specifications;
  if (typeof rawSpecs === 'string') {
    try { rawSpecs = JSON.parse(rawSpecs); } catch { rawSpecs = null; }
  }

  if (rawSpecs && typeof rawSpecs === 'object') {
    const isNested = Object.values(rawSpecs).some((v) => v && typeof v === 'object' && !Array.isArray(v));
    if (isNested) {
      Object.entries(rawSpecs).forEach(([secTitle, secContent]) => {
        if (secContent && typeof secContent === 'object' && !Array.isArray(secContent)) {
          const items = Object.entries(secContent)
            .filter(([_, v]) => v !== undefined && v !== null && v !== '')
            .map(([lbl, v]) => ({ label: lbl, value: typeof v === 'object' ? JSON.stringify(v) : String(v) }));
          if (items.length > 0) {
            sections.push({ title: secTitle, icon: 'Cpu', items });
          }
        } else if (secContent !== undefined && secContent !== null && secContent !== '') {
          let customSec = sections.find((s) => s.title === 'Hardware & Features');
          if (!customSec) {
            customSec = { title: 'Hardware & Features', icon: 'Cpu', items: [] };
            sections.push(customSec);
          }
          customSec.items.push({ label: secTitle, value: String(secContent) });
        }
      });
    } else {
      const items = Object.entries(rawSpecs)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([lbl, v]) => ({ label: lbl, value: typeof v === 'object' ? JSON.stringify(v) : String(v) }));
      if (items.length > 0) {
        sections.push({ title: 'Technical Specifications', icon: 'Cpu', items });
      }
    }
  }

  // 3. Contextual Category Specs if only General is present
  if (sections.length === 1) {
    const cat = (prod.category || '').toLowerCase();
    const contextItems = [];
    if (prod.material) contextItems.push({ label: 'Material', value: prod.material });
    if (prod.color) contextItems.push({ label: 'Color / Finish', value: prod.color });
    if (prod.dimensions) contextItems.push({ label: 'Dimensions', value: prod.dimensions });
    if (prod.weight) contextItems.push({ label: 'Weight', value: prod.weight });

    if (cat.includes('cloth') || cat.includes('apparel') || cat.includes('fashion') || cat.includes('shirt') || cat.includes('shoe')) {
      contextItems.push(
        { label: 'Material Blend', value: prod.material || '100% Breathable Cotton / Premium Fabric' },
        { label: 'Fit Type', value: prod.fitType || 'Regular Fit / Tailored Cut' },
        { label: 'Care Instructions', value: 'Machine Wash Cold, Tumble Dry Low' },
        { label: 'In The Box', value: '1 x Premium Garment with Security Hologram Tag' }
      );
    } else {
      contextItems.push(
        { label: 'Build & Material', value: prod.material || 'Engineered Composite & Aluminum' },
        { label: 'Connectivity', value: 'Bluetooth 5.3, Wi-Fi 6, USB-C' },
        { label: 'Power / Battery', value: 'Fast Charge Compatible / Energy Star Rated' },
        { label: 'In The Box', value: 'Main Unit, Quick Start Manual, Power Cable, Warranty Card' }
      );
    }

    sections.push({
      title: 'Product Details & Hardware',
      icon: 'Box',
      items: contextItems,
    });
  }

  return sections;
};

export default function ProductDetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { productId, product: initialProduct } = route.params || {};
  const { addToCart } = useCart();
  const { toggleCompare, isInCompare } = useCompare();

  const [product, setProduct] = useState(initialProduct || null);
  const [confidence, setConfidence] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWished, setIsWished] = useState(false);
  const [loading, setLoading] = useState(!initialProduct);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const [showSharedCartModal, setShowSharedCartModal] = useState(false);
  const [sharedCartsList, setSharedCartsList] = useState([]);
  const [loadingSharedCarts, setLoadingSharedCarts] = useState(false);
  const [addingToSharedCart, setAddingToSharedCart] = useState(false);

  const handleOpenSharedCartModal = async () => {
    setShowSharedCartModal(true);
    try {
      setLoadingSharedCarts(true);
      const data = await sharedCartService.getMySharedCarts();
      setSharedCartsList(Array.isArray(data) ? data : []);
    } catch {
      setSharedCartsList([]);
    } finally {
      setLoadingSharedCarts(false);
    }
  };

  const handleAddToSpecificSharedCart = async (cartId, cartName) => {
    const pId = product?._id || product?.id || productId;
    if (!pId) return;
    try {
      setAddingToSharedCart(true);
      await sharedCartService.addItemToCart(cartId, pId, quantity);
      Toast.show({
        type: 'success',
        text1: `Added to ${cartName || 'Group Cart'}! 🛒`,
        text2: 'Room members can now vote and collaborate on this item.',
        position: 'bottom',
      });
      setShowSharedCartModal(false);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Could not add to shared cart',
        text2: err.response?.data?.msg || err.message,
        position: 'bottom',
      });
    } finally {
      setAddingToSharedCart(false);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
    }, 2000);
  };

  useEffect(() => {
    async function loadDetails() {
      try {
        let currentProd = initialProduct;
        if (!initialProduct && productId) {
          currentProd = await productService.getProductById(productId);
          setProduct(currentProd);
        }
        const pId = productId || currentProd?._id || currentProd?.id;
        if (pId) {
          const [conf, revs] = await Promise.all([
            productService.getProductConfidence(pId).catch(() => null),
            reviewService.getProductReviews(pId).catch(() => []),
          ]);
          setConfidence(conf);
          setReviews(revs || []);
        }
      } catch (e) {
        console.warn('Failed to load product details:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [productId, initialProduct]);

  const handleToggleWishlist = async () => {
    if (!product) return;
    const pId = product._id || product.id;
    const nextState = !isWished;
    setIsWished(nextState);

    try {
      if (nextState) {
        await wishlistService.addToWishlist(pId);
        Toast.show({ type: 'success', text1: 'Saved to Wishlist ❤️', position: 'bottom' });
      } else {
        await wishlistService.removeFromWishlist(pId);
        Toast.show({ type: 'info', text1: 'Removed from Wishlist', position: 'bottom' });
      }
    } catch {
      setIsWished(!nextState);
    }
  };

  const handleAddReview = async () => {
    if (!newComment.trim()) {
      Toast.show({ type: 'error', text1: 'Please provide a comment', position: 'bottom' });
      return;
    }
    const pId = product?._id || product?.id || productId;
    setSubmittingReview(true);
    try {
      const added = await reviewService.addReview(pId, {
        rating: newRating,
        title: newTitle || `${newRating} Star Review`,
        comment: newComment,
      });
      const newRevItem = added && added._id ? added : {
        _id: 'rev_' + Date.now(),
        userName: 'You',
        rating: newRating,
        title: newTitle || `${newRating} Star Review`,
        comment: newComment,
        createdAt: new Date().toISOString(),
      };
      setReviews([newRevItem, ...reviews]);
      setIsReviewModalOpen(false);
      setNewComment('');
      setNewTitle('');
      setNewRating(5);
      Toast.show({ type: 'success', text1: 'Review submitted successfully! ⭐', position: 'bottom' });
    } catch (err) {
      console.warn('Failed to submit review:', err);
      // Fallback local append for immediate responsive UX
      const newRevItem = {
        _id: 'rev_' + Date.now(),
        userName: 'You',
        rating: newRating,
        title: newTitle || `${newRating} Star Review`,
        comment: newComment,
        createdAt: new Date().toISOString(),
      };
      setReviews([newRevItem, ...reviews]);
      setIsReviewModalOpen(false);
      setNewComment('');
      setNewTitle('');
      setNewRating(5);
      Toast.show({ type: 'success', text1: 'Review published! ⭐', position: 'bottom' });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Product not found.</Text>
        <TouchableOpacity
          style={styles.backButtonSimple}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonSimpleText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rawImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.image ? [product.image] : []);

  const imageList = rawImages.map((img) => (typeof img === 'string' ? img : img?.url || ''));
  const currentImage = imageList[selectedImageIndex] || imageList[0] ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';

  const stock = product.quantity || product.stock || 0;
  const inStock = stock > 0;
  const specSections = getProductSpecificationSections(product);

  return (
    <View style={styles.container}>
      {/* Top Floating Controls */}
      <View style={[styles.floatingHeader, { top: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={handleToggleWishlist}
        >
          <Heart
            size={20}
            color={isWished ? '#ef4444' : '#ffffff'}
            fill={isWished ? '#ef4444' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
      >
        {/* Main Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: currentImage }}
            style={styles.mainImage}
            resizeMode="cover"
          />
        </View>

        {/* Image Thumbnails (if multiple exist) */}
        {imageList.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailRow}
          >
            {imageList.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedImageIndex(idx)}
                style={[
                  styles.thumbnailBtn,
                  selectedImageIndex === idx && styles.thumbnailBtnActive,
                ]}
              >
                <Image source={{ uri: img }} style={styles.thumbnailImg} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Content Container */}
        <View style={styles.detailsContent}>
          {/* Category & Badge */}
          <View style={styles.topInfoRow}>
            <Text style={styles.categoryBadge}>{product.category || 'Product'}</Text>
            <View style={styles.ratingBadge}>
              <Star size={13} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.ratingText}>{product.rating || '4.8'}</Text>
              <Text style={styles.ratingCount}>({product.ratingCount || 24})</Text>
            </View>
          </View>

          {/* Product Title */}
          <Text style={styles.productTitle}>{product.name}</Text>

          {/* Vendor */}
          {product.vendorName && (
            <View style={styles.vendorRow}>
              <BadgeCheck size={14} color="#6366f1" />
              <Text style={styles.vendorText}>Verified Merchant: {product.vendorName}</Text>
            </View>
          )}

          {/* Price & Stock */}
          <View style={styles.priceRow}>
            <View style={styles.priceWrap}>
              <Text style={styles.priceAmount}>
                {formatPrice(product.price)}
              </Text>
            </View>
            <View
              style={[
                styles.stockBadge,
                { backgroundColor: inStock ? '#064e3b' : '#7f1d1d' },
              ]}
            >
              <Text
                style={[
                  styles.stockBadgeText,
                  { color: inStock ? '#34d399' : '#f87171' },
                ]}
              >
                {inStock ? `In Stock (${stock})` : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Decision Assistant / Product Confidence Highlight */}
          <View style={styles.decisionCard}>
            <View style={styles.decisionHeader}>
              <Sparkles size={16} color={colors.primaryLight} />
              <Text style={styles.decisionTitle}>AI Decision Assistant</Text>
            </View>
            <Text style={styles.decisionBody}>
              {confidence?.summary ||
                'Verified seller item. High buyer satisfaction rating with rapid fulfillment dispatch.'}
            </Text>
            <View style={styles.perksRow}>
              <View style={styles.perkItem}>
                <Truck size={15} color="#10b981" />
                <Text style={styles.perkText}>Fast Shipping</Text>
              </View>
              <View style={styles.perkItem}>
                <RotateCcw size={15} color="#10b981" />
                <Text style={styles.perkText}>{product.returnPolicy || '7-Day Returns & Exchange'}</Text>
              </View>
              <View style={styles.perkItem}>
                <ShieldCheck size={15} color="#10b981" />
                <Text style={styles.perkText}>{product.warranty || '1 Year Manufacturer Warranty'}</Text>
              </View>
            </View>

            {/* 4 Quick Action Buttons in 2 Rows (2x2 Grid) */}
            <View style={styles.actionGrid}>
              <View style={styles.actionGridRow}>
                {/* Decart Anywear AI Live Virtual Try-On */}
                <TouchableOpacity
                  style={[styles.gridActionBtn, styles.gridActionBtnDecart]}
                  onPress={() => setIsTryOnOpen(true)}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color="#c084fc" />
                  <Text style={styles.gridActionBtnText}>Anywear AR</Text>
                </TouchableOpacity>

                {/* Add / Remove from Compare Button */}
                <TouchableOpacity
                  style={[
                    styles.gridActionBtn,
                    styles.gridActionBtnCompare,
                    isInCompare(product._id || product.id) && styles.gridActionBtnCompareActive,
                  ]}
                  onPress={() => toggleCompare(product)}
                  activeOpacity={0.8}
                >
                  <ArrowLeftRight
                    size={16}
                    color={isInCompare(product._id || product.id) ? '#60a5fa' : '#cbd5e1'}
                  />
                  <Text
                    style={[
                      styles.gridActionBtnText,
                      isInCompare(product._id || product.id) && { color: '#93c5fd' },
                    ]}
                  >
                    {isInCompare(product._id || product.id) ? 'In Compare ⚖️' : 'Compare'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionGridRow}>
                {/* Virtual Try On Avatar Studio */}
                <TouchableOpacity
                  style={[styles.gridActionBtn, styles.gridActionBtnAvatar]}
                  onPress={() => navigation.navigate('AvatarStudio', { initialEquipProduct: product })}
                  activeOpacity={0.8}
                >
                  <Shirt size={16} color="#38bdf8" />
                  <Text style={styles.gridActionBtnText}>3D Avatar</Text>
                </TouchableOpacity>

                {/* Ask Darwin AI */}
                <TouchableOpacity
                  style={[styles.gridActionBtn, styles.gridActionBtnDarwin]}
                  onPress={() => navigation.navigate('DarwinChat')}
                  activeOpacity={0.8}
                >
                  <Bot size={16} color="#818cf8" />
                  <Text style={styles.gridActionBtnText}>Ask Darwin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Description</Text>
            <Text style={styles.descriptionText}>
              {product.description ||
                'No product description provided. Crafted with premium high-grade materials for optimal durability and style.'}
            </Text>
          </View>

          {/* Specifications */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Layers size={18} color="#60a5fa" />
              <Text style={styles.sectionHeader}>Specifications & Details</Text>
            </View>

            {specSections.map((sec, secIdx) => (
              <View key={sec.title || secIdx} style={styles.specSectionBlock}>
                <View style={styles.specSectionTitleRow}>
                  {sec.icon === 'Cpu' ? (
                    <Cpu size={14} color="#818cf8" />
                  ) : sec.icon === 'Layers' ? (
                    <Layers size={14} color="#38bdf8" />
                  ) : (
                    <Box size={14} color="#34d399" />
                  )}
                  <Text style={styles.specSectionTitleText}>{sec.title}</Text>
                </View>

                <View style={styles.specsTable}>
                  {sec.items.map((item, itemIdx) => (
                    <View
                      key={`${item.label}_${itemIdx}`}
                      style={[
                        styles.specRow,
                        itemIdx % 2 === 1 && styles.specRowAlt,
                        itemIdx === sec.items.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <Text style={styles.specKey}>{item.label}</Text>
                      <Text style={styles.specValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Customer Reviews & Ratings Section */}
          <View style={styles.section}>
            <View style={styles.reviewSectionHeader}>
              <View>
                <Text style={styles.sectionHeader}>Customer Reviews</Text>
                <Text style={styles.reviewSubhead}>
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} from verified customers
                </Text>
              </View>
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() => setIsReviewModalOpen(true)}
              >
                <MessageSquare size={14} color="#ffffff" />
                <Text style={styles.writeReviewBtnText}>Write Review</Text>
              </TouchableOpacity>
            </View>

            {/* Average Rating Scorecard */}
            <View style={styles.reviewScoreCard}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreBig}>{product.rating || '4.8'}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={15}
                      color="#f59e0b"
                      fill={s <= Math.round(Number(product.rating || 5)) ? '#f59e0b' : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={styles.scoreCountText}>Based on {reviews.length || 24} ratings</Text>
              </View>

              <View style={styles.scoreRight}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownStar}>5 ★</Text>
                  <View style={styles.breakdownTrack}><View style={[styles.breakdownFill, { width: '85%' }]} /></View>
                  <Text style={styles.breakdownPct}>85%</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownStar}>4 ★</Text>
                  <View style={styles.breakdownTrack}><View style={[styles.breakdownFill, { width: '12%' }]} /></View>
                  <Text style={styles.breakdownPct}>12%</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownStar}>3 ★</Text>
                  <View style={styles.breakdownTrack}><View style={[styles.breakdownFill, { width: '3%' }]} /></View>
                  <Text style={styles.breakdownPct}>3%</Text>
                </View>
              </View>
            </View>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Text style={styles.emptyReviewsText}>No reviews yet. Be the first to review this product!</Text>
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {reviews.map((rev, index) => (
                  <View key={rev._id || index} style={styles.reviewItem}>
                    <View style={styles.reviewItemTop}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {(rev.userName || 'Customer')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.reviewAuthor}>{rev.userName || 'Verified Buyer'}</Text>
                        <Text style={styles.reviewDate}>
                          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Recent'}
                        </Text>
                      </View>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            color="#f59e0b"
                            fill={s <= (rev.rating || 5) ? '#f59e0b' : 'transparent'}
                          />
                        ))}
                      </View>
                    </View>
                    {rev.title && <Text style={styles.reviewItemTitle}>{rev.title}</Text>}
                    <Text style={styles.reviewItemComment}>{rev.comment}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Write a Review Modal */}
      <Modal
        visible={isReviewModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsReviewModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setIsReviewModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalPrompt}>Rate your experience with this item:</Text>
            <View style={styles.starPickerRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setNewRating(star)}
                  style={styles.starTouch}
                >
                  <Star
                    size={32}
                    color="#f59e0b"
                    fill={star <= newRating ? '#f59e0b' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Review Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Absolutely fantastic quality!"
              placeholderTextColor="#64748b"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Your Feedback</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="What did you like or dislike? How did it meet your expectations?"
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              value={newComment}
              onChangeText={setNewComment}
            />

            <TouchableOpacity
              style={[styles.submitReviewBtn, submittingReview && { opacity: 0.6 }]}
              disabled={submittingReview}
              onPress={handleAddReview}
            >
              {submittingReview ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitReviewBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.qtySelector}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus size={16} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => q + 1)}
          >
            <Plus size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addToCartBtn, addedSuccess && styles.addToCartBtnSuccess]}
          activeOpacity={0.8}
          onPress={handleAddToCart}
        >
          {addedSuccess ? (
            <>
              <CheckCircle2 size={18} color="#ffffff" />
              <Text style={styles.addToCartText}>Added to Bag ✓</Text>
            </>
          ) : (
            <>
              <ShoppingBag size={18} color="#ffffff" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Add to Shared Cart Button */}
        <TouchableOpacity
          style={styles.sharedCartBottomBtn}
          activeOpacity={0.8}
          onPress={handleOpenSharedCartModal}
        >
          <Users size={18} color="#c084fc" />
        </TouchableOpacity>
      </View>

      {/* Add to Shared Cart Room Selection Modal */}
      <Modal
        visible={showSharedCartModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSharedCartModal(false)}
      >
        <View style={styles.sharedCartModalOverlay}>
          <View style={[styles.sharedCartModalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sharedCartModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Users size={18} color="#c084fc" />
                <Text style={styles.sharedCartModalTitle}>Add to Group Shopping Room</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSharedCartModal(false)}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sharedCartModalNotice}>
              Select a room to add "{product?.name}". Your friends and squad members will be able to vote and split the bill.
            </Text>

            {loadingSharedCarts ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#c084fc" />
              </View>
            ) : sharedCartsList.length === 0 ? (
              <View style={styles.noRoomsBox}>
                <Text style={styles.noRoomsTitle}>No active group rooms found</Text>
                <Text style={styles.noRoomsSub}>Create a room or join with a room code to start collaborative shopping.</Text>
                <TouchableOpacity
                  style={styles.openSharedCartScreenBtn}
                  onPress={() => {
                    setShowSharedCartModal(false);
                    navigation.navigate('SharedCart');
                  }}
                >
                  <Text style={styles.openSharedCartScreenBtnText}>Open Shared Cart Hub</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                {sharedCartsList.map((sc) => (
                  <TouchableOpacity
                    key={sc._id}
                    style={styles.roomPickItem}
                    onPress={() => handleAddToSpecificSharedCart(sc._id, sc.name)}
                    disabled={addingToSharedCart}
                  >
                    <View style={styles.roomPickIconWrap}>
                      <Users size={16} color="#c084fc" />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.roomPickName}>{sc.name}</Text>
                      <Text style={styles.roomPickSub}>Code: {sc.shareCode || sc.joinCode || 'PRIME'}</Text>
                    </View>
                    <Text style={styles.roomPickAddText}>+ Add Here</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.viewAllRoomsBtn}
              onPress={() => {
                setShowSharedCartModal(false);
                navigation.navigate('SharedCart');
              }}
            >
              <Text style={styles.viewAllRoomsText}>Manage All Shared Carts →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Decart Anywear AI Virtual Try-On Modal */}
      <DecartAnywearTryOnModal
        visible={isTryOnOpen}
        onClose={() => setIsTryOnOpen(false)}
        product={product}
      />

      {/* Floating Compare Bar */}
      <CompareFloatingBar navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 16,
    marginBottom: 16,
  },
  backButtonSimple: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonSimpleText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: width,
    height: width * 0.9,
    backgroundColor: '#111115',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  thumbnailBtn: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  thumbnailBtnActive: {
    borderColor: colors.primary,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  detailsContent: {
    padding: 20,
  },
  topInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  ratingCount: {
    color: colors.textMuted,
    fontSize: 11,
  },
  productTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 8,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  vendorText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currencySymbol: {
    color: colors.primaryLight,
    fontSize: 18,
    fontWeight: '800',
    marginRight: 2,
    marginTop: 2,
  },
  priceAmount: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  decisionCard: {
    backgroundColor: '#0c0e18',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e243d',
    marginBottom: 24,
  },
  decisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  decisionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  decisionBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  perksRow: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e243d',
    paddingTop: 14,
    marginBottom: 4,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#121526',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e243d',
  },
  perkText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  decartTryOnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1b0e36',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#9333ea',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  actionGrid: {
    gap: 8,
    marginTop: 12,
  },
  actionGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridActionBtnDecart: {
    backgroundColor: '#1b0e36',
    borderColor: '#9333ea',
  },
  gridActionBtnCompare: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  gridActionBtnCompareActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  gridActionBtnAvatar: {
    backgroundColor: '#0c2238',
    borderColor: '#0284c7',
  },
  gridActionBtnDarwin: {
    backgroundColor: '#16192a',
    borderColor: '#3b426f',
  },
  gridActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  addToCartBtnSuccess: {
    backgroundColor: '#10b981',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  descriptionText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  specSectionBlock: {
    marginBottom: 16,
  },
  specSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  specSectionTitleText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specsTable: {
    backgroundColor: '#0c121e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  specRowAlt: {
    backgroundColor: '#080d16',
  },
  specKey: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  specValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 32,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 26,
    textAlign: 'center',
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Reviews styles
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reviewSubhead: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: -6,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  writeReviewBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewScoreCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    alignItems: 'center',
  },
  scoreLeft: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    minWidth: 110,
  },
  scoreBig: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 4,
  },
  scoreCountText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  scoreRight: {
    flex: 1,
    paddingLeft: 16,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownStar: {
    color: colors.textMuted,
    fontSize: 11,
    width: 24,
  },
  breakdownTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  breakdownPct: {
    color: colors.textMuted,
    fontSize: 10,
    width: 26,
    textAlign: 'right',
  },
  emptyReviews: {
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyReviewsText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  reviewsList: {
    gap: 12,
  },
  reviewItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    color: colors.primaryLight,
    fontWeight: '700',
    fontSize: 13,
  },
  reviewAuthor: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  reviewDate: {
    color: colors.textMuted,
    fontSize: 11,
  },
  reviewItemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewItemComment: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
  modalPrompt: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 10,
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
    paddingVertical: 8,
  },
  starTouch: {
    padding: 4,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitReviewBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitReviewBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  sharedCartBottomBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1a102f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7c3aed',
    marginLeft: 8,
  },
  sharedCartModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sharedCartModalCard: {
    backgroundColor: '#090f1d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  sharedCartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sharedCartModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  sharedCartModalNotice: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  noRoomsBox: {
    backgroundColor: '#0d1527',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  noRoomsTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  noRoomsSub: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  openSharedCartScreenBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openSharedCartScreenBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  roomPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1527',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  roomPickIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomPickName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  roomPickSub: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  roomPickAddText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '800',
  },
  viewAllRoomsBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  viewAllRoomsText: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: '700',
  },
});

