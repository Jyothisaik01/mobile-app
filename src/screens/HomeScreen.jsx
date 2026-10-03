import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Sparkles,
  Plus,
  Star,
  ShieldCheck,
  MapPin,
  Heart,
  Bot,
  X,
  Camera,
  Mic,
  Bell,
  CheckCircle2,
  TrendingUp,
  Percent,
  Zap,
  Shirt,
  ArrowLeftRight,
  ArrowRight,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
} from 'lucide-react-native';
import colors from '../theme/colors';
import productService from '../services/productService';
import wishlistService from '../services/wishlistService';
import locationService, { REGIONAL_HUBS } from '../services/locationService';
import notificationService from '../services/notificationService';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { formatPrice } from '../utils/formatters';
import CompareFloatingBar from '../components/CompareFloatingBar';
import VisualSearchModal from '../components/VisualSearchModal';
import VoiceSearchModal from '../components/VoiceSearchModal';
import { BASE_URL } from '../config/api';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

const HERO_BANNERS = [
  {
    _id: 'banner-1',
    tag: 'PREMIUM SELECTION',
    title: 'Great Products, Great Prices',
    subtitle: 'Shop premium quality selections hand-picked from verified vendors across the country',
    badge: 'TOP VALUE',
    image: `${BASE_URL}/banners/banner-slide-1.jpg`,
    actionText: 'Shop Now',
    tagColor: '#38bdf8',
  },
  {
    _id: 'banner-2',
    tag: 'HOME ESSENTIALS',
    title: 'Make Everyday Life Easier',
    subtitle: 'Discover smart kitchen appliances and home essentials crafted to simplify every moment',
    badge: 'SMART LIVING',
    image: `${BASE_URL}/banners/banner-slide-2.jpg`,
    actionText: 'Explore Home',
    tagColor: '#10b981',
  },
  {
    _id: 'banner-3',
    tag: 'TRENDING FASHION',
    title: 'Style for Every You',
    subtitle: 'Express yourself with fresh fashion collections and high quality apparel',
    badge: 'NEW SEASON',
    image: `${BASE_URL}/banners/banner-slide-3.jpg`,
    actionText: 'View Fashion',
    tagColor: '#ec4899',
  },
  {
    _id: 'banner-4',
    tag: 'SMART ELECTRONICS',
    title: 'Upgrade to Smarter Living',
    subtitle: 'Experience modern electronics, audio accessories, and next-generation tech',
    badge: 'NEXT-GEN',
    image: `${BASE_URL}/banners/banner-slide-4.jpg`,
    actionText: 'Explore Tech',
    tagColor: '#f59e0b',
  },
  {
    _id: 'banner-5',
    tag: 'ORGANIC & DAILY',
    title: 'Fresh Choices, Brighter Living',
    subtitle: 'Daily essentials, organic goods, and lifestyle accessories designed for your well-being',
    badge: 'FRESH PICKS',
    image: `${BASE_URL}/banners/banner-slide-5.jpg`,
    actionText: 'Shop Essentials',
    tagColor: '#06b6d4',
  },
  {
    _id: 'banner-6',
    tag: 'MEGA DISCOUNTS',
    title: 'Big Savings, Happier Days',
    subtitle: 'Unbeatable deals and exclusive multi-vendor discounts on trending items',
    badge: 'SUPER SAVINGS',
    image: `${BASE_URL}/banners/banner-slide-6.jpg`,
    actionText: 'Claim Deals',
    tagColor: '#7c3aed',
  },
];

