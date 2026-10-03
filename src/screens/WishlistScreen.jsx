import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Heart,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  Plus,
  CheckCircle2,
  FolderHeart,
  X,
  Sparkles,
  Check,
} from 'lucide-react-native';
import colors from '../theme/colors';
import wishlistService from '../services/wishlistService';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

const DEFAULT_COLLECTIONS = [
  { _id: 'all', name: 'All Items' },
  { _id: 'favorites', name: 'Favorites ❤️' },
  { _id: 'tech', name: 'Tech & Gadgets 💻' },
  { _id: 'style', name: 'Fashion & Style 👗' },
  { _id: 'essentials', name: 'Home Essentials 🏠' },
];

export default function WishlistScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [activeCollection, setActiveCollection] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Collection Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  // Add to cart temporary tick state
  const [addedItemIds, setAddedItemIds] = useState(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [wishlistData, collectionsData] = await Promise.all([
        wishlistService.getWishlist(),
        wishlistService.getCollections(),
      ]);

      setItems(Array.isArray(wishlistData) ? wishlistData : []);

      if (Array.isArray(collectionsData) && collectionsData.length > 0) {
        const customCols = collectionsData.map((c) => ({
          _id: c._id || c.id || c.name,
          name: c.name,
        }));
        setCollections([{ _id: 'all', name: 'All Items' }, ...customCols]);
      } else {
        setCollections(DEFAULT_COLLECTIONS);
      }
    } catch (e) {
      console.warn('Failed to load wishlist:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemove = async (itemId) => {
    try {
      await wishlistService.removeFromWishlist(itemId);
      setItems((prev) => prev.filter((i) => i._id !== itemId && i.productId !== itemId));
      Toast.show({ type: 'info', text1: 'Item Removed', text2: 'Removed from your wishlist.', position: 'bottom' });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to remove item.', position: 'bottom' });
    }
  };

  const handleAddToCartWithFeedback = (product) => {
    const pId = product._id || product.id;
    addToCart(product, 1);
    setAddedItemIds((prev) => new Set(prev).add(pId));
    setTimeout(() => {
      setAddedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(pId);
        return next;
      });
    }, 1800);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a collection name', position: 'bottom' });
      return;
    }

    try {
      setCreatingCollection(true);
      const created = await wishlistService.createCollection({ name: newCollectionName.trim() });
      const newCol = {
        _id: created?._id || created?.id || `col_${Date.now()}`,
        name: created?.name || newCollectionName.trim(),
      };
      setCollections((prev) => [...prev, newCol]);
      setActiveCollection(newCol._id);
      setIsCreateModalOpen(false);
      setNewCollectionName('');
      Toast.show({ type: 'success', text1: 'Collection Created! 🎉', position: 'bottom' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to create collection', position: 'bottom' });
    } finally {
      setCreatingCollection(false);
    }
  };

  // Filter items by active collection
  const filteredItems = items.filter((item) => {
    if (activeCollection === 'all') return true;
    const colObj = collections.find((c) => c._id === activeCollection);
    const colName = (colObj?.name || '').toLowerCase();
    const itemCat = (item.category || item.productId?.category || '').toLowerCase();
    const itemName = (item.name || item.productId?.name || '').toLowerCase();

    if (activeCollection === 'favorites') return true;
    if (activeCollection === 'tech') return itemCat.includes('elect') || itemCat.includes('tech') || itemName.includes('phone') || itemName.includes('pro');
    if (activeCollection === 'style') return itemCat.includes('cloth') || itemCat.includes('fashion') || itemCat.includes('apparel') || itemName.includes('shirt') || itemName.includes('dress');
    if (activeCollection === 'essentials') return itemCat.includes('home') || itemCat.includes('living') || itemCat.includes('access');

    return itemCat.includes(colName) || (item.collection && item.collection === activeCollection);
  });

  const renderItem = ({ item }) => {
    const pId = typeof item.productId === 'object' && item.productId !== null
      ? (item.productId._id || item.productId.id)
      : (item.productId || item._id);
    const wishlistId = item._id || pId;
    const name = item.name || (typeof item.productId === 'object' ? item.productId?.name : '') || 'Product';
    const price = Number(item.price !== undefined ? item.price : (typeof item.productId === 'object' ? item.productId?.price : 0));
    const imageUrl = item.image ||
      (typeof item.productId === 'object' && (item.productId.image || (Array.isArray(item.productId.images) ? item.productId.images[0] : null))) ||
      (Array.isArray(item.images) && typeof item.images[0] === 'string' ? item.images[0] : null) ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';

    const fullProduct = {
      _id: pId,
      name,
      price,
      image: imageUrl,
      category: item.category || 'General',
      quantity: item.quantity || 10,
    };

    const isAdded = addedItemIds.has(pId);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductDetails', { productId: pId, product: fullProduct })}
          activeOpacity={0.8}
        >
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.trashBtn}
          onPress={() => handleRemove(wishlistId)}
        >
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>

        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.price}>
            {formatPrice(price)}
          </Text>

          <TouchableOpacity
            style={[styles.addToCartBtn, isAdded && styles.addToCartBtnSuccess]}
            onPress={() => handleAddToCartWithFeedback(fullProduct)}
            activeOpacity={0.8}
          >
            {isAdded ? (
              <>
                <CheckCircle2 size={14} color="#ffffff" />
                <Text style={styles.addToCartText}>Added ✓</Text>
              </>
            ) : (
              <>
                <ShoppingBag size={14} color="#ffffff" />
                <Text style={styles.addToCartText}>Add to Bag</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <Text style={styles.headerCount}>{filteredItems.length} items</Text>
      </View>

      {/* Collection Categories Pill Bar */}
      <View style={styles.collectionsBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.collectionsScroll}
        >
          {collections.map((col) => {
            const isSelected = activeCollection === col._id;
            return (
              <TouchableOpacity
                key={col._id}
                style={[styles.colPill, isSelected && styles.colPillActive]}
                onPress={() => setActiveCollection(col._id)}
              >
                <Text style={[styles.colPillText, isSelected && styles.colPillTextActive]}>
                  {col.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* + New Collection Button */}
          <TouchableOpacity
            style={styles.newColBtn}
            onPress={() => setIsCreateModalOpen(true)}
          >
            <Plus size={14} color="#38bdf8" />
            <Text style={styles.newColText}>New Collection</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart size={54} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No items in this collection</Text>
          <Text style={styles.emptySubtitle}>Tap the heart icon on any product to save it for later.</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.browseBtnText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadData(); }}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Create New Collection Modal */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent onRequestClose={() => setIsCreateModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FolderHeart size={20} color="#ec4899" />
                <Text style={styles.modalTitle}>New Wishlist Collection</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Organize your saved items by mood, room, or event</Text>

            <TextInput
              style={styles.collectionInput}
              placeholder="Collection name (e.g. Birthday Gifts, Tech Setup)"
              placeholderTextColor="#64748b"
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.createColSubmitBtn, creatingCollection && { opacity: 0.6 }]}
              onPress={handleCreateCollection}
              disabled={creatingCollection}
            >
              {creatingCollection ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.createColSubmitText}>Create Collection</Text>
              )}
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
  headerCount: {
    color: colors.textMuted,
    fontSize: 13,
  },
  collectionsBarWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  collectionsScroll: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'center',
  },
  colPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#0c1527',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  colPillActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  colPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  colPillTextActive: {
    color: '#ffffff',
  },
  newColBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderStyle: 'dashed',
  },
  newColText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: '#111115',
  },
  trashBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  details: {
    padding: 10,
  },
  name: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    minHeight: 34,
  },
  price: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 6,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  addToCartBtnSuccess: {
    backgroundColor: '#10b981',
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  browseBtnText: {
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  collectionInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 16,
  },
  createColSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createColSubmitText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
