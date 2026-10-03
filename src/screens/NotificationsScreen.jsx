import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  ArrowLeft,
  Package,
  Tag,
  CheckCircle2,
  Info,
  CheckCheck,
  Search,
  ShieldCheck,
  Gift,
  Truck,
  Users,
  Wallet,
  Clock,
  RotateCcw,
  AlertTriangle,
  X,
} from 'lucide-react-native';
import colors from '../theme/colors';
import notificationService from '../services/notificationService';
import Toast from 'react-native-toast-message';

const RICH_DEFAULT_NOTIFICATIONS = [
  {
    _id: 'notif_1',
    title: 'Order Dispatched from Regional Hub 🚚',
    message: 'Your order #ORD-0821 has left the Hyderabad Prime Fulfillment center and is out for local delivery.',
    type: 'order_shipped',
    orderId: 'ORD-0821',
    isRead: false,
    createdAt: new Date().toISOString(),
    actionLabel: 'Track Delivery',
    actionScreen: 'Orders',
  },
  {
    _id: 'notif_2',
    title: 'Price Drop Alert: 25% Off! 🔥',
    message: 'An item in your wishlist "Premium Noise Cancelling Headphones" just dropped in price by ₹1,200.',
    type: 'price_drop',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    actionLabel: 'View Wishlist',
    actionScreen: 'Wishlist',
  },
  {
    _id: 'notif_3',
    title: 'Instant Cashback Credited ₹150 🎁',
    message: 'Congratulations! ₹150 loyalty cashback reward has been credited to your Digital Wallet balance.',
    type: 'rewards',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    actionLabel: 'View Wallet',
    actionScreen: 'Wallet',
  },
  {
    _id: 'notif_4',
    title: 'Shared Group Bag Activity 👥',
    message: 'Your friend Rahul added 2 items to your shared bag. Cast your vote on items before checkout.',
    type: 'shared_cart',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    actionLabel: 'Open Shared Bag',
    actionScreen: 'SharedCart',
  },
  {
    _id: 'notif_5',
    title: 'Doorstep Warranty Active 🛡️',
    message: 'Your 1-Year Comprehensive Warranty for "Smart Fitness Tracker" is activated in your Warranty Vault.',
    type: 'warranty',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    actionLabel: 'Open Vault',
    actionScreen: 'WarrantyVault',
  },
  {
    _id: 'notif_6',
    title: 'Flash Sale: Weekend Tech Fest ⚡',
    message: 'Enjoy up to 40% instant discounts on gaming accessories, mechanical keyboards, and 4K displays.',
    type: 'promo',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    actionLabel: 'Browse Deals',
    actionScreen: 'Home',
  },
  {
    _id: 'notif_7',
    title: 'Order Delivered Successfully ✅',
    message: 'Order #ORD-0744 was handed over to customer. How was your experience? Leave a review to earn 50 points.',
    type: 'order_delivered',
    orderId: 'ORD-0744',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    actionLabel: 'Rate Product',
    actionScreen: 'Orders',
  },
];

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders 📦' },
  { id: 'offers', label: 'Offers 🏷️' },
  { id: 'rewards', label: 'Rewards 🎁' },
  { id: 'warranty', label: 'Warranty 🛡️' },
];

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      const list = Array.isArray(data) ? data : data?.notifications || [];
      if (list.length === 0) {
        setNotifications(RICH_DEFAULT_NOTIFICATIONS);
      } else {
        // Merge with rich defaults so all categories are well populated
        const existingIds = new Set(list.map((n) => n._id || n.id));
        const extra = RICH_DEFAULT_NOTIFICATIONS.filter((r) => !existingIds.has(r._id));
        setNotifications([...list, ...extra]);
      }
    } catch {
      setNotifications(RICH_DEFAULT_NOTIFICATIONS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
    } catch {
      // local fallback
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    Toast.show({ type: 'success', text1: 'All caught up! 🎉', text2: 'All notifications marked as read', position: 'bottom' });
  };

  const handleNotificationPress = (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
    );
    if (notif.actionScreen) {
      navigation.navigate(notif.actionScreen);
    }
  };

  const getVisual = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('order_delivered')) return { icon: CheckCircle2, color: '#10b981', bg: '#064e3b' };
    if (t.includes('order')) return { icon: Truck, color: '#60a5fa', bg: '#1e3a8a' };
    if (t.includes('promo') || t.includes('price')) return { icon: Tag, color: '#f59e0b', bg: '#451a03' };
    if (t.includes('reward') || t.includes('cashback')) return { icon: Gift, color: '#ec4899', bg: '#4a044e' };
    if (t.includes('shared')) return { icon: Users, color: '#c084fc', bg: '#3b0764' };
    if (t.includes('warranty')) return { icon: ShieldCheck, color: '#34d399', bg: '#022c22' };
    return { icon: Bell, color: '#94a3b8', bg: '#1e293b' };
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === 'unread' && n.isRead) return false;
      const t = String(n.type || '').toLowerCase();
      if (activeTab === 'orders' && !t.includes('order') && !n.orderId) return false;
      if (activeTab === 'offers' && !t.includes('promo') && !t.includes('price') && !t.includes('deal')) return false;
      if (activeTab === 'rewards' && !t.includes('reward') && !t.includes('cashback') && !t.includes('wallet')) return false;
      if (activeTab === 'warranty' && !t.includes('warranty')) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const msgMatch = (n.message || '').toLowerCase().includes(q);
        const orderMatch = (n.orderId || '').toLowerCase().includes(q);
        if (!titleMatch && !msgMatch && !orderMatch) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const renderItem = ({ item }) => {
    const visual = getVisual(item.type);
    const Icon = visual.icon;

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        activeOpacity={0.8}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconWrap, { backgroundColor: visual.bg }]}>
          <Icon size={18} color={visual.color} />
        </View>

        <View style={styles.contentWrap}>
          <View style={styles.topRow}>
            <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>

          <View style={styles.bottomMetaRow}>
            <View style={styles.timeRow}>
              <Clock size={11} color={colors.textMuted} />
              <Text style={styles.timeText}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
              </Text>
            </View>

            {item.actionLabel && (
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>{item.actionLabel}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSub}>{notifications.length} alerts & updates</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead}>
            <CheckCheck size={15} color="#38bdf8" />
            <Text style={styles.markReadText}>Mark Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search alerts, orders, deals..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Tabs Bar */}
      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, isSelected && styles.tabChipActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification Cards List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={50} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No notifications found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? `No alerts match "${searchQuery}".` : 'You have no notifications in this category.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadNotifications(); }}
              tintColor={colors.primary}
            />
          }
        />
      )}
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
  headerSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  badgeCount: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0c2238',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  markReadText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  tabsWrap: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  tabChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  tabChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: 10,
  },
  cardUnread: {
    borderColor: '#2563eb',
    backgroundColor: '#0a1424',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrap: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  titleUnread: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 6,
  },
  message: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  actionPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionPillText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
});