export default function HomeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { toggleCompare, isInCompare } = useCompare();

  // Catalog State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [banners, setBanners] = useState(HERO_BANNERS);

  // Smart Dashboard Picks: 'all', 'best_sellers', 'top_deals', 'express'
  const [activePick, setActivePick] = useState('all');

  // Location / Hub Modal State
  const [selectedHub, setSelectedHub] = useState(REGIONAL_HUBS[0]);
  const [hubsModalVisible, setHubsModalVisible] = useState(false);

  // Search Features: Voice, Visual, Auto-suggest
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [visualModalVisible, setVisualModalVisible] = useState(false);

  // Notifications Badge
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-scroll Banners Ref & Feedback State
  const bannerScrollRef = useRef(null);
  const bannerActiveIndex = useRef(0);
  const [addedItemIds, setAddedItemIds] = useState(new Set());

  // Filter & Sort State
  const [sortBy, setSortBy] = useState('default'); // 'default', 'price_asc', 'price_desc', 'rating', 'newest'
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [filterPriceRange, setFilterPriceRange] = useState('all'); // 'all', 'under1000', '1000to5000', 'above5000'

  const searchTimeoutRef = useRef(null);

  // Fetch products with filters
  const fetchProducts = useCallback(async (pageNum = 1, cat = selectedCategory, search = searchQuery, pick = activePick, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);

      const params = {
        page: pageNum,
        limit: 20,
      };

      if (cat && cat !== 'All') {
        params.category = cat;
      }
      if (search && search.trim()) {
        params.q = search.trim();
      }
      if (pick === 'best_sellers') {
        params.sortBy = 'best_sellers';
      } else if (pick === 'top_deals') {
        params.sortBy = 'discount_desc';
      }

      const res = await productService.getProducts(params);
      let items = Array.isArray(res) ? res : res?.items || res?.products || [];

      if (pick === 'express') {
        items = items.filter((p) => p.quantity > 10 || p.price > 100);
      }

      // Apply client-side Filter rules
      if (filterInStockOnly) {
        items = items.filter((p) => (p.quantity || p.stock || 0) > 0);
      }
      if (filterPriceRange === 'under1000') {
        items = items.filter((p) => (p.price || 0) < 1000);
      } else if (filterPriceRange === '1000to5000') {
        items = items.filter((p) => (p.price || 0) >= 1000 && (p.price || 0) <= 5000);
      } else if (filterPriceRange === 'above5000') {
        items = items.filter((p) => (p.price || 0) > 5000);
      }

      // Apply client-side Sort rules
      if (sortBy === 'price_asc') {
        items.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (sortBy === 'price_desc') {
        items.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (sortBy === 'rating') {
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortBy === 'newest') {
        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }

      const total = res?.total || items.length;
      const pages = res?.totalPages || Math.ceil(total / 20) || 1;

      if (pageNum === 1) {
        setProducts(items);
      } else {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p._id || p.id));
          const newItems = items.filter((p) => !existingIds.has(p._id || p.id));
          return [...prev, ...newItems];
        });
      }

      setPage(pageNum);
      setTotalPages(pages);
      setTotalCount(total);
    } catch (err) {
      console.warn('Error fetching products:', err?.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery, activePick, sortBy, filterInStockOnly, filterPriceRange]);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const [catsRes, wishRes, banRes, notifRes] = await Promise.allSettled([
          productService.getCategories(),
          wishlistService.getWishlist(),
          productService.getBanners(),
          notificationService.getNotifications(),
        ]);

        if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value)) {
          setCategories(['All', ...catsRes.value]);
        }

        if (wishRes.status === 'fulfilled' && Array.isArray(wishRes.value)) {
          setWishlistIds(new Set(wishRes.value.map((w) => w.productId?._id || w.productId || w._id)));
        }

        if (banRes.status === 'fulfilled' && Array.isArray(banRes.value) && banRes.value.length > 0) {
          const normalized = banRes.value.map((b) => {
            let img = b.image || b.imageUrl || b.img;
            if (img) {
              img = img.split('?')[0];
              if (!img.startsWith('http')) {
                img = `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
              }
            }
            return {
              ...b,
              image: img || `${BASE_URL}/banners/banner-slide-1.jpg`,
              actionText: b.buttonText || b.actionText || 'Shop Now',
            };
          });
          setBanners(normalized);
        }

        if (notifRes.status === 'fulfilled') {
          setUnreadNotifications(notifRes.value?.unreadCount || 0);
        }
      } catch (e) {
        console.warn('Init error:', e);
      }
    }
    init();
  }, []);

  // Listen for category passed via navigation route params
  useEffect(() => {
    if (route?.params?.selectedCategory) {
      setSelectedCategory(route.params.selectedCategory);
      setPage(1);
      fetchProducts(1, route.params.selectedCategory, searchQuery, activePick);
    }
  }, [route?.params?.selectedCategory]);

  // Effect for Category & Smart Pick change
  useEffect(() => {
    setPage(1);
    fetchProducts(1, selectedCategory, searchQuery, activePick);
  }, [selectedCategory, activePick]);

  // Automatic Banner Slideshow Auto-scroll
  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(() => {
      bannerActiveIndex.current = (bannerActiveIndex.current + 1) % banners.length;
      bannerScrollRef.current?.scrollTo({
        x: bannerActiveIndex.current * (width - 20),
        animated: true,
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [banners]);

  // Re-fetch when Sort or Filter changes
  useEffect(() => {
    setPage(1);
    fetchProducts(1, selectedCategory, searchQuery, activePick);
  }, [sortBy, filterInStockOnly, filterPriceRange]);

  const handleAddToCartWithFeedback = (item) => {
    const id = item._id || item.id;
    addToCart(item, 1);
    setAddedItemIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setAddedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1800);
  };

  // Debounced search
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchProducts(1, selectedCategory, text, activePick);
    }, 400);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
    fetchProducts(1, selectedCategory, '', activePick);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(1, selectedCategory, searchQuery, activePick, true);
  };

  const handleLoadMore = () => {
    if (loadingMore || loading || refreshing || page >= totalPages) return;
    setLoadingMore(true);
    fetchProducts(page + 1, selectedCategory, searchQuery, activePick);
  };

  const handleToggleWishlist = async (product) => {
    const pId = product._id || product.id;
    const isWished = wishlistIds.has(pId);

    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (isWished) next.delete(pId);
      else next.add(pId);
      return next;
    });

    try {
      if (isWished) {
        await wishlistService.removeFromWishlist(pId);
        Toast.show({ type: 'info', text1: 'Removed from Wishlist', position: 'bottom' });
      } else {
        await wishlistService.addToWishlist(pId);
        Toast.show({ type: 'success', text1: 'Saved to Wishlist ❤️', position: 'bottom' });
      }
    } catch {
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (isWished) next.add(pId);
        else next.delete(pId);
        return next;
      });
    }
  };

  // List Header: Banners + Smart Picks + Categories + Sort & Filter
  const renderListHeader = () => (
    <View style={styles.headerContent}>
      {/* Promotional Banners Auto-Scroll Slideshow */}
      <ScrollView
        ref={bannerScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bannerScroll}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 20));
          bannerActiveIndex.current = idx;
        }}
      >
        {banners.map((b, idx) => {
          let bannerImg = b.image || b.imageUrl || b.img;
          if (bannerImg) {
            bannerImg = bannerImg.split('?')[0];
            if (!bannerImg.startsWith('http')) {
              bannerImg = `${BASE_URL}${bannerImg.startsWith('/') ? '' : '/'}${bannerImg}`;
            }
          }
          return (
            <TouchableOpacity
              key={b._id || idx}
              style={styles.bannerSlide}
              activeOpacity={0.9}
              onPress={() => {
                if (b.actionScreen) navigation.navigate(b.actionScreen);
                else if (b.actionModal === 'hubs') setHubsModalVisible(true);
              }}
            >
              {bannerImg ? (
                <Image
                  source={{ uri: bannerImg }}
                  style={styles.bannerBgImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.bannerOverlay} />
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle} numberOfLines={1}>{b.title}</Text>
                <Text style={styles.bannerSubtitle} numberOfLines={2}>{b.subtitle}</Text>
                <View style={styles.bannerActionBtn}>
                  <Text style={styles.bannerActionBtnText}>{b.actionText || b.buttonText || 'Explore Now'}</Text>
                  <ArrowRight size={12} color="#ffffff" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Smart Dashboard Quick Picks */}
      <View style={styles.quickPicksRow}>
        {[
          { key: 'all', label: 'All Items', icon: Zap },
          { key: 'best_sellers', label: 'Best Sellers', icon: TrendingUp },
          { key: 'top_deals', label: 'Top Deals', icon: Percent },
          { key: 'express', label: 'Express ⚡', icon: MapPin },
        ].map((pick) => {
          const Icon = pick.icon;
          const isActive = activePick === pick.key;
          return (
            <TouchableOpacity
              key={pick.key}
              style={[styles.pickBtn, isActive && styles.pickBtnActive]}
              onPress={() => setActivePick(pick.key)}
            >
              <Icon size={13} color={isActive ? '#ffffff' : colors.textMuted} />
              <Text style={[styles.pickText, isActive && styles.pickTextActive]}>
                {pick.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryPill,
                isSelected && styles.categoryPillActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  isSelected && styles.categoryPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sort & Filter Controls Row */}
      <View style={styles.filterSortRow}>
        <TouchableOpacity
          style={[styles.filterSortPill, sortBy !== 'default' && styles.filterSortPillActive]}
          onPress={() => setIsSortModalOpen(true)}
          activeOpacity={0.8}
        >
          <ArrowUpDown size={13} color={sortBy !== 'default' ? '#60a5fa' : colors.textMuted} />
          <Text style={[styles.filterSortPillText, sortBy !== 'default' && styles.filterSortPillTextActive]}>
            {sortBy === 'price_asc' ? 'Price: Low-High' :
             sortBy === 'price_desc' ? 'Price: High-Low' :
             sortBy === 'rating' ? 'Top Rated' :
             sortBy === 'newest' ? 'Newest' : 'Sort'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterSortPill,
            (filterInStockOnly || filterPriceRange !== 'all') && styles.filterSortPillActive,
          ]}
          onPress={() => setIsFilterModalOpen(true)}
          activeOpacity={0.8}
        >
          <SlidersHorizontal
            size={13}
            color={(filterInStockOnly || filterPriceRange !== 'all') ? '#60a5fa' : colors.textMuted}
          />
          <Text
            style={[
              styles.filterSortPillText,
              (filterInStockOnly || filterPriceRange !== 'all') && styles.filterSortPillTextActive,
            ]}
          >
            Filters{(filterInStockOnly ? 1 : 0) + (filterPriceRange !== 'all' ? 1 : 0) > 0 ? ` (${(filterInStockOnly ? 1 : 0) + (filterPriceRange !== 'all' ? 1 : 0)})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === 'All' ? 'Catalog Explorer' : selectedCategory}
        </Text>
        <Text style={styles.sectionCount}>
          {totalCount > 0 ? `${products.length} of ${totalCount} items` : `${products.length} items`}
        </Text>
      </View>
    </View>
  );

  const renderProductItem = ({ item }) => {
    const pId = item._id || item.id;
    const isWished = wishlistIds.has(pId);
    const isAdded = addedItemIds.has(pId);
    const imageUrl =
      item.images?.[0]?.url ||
      item.image ||
      (Array.isArray(item.images) && typeof item.images[0] === 'string' ? item.images[0] : null) ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ProductDetails', { productId: pId, product: item })}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {item.confidenceScore && (
            <View style={styles.confidenceChip}>
              <ShieldCheck size={11} color="#10b981" />
              <Text style={styles.confidenceText}>{item.confidenceScore}%</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => handleToggleWishlist(item)}
            activeOpacity={0.7}
          >
            <Heart
              size={16}
              color={isWished ? '#ef4444' : '#ffffff'}
              fill={isWished ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.compareCardBtn, isInCompare(item._id || item.id) && styles.compareCardBtnActive]}
            onPress={() => toggleCompare(item)}
            activeOpacity={0.7}
          >
            <ArrowLeftRight
              size={14}
              color={isInCompare(item._id || item.id) ? '#60a5fa' : '#ffffff'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.productDetails}>
          <Text style={styles.productCategory} numberOfLines={1}>
            {item.category || 'General'}
          </Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name || 'Untitled Product'}
          </Text>

          <View style={styles.ratingRow}>
            <Star size={13} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.ratingText}>
              {item.rating || '4.8'}
            </Text>
            <Text style={styles.stockStatus}>
              {(item.quantity || item.stock || 0) > 0 ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              {formatPrice(item.price)}
            </Text>

            <TouchableOpacity
              style={[styles.addBtn, isAdded && styles.addBtnSuccess]}
              onPress={() => handleAddToCartWithFeedback(item)}
              activeOpacity={0.7}
            >
              {isAdded ? (
                <CheckCircle2 size={16} color="#ffffff" />
              ) : (
                <Plus size={16} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 
        PINNED TOP HEADER:
        1. Branding on Left
        2. Delivery Hub/Map Pin on Right (replaces Live API)
        3. Notifications Bell with Badge
      */}
      <View style={styles.pinnedHeader}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerIcon}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.brandTitle}>INVENTORY PRIME</Text>
              <Text style={styles.tagline}>{selectedHub.name.split(' ')[0]} Express Active</Text>
            </View>
          </View>

          <View style={styles.topActionsRow}>
            {/* Map/Hub Selector Button */}
            <TouchableOpacity
              style={styles.hubSelectorBtn}
              activeOpacity={0.8}
              onPress={() => setHubsModalVisible(true)}
            >
              <MapPin size={13} color="#60a5fa" />
              <Text style={styles.hubSelectorText} numberOfLines={1}>
                {selectedHub.city}
              </Text>
            </TouchableOpacity>

            {/* Notifications Bell */}
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Bell size={18} color="#ffffff" />
              {unreadNotifications > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Smart Search Bar with Voice and Visual Search Buttons */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search 6,000+ items, categories..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.iconBtn}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Voice Search Button */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setVoiceModalVisible(true)}
          >
            <Mic size={17} color={colors.primaryLight} />
          </TouchableOpacity>

          {/* Visual Search Button */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setVisualModalVisible(true)}
          >
            <Camera size={17} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>

        {/* Smart Search Suggestions Dropdown */}
        {isSearchFocused && searchQuery.length > 0 && (
          <View style={styles.searchDropdown}>
            <Text style={styles.dropdownHeading}>SUGGESTIONS</Text>
            {categories.slice(1, 5).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.dropdownRow}
                onPress={() => {
                  setSelectedCategory(cat);
                  setIsSearchFocused(false);
                }}
              >
                <Search size={13} color={colors.textMuted} />
                <Text style={styles.dropdownText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Main Catalog List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching inventory catalog...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) => (item._id || item.id ? `${item._id || item.id}_${index}` : String(index))}
          renderItem={renderProductItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primaryLight} />
                <Text style={styles.footerLoaderText}>Loading more products...</Text>
              </View>
            ) : <View style={{ height: 30 }} />
          }
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Floating Action Pills Dock: Filter, Sort & Darwin AI */}
      <View style={[styles.floatingPillsBar, { bottom: 18 + insets.bottom }]}>
        <TouchableOpacity
          style={[
            styles.floatingActionPill,
            (filterInStockOnly || filterPriceRange !== 'all') && styles.floatingActionPillActive,
          ]}
          activeOpacity={0.85}
          onPress={() => setIsFilterModalOpen(true)}
        >
          <SlidersHorizontal
            size={13}
            color={(filterInStockOnly || filterPriceRange !== 'all') ? '#38bdf8' : '#cbd5e1'}
          />
          <Text
            style={[
              styles.floatingActionPillText,
              (filterInStockOnly || filterPriceRange !== 'all') && styles.floatingActionPillTextActive,
            ]}
          >
            Filter{(filterInStockOnly ? 1 : 0) + (filterPriceRange !== 'all' ? 1 : 0) > 0 ? ` (${(filterInStockOnly ? 1 : 0) + (filterPriceRange !== 'all' ? 1 : 0)})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.floatingActionPill,
            sortBy !== 'default' && styles.floatingActionPillActive,
          ]}
          activeOpacity={0.85}
          onPress={() => setIsSortModalOpen(true)}
        >
          <ArrowUpDown
            size={13}
            color={sortBy !== 'default' ? '#38bdf8' : '#cbd5e1'}
          />
          <Text
            style={[
              styles.floatingActionPillText,
              sortBy !== 'default' && styles.floatingActionPillTextActive,
            ]}
          >
            Sort
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.floatingDarwinOrb}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('DarwinChat')}
        >
          <Image
            source={{ uri: `${BASE_URL}/darwin-mascot-circle.png` }}
            style={styles.darwinPhotoMascot}
            resizeMode="cover"
          />
          <Text style={styles.floatingDarwinText}>Darwin AI</Text>
        </TouchableOpacity>
      </View>

      {/* Regional Hubs & Maps Modal */}
      <Modal visible={hubsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPin size={20} color="#60a5fa" />
                <Text style={styles.modalTitle}>Delivery & Fulfillment Hubs</Text>
              </View>
              <TouchableOpacity onPress={() => setHubsModalVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Select your regional warehouse for fastest dispatch</Text>

            <ScrollView style={{ maxHeight: 360 }}>
              {REGIONAL_HUBS.map((hub) => {
                const isSelected = selectedHub.code === hub.code;
                return (
                  <TouchableOpacity
                    key={hub.code}
                    style={[styles.hubItem, isSelected && styles.hubItemActive]}
                    onPress={() => {
                      setSelectedHub(hub);
                      setHubsModalVisible(false);
                      Toast.show({ type: 'success', text1: `Connected to ${hub.name}`, position: 'bottom' });
                    }}
                  >
                    <View style={styles.hubIconWrap}>
                      <MapPin size={18} color={isSelected ? '#60a5fa' : colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.hubName, isSelected && { color: '#60a5fa' }]}>{hub.name}</Text>
                      <Text style={styles.hubMeta}>{hub.city}, {hub.state} • {hub.deliveryTime}</Text>
                    </View>
                    {isSelected && <CheckCircle2 size={18} color="#10b981" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Voice Search Modal */}
      <VoiceSearchModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onSearchQuery={(q) => {
          setSearchQuery(q);
          setPage(1);
          fetchProducts(1, 'All', q, activePick);
        }}
      />

      {/* Visual Search Modal */}
      <VisualSearchModal
        visible={visualModalVisible}
        onClose={() => setVisualModalVisible(false)}
        navigation={navigation}
      />

      {/* Sort Options Bottom Sheet Modal */}
      <Modal visible={isSortModalOpen} animationType="slide" transparent onRequestClose={() => setIsSortModalOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sort Products</Text>
              <TouchableOpacity onPress={() => setIsSortModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            {[
              { id: 'default', label: 'Featured / Default' },
              { id: 'price_asc', label: 'Price: Low to High' },
              { id: 'price_desc', label: 'Price: High to Low' },
              { id: 'rating', label: 'Highest Customer Rating' },
              { id: 'newest', label: 'Newest Arrivals' },
            ].map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.sheetOptionRow, sortBy === option.id && styles.sheetOptionRowActive]}
                onPress={() => {
                  setSortBy(option.id);
                  setIsSortModalOpen(false);
                }}
              >
                <Text style={[styles.sheetOptionText, sortBy === option.id && styles.sheetOptionTextActive]}>
                  {option.label}
                </Text>
                {sortBy === option.id && <Check size={18} color="#60a5fa" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Filter Options Bottom Sheet Modal */}
      <Modal visible={isFilterModalOpen} animationType="slide" transparent onRequestClose={() => setIsFilterModalOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Catalog</Text>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterGroupTitle}>Stock Availability</Text>
            <TouchableOpacity
              style={[styles.filterCheckboxRow, filterInStockOnly && styles.filterCheckboxRowActive]}
              onPress={() => setFilterInStockOnly(!filterInStockOnly)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkboxBox, filterInStockOnly && styles.checkboxBoxActive]}>
                {filterInStockOnly && <Check size={13} color="#ffffff" />}
              </View>
              <Text style={styles.filterCheckboxLabel}>In Stock Only</Text>
            </TouchableOpacity>

            <Text style={[styles.filterGroupTitle, { marginTop: 16 }]}>Price Range</Text>
            <View style={styles.priceChipsRow}>
              {[
                { id: 'all', label: 'All Prices' },
                { id: 'under1000', label: 'Under ₹1,000' },
                { id: '1000to5000', label: '₹1,000 - ₹5,000' },
                { id: 'above5000', label: 'Above ₹5,000' },
              ].map((pChip) => (
                <TouchableOpacity
                  key={pChip.id}
                  style={[styles.filterPriceChip, filterPriceRange === pChip.id && styles.filterPriceChipActive]}
                  onPress={() => setFilterPriceRange(pChip.id)}
                >
                  <Text style={[styles.filterPriceChipText, filterPriceRange === pChip.id && styles.filterPriceChipTextActive]}>
                    {pChip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterActionButtons}>
              <TouchableOpacity
                style={styles.filterResetBtn}
                onPress={() => {
                  setFilterInStockOnly(false);
                  setFilterPriceRange('all');
                }}
              >
                <Text style={styles.filterResetText}>Reset All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={() => setIsFilterModalOpen(false)}
              >
                <Text style={styles.filterApplyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  pinnedHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0c2238',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  avatarHeaderText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  hubSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0c1527',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    maxWidth: 120,
  },
  hubSelectorText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    marginLeft: 8,
    fontSize: 14,
  },
  iconBtn: {
    padding: 6,
  },
  searchDropdown: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    padding: 10,
  },
  dropdownHeading: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownText: {
    color: colors.text,
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bannerScroll: {
    gap: 12,
    marginBottom: 14,
  },
  bannerSlide: {
    width: width - 32,
    height: 145,
    backgroundColor: '#0c0e18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    position: 'relative',
  },
  bannerBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.92,
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 8, 16, 0.35)',
  },
  bannerContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  bannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#091528',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignSelf: 'flex-start',
  },
  bannerTagText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  bannerSubtitle: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  bannerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
  },
  bannerActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  quickPicksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 6,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
  },
  pickBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  pickTextActive: {
    color: '#ffffff',
  },
  categoryScroll: {
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 80,
  },
  columnWrapper: {
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: 140,
    backgroundColor: '#111115',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  confidenceChip: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#064e3b',
  },
  confidenceText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  compareCardBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  compareCardBtnActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#60a5fa',
  },
  productDetails: {
    padding: 10,
  },
  productCategory: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  productName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 36,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  ratingText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  stockStatus: {
    color: '#10b981',
    fontSize: 10,
    marginLeft: 'auto',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceSymbol: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    position: 'absolute',
    top: 1,
    left: 0,
  },
  productPrice: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    paddingLeft: 9,
  },
  addBtn: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerLoaderText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  floatingPillsBar: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 99,
  },
  floatingActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  floatingActionPillActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#38bdf8',
  },
  floatingActionPillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingActionPillTextActive: {
    color: '#ffffff',
  },
  floatingDarwinOrb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#1d4ed8',
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 22,
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
  },
  darwinPhotoMascot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  floatingDarwinText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  hubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  hubItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#0c1527',
  },
  hubIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#121217',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  hubMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  modalCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  voiceCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
  },
  micCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  voiceTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  voiceSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 24,
  },
  voiceCancelBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  voiceCancelText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  visualGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  visualChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  visualChipText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  addBtnSuccess: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  filterSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  filterSortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0c1527',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterSortPillActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  filterSortPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterSortPillTextActive: {
    color: '#ffffff',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sheetOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sheetOptionRowActive: {
    backgroundColor: '#0c1e38',
  },
  sheetOptionText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  sheetOptionTextActive: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  filterGroupTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  filterCheckboxRowActive: {
    opacity: 1,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterCheckboxLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  priceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  filterPriceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPriceChipActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  filterPriceChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterPriceChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  filterResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterResetText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  filterApplyBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterApplyText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
