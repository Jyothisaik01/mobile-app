import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Share,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  Share2,
  MapPin,
  Truck,
  CreditCard,
  X,
  ChevronRight,
  ShieldCheck,
  Search,
  ArrowUpDown,
  Filter,
  RotateCcw,
} from 'lucide-react-native';
import colors from '../theme/colors';
import orderService from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/formatters';
import Toast from 'react-native-toast-message';
import AiWriteButton from '../components/AiWriteButton';

const STATUS_CONFIG = {
  placed: { bg: '#172554', text: '#60a5fa', icon: Clock, label: 'Order Placed' },
  packed: { bg: '#1e1b4b', text: '#818cf8', icon: Package, label: 'Packed & Ready' },
  pending: { bg: '#2e1065', text: '#c084fc', icon: Clock, label: 'Payment Pending' },
  shipped: { bg: '#042f2e', text: '#2dd4bf', icon: Truck, label: 'Shipped' },
  out_for_delivery: { bg: '#064e3b', text: '#34d399', icon: Truck, label: 'Out for Delivery' },
  delivered: { bg: '#064e3b', text: '#34d399', icon: CheckCircle2, label: 'Delivered' },
  cancelled: { bg: '#450a0a', text: '#f87171', icon: XCircle, label: 'Cancelled' },
  return_requested: { bg: '#451a03', text: '#fb923c', icon: RotateCcw, label: 'Return Requested' },
  return_approved: { bg: '#1c1917', text: '#fdba74', icon: RotateCcw, label: 'Pickup Scheduled' },
  returned: { bg: '#311025', text: '#f472b6', icon: RotateCcw, label: 'Refund Credited' },
};

function getOrderStatusMeta(item) {
  const ret = String(item.returnStatus || '').toLowerCase().replace(/[\s-]/g, '_');
  if (ret && ret !== 'none') {
    if (ret === 'requested') {
      return { bg: '#451a03', text: '#fb923c', icon: RotateCcw, label: 'Return Requested' };
    }
    if (ret === 'approved' || ret === 'pickup_confirmed' || ret === 'pickup_scheduled') {
      return { bg: '#1c1917', text: '#fdba74', icon: RotateCcw, label: 'Pickup Scheduled' };
    }
    if (ret === 'item_received' || ret === 'picked_up') {
      return { bg: '#064e3b', text: '#34d399', icon: RotateCcw, label: 'Item Received at Hub' };
    }
    if (ret === 'refund_credited' || ret === 'completed' || ret === 'returned') {
      return { bg: '#311025', text: '#f472b6', icon: RotateCcw, label: 'Returned & Refunded' };
    }
    if (ret === 'rejected') {
      return { bg: '#450a0a', text: '#f87171', icon: XCircle, label: 'Return Rejected' };
    }
    if (ret === 'cancelled') {
      return { bg: '#450a0a', text: '#f87171', icon: XCircle, label: 'Return Cancelled' };
    }
  }

  const rawStatus = (item.status || item.orderStatus || 'placed').toLowerCase().replace(/\s+/g, '_');
  return STATUS_CONFIG[rawStatus] || STATUS_CONFIG.placed;
}

function getTimelineData(order) {
  const rawStatus = String(order.status || order.orderStatus || 'placed').toLowerCase().replace(/[\s-]/g, '_');
  const ret = String(order.returnStatus || '').toLowerCase().replace(/[\s-]/g, '_');
  const isReturn = (ret && ret !== 'none') || rawStatus === 'returned' || rawStatus === 'return_requested';

  if (isReturn) {
    let activeIdx = 0;
    if (ret === 'refund_credited' || ret === 'completed' || ret === 'returned' || rawStatus === 'returned') {
      activeIdx = 3;
    } else if (ret === 'item_received' || ret === 'picked_up' || ret === 'quality_passed') {
      activeIdx = 2;
    } else if (ret === 'approved' || ret === 'pickup_confirmed' || ret === 'pickup_scheduled') {
      activeIdx = 1;
    } else {
      activeIdx = 0;
    }

    return {
      title: 'RETURN & REFUND TIMELINE',
      activeIdx,
      isReturn: true,
      steps: [
        { id: 'requested', label: 'Return Filed' },
        { id: 'approved', label: 'Pickup Set' },
        { id: 'picked_up', label: 'Hub Received' },
        { id: 'refunded', label: 'Refund Credited' },
      ],
    };
  }

  let activeIdx = 0;
  if (rawStatus === 'delivered') {
    activeIdx = 3; // All 4 completed!
  } else if (rawStatus === 'shipped' || rawStatus === 'out_for_delivery') {
    activeIdx = 2;
  } else if (rawStatus === 'packed') {
    activeIdx = 1;
  } else {
    activeIdx = 0;
  }

  return {
    title: 'DELIVERY TIMELINE',
    activeIdx,
    isReturn: false,
    steps: [
      { id: 'placed', label: 'Order Placed' },
      { id: 'packed', label: 'Packed' },
      { id: 'shipped', label: 'Shipped' },
      { id: 'delivered', label: 'Delivered' },
    ],
  };
}

export default function OrdersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Selected Order for Invoice / Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Return / Refund Request Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnOrderTarget, setReturnOrderTarget] = useState(null);
  const [returnReason, setReturnReason] = useState('Defective or damaged item');
  const [returnComments, setReturnComments] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setLoading(true);
      const data = await orderService.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Orders fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await orderService.cancelOrder(orderId);
      Toast.show({
        type: 'success',
        text1: 'Order Cancelled',
        text2: 'The order has been cancelled and refund initiated.',
        position: 'bottom',
      });
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Cancellation Failed',
        text2: err.response?.data?.msg || 'Could not cancel order.',
        position: 'bottom',
      });
    }
  };

  const handleOpenReturnModal = (order) => {
    setReturnOrderTarget(order);
    setReturnReason('Defective or damaged item');
    setReturnComments('');
    setShowReturnModal(true);
  };

  const handleSubmitReturn = async () => {
    if (!returnOrderTarget?._id) return;
    try {
      setSubmittingReturn(true);
      await orderService.requestReturn(returnOrderTarget._id, returnReason, returnComments);
      Toast.show({
        type: 'success',
        text1: 'Return Requested! 📦',
        text2: 'Reverse pickup will be scheduled. Refund will credit to your wallet.',
        position: 'bottom',
      });
      setShowReturnModal(false);
      setReturnOrderTarget(null);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Return Request Failed',
        text2: err.response?.data?.msg || 'Could not submit return request.',
        position: 'bottom',
      });
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleCancelReturn = async (orderId) => {
    try {
      await orderService.cancelReturn(orderId);
      Toast.show({
        type: 'info',
        text1: 'Return Cancelled',
        text2: 'Return request has been withdrawn.',
        position: 'bottom',
      });
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Cancel Return',
        text2: err.response?.data?.msg || 'Could not cancel return.',
        position: 'bottom',
      });
    }
  };

  const handleShareInvoice = async (order) => {
    try {
      const orderNum = order.orderId || order._id?.slice(-8).toUpperCase();
      const totalStr = formatPrice(order.totalAmount || order.subtotal || 0);
      const message = `Tax Invoice: ORD-${orderNum}\nInventory Prime Marketplace\nStatus: ${order.status || 'Confirmed'}\nTotal: ${totalStr}\nThank you for shopping with Prime!`;
      await Share.share({
        message,
        title: `Invoice ORD-${orderNum}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centerWrap, { paddingTop: insets.top }]}>
        <Package size={50} color={colors.textMuted} />
        <Text style={styles.authTitle}>Sign in to view orders</Text>
        <Text style={styles.authSub}>Your purchase history and tax invoices will appear here.</Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderOrderItem = ({ item }) => {
    const rawStatus = (item.status || item.orderStatus || 'placed').toLowerCase().replace(/\s+/g, '_');
    const statusConfig = getOrderStatusMeta(item);
    const StatusIcon = statusConfig.icon;
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) : 'Recent';
    const orderNum = item.orderId || (item._id ? `#${item._id.slice(-6).toUpperCase()}` : '#ORD');

    const canReturn = rawStatus === 'delivered' && (!item.returnStatus || item.returnStatus === 'none');
    const canCancelReturn = item.returnStatus === 'requested';
    const canCancelOrder = ['placed', 'pending'].includes(rawStatus);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => setSelectedOrder(item)}
      >
        <View style={styles.orderCardHeader}>
          <View>
            <Text style={styles.orderNumber}>{orderNum}</Text>
            <Text style={styles.orderDate}>{dateStr}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <StatusIcon size={12} color={statusConfig.text} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Items Preview */}
        <View style={styles.itemsPreview}>
          {item.items && item.items.length > 0 ? (
            item.items.map((prod, idx) => (
              <Text key={idx} style={styles.itemTitle} numberOfLines={1}>
                • {prod.name || prod.productId?.name || 'Product'} × {prod.qty || 1}
              </Text>
            ))
          ) : (
            <Text style={styles.itemTitle}>• {item.name || 'Order Item'} × {item.qty || 1}</Text>
          )}
        </View>

        <View style={styles.orderCardFooter}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>
              {formatPrice(item.totalAmount || item.subtotal || item.price || 0)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {canReturn && (
              <TouchableOpacity
                style={styles.cardReturnBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleOpenReturnModal(item);
                }}
              >
                <RotateCcw size={12} color="#fb923c" />
                <Text style={styles.cardReturnText}>Return</Text>
              </TouchableOpacity>
            )}
            <View style={styles.viewInvoiceAction}>
              <FileText size={14} color="#60a5fa" />
              <Text style={styles.viewInvoiceText}>Invoice</Text>
              <ChevronRight size={14} color="#60a5fa" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== 'all') {
        const rawStatus = (order.status || order.orderStatus || 'placed').toLowerCase().replace(/\s+/g, '_');
        const retStatus = String(order.returnStatus || '').toLowerCase().replace(/[\s-]/g, '_');
        const isReturn = (retStatus && retStatus !== 'none') || rawStatus === 'returned' || rawStatus === 'return_requested';

        if (statusFilter === 'returned') {
          if (!isReturn) return false;
        } else if (statusFilter === 'in_transit') {
          if (!['shipped', 'out_for_delivery'].includes(rawStatus)) return false;
        } else if (rawStatus !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orderIdStr = String(order.orderId || order._id || '').toLowerCase();
        const titleStr = String(
          order.productId?.name ||
          (order.items && order.items.map((i) => i.name).join(' ')) ||
          order.name ||
          ''
        ).toLowerCase();
        const vendorStr = String(order.vendorId?.name || '').toLowerCase();
        if (!orderIdStr.includes(q) && !titleStr.includes(q) && !vendorStr.includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      const priceA = Number(a.totalAmount || (a.qty || 1) * (a.price || 0)) || 0;
      const priceB = Number(b.totalAmount || (b.qty || 1) * (b.price || 0)) || 0;
      if (sortBy === 'price_high') return priceB - priceA;
      if (sortBy === 'price_low') return priceA - priceB;
      return 0;
    });
  }, [orders, statusFilter, searchQuery, sortBy]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>{filteredOrders.length} of {orders.length} purchases</Text>
        </View>
      </View>

      {/* Filter and Search Section */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Search size={15} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order ID, item, or vendor..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.trim() ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabsScroll}>
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'placed', label: 'Placed' },
            { id: 'packed', label: 'Packed' },
            { id: 'in_transit', label: 'In Transit' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'returned', label: 'Returns & Refunds' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.statusTabPill, statusFilter === tab.id && styles.statusTabPillActive]}
              onPress={() => setStatusFilter(tab.id)}
            >
              <Text style={[styles.statusTabPillText, statusFilter === tab.id && styles.statusTabPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort Chips */}
        <View style={styles.sortRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ArrowUpDown size={12} color={colors.textMuted} />
            <Text style={styles.sortLabel}>Sort:</Text>
          </View>
          {[
            { id: 'newest', label: 'Newest' },
            { id: 'oldest', label: 'Oldest' },
            { id: 'price_high', label: 'Price: High' },
            { id: 'price_low', label: 'Price: Low' },
          ].map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sortChip, sortBy === s.id && styles.sortChipActive]}
              onPress={() => setSortBy(s.id)}
            >
              <Text style={[styles.sortChipText, sortBy === s.id && styles.sortChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() || statusFilter !== 'all' ? 'No matching orders found' : 'No orders yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim() || statusFilter !== 'all'
                  ? 'Try changing your search terms or filters.'
                  : 'Items you order will be listed here with downloadable tax invoices.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Interactive Tax Invoice & Order Details Modal */}
      {selectedOrder && (
        <Modal
          visible={Boolean(selectedOrder)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedOrder(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              {/* Modal Top Bar */}
              <View style={styles.modalTopBar}>
                <View style={styles.invoiceTitleWrap}>
                  <FileText size={18} color="#38bdf8" />
                  <Text style={styles.invoiceModalHeading}>Official Tax Invoice</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => handleShareInvoice(selectedOrder)}
                  >
                    <Share2 size={16} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelectedOrder(null)}
                  >
                    <X size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.invoiceScrollBody}>
                {/* Official Invoice Header */}
                <View style={styles.invoiceHeaderBox}>
                  <Text style={styles.companyName}>INVENTORY PRIME RETAIL PVT. LTD.</Text>
                  <Text style={styles.companySub}>GSTIN: 37AABCI4821F1Z5 • Registered Tax Invoice</Text>
                  <View style={styles.divider} />

                  <View style={styles.metaRow}>
                    <View>
                      <Text style={styles.metaLabel}>INVOICE NO.</Text>
                      <Text style={styles.metaVal}>
                        INV-{selectedOrder.orderId || selectedOrder._id?.slice(-8).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.metaLabel}>DATE</Text>
                      <Text style={styles.metaVal}>
                        {selectedOrder.createdAt
                          ? new Date(selectedOrder.createdAt).toLocaleDateString('en-IN')
                          : 'Recent'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.metaLabel}>STATUS</Text>
                      <Text style={[styles.metaVal, { color: getOrderStatusMeta(selectedOrder).text }]}>
                        {getOrderStatusMeta(selectedOrder).label.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Pipeline Timeline */}
                {(() => {
                  const { steps, activeIdx, title, isReturn } = getTimelineData(selectedOrder);
                  const activeColor = isReturn ? '#fb923c' : '#2563eb';
                  return (
                    <View style={styles.pipelineBox}>
                      <Text style={[styles.pipelineTitle, isReturn && { color: '#fb923c' }]}>{title}</Text>
                      <View style={styles.stepsRow}>
                        {steps.map((st, idx) => {
                          const isComplete = idx <= activeIdx;
                          return (
                            <View key={st.id} style={styles.stepItem}>
                              <View style={[styles.stepDot, isComplete && { backgroundColor: activeColor }]}>
                                {isComplete ? (
                                  <CheckCircle2 size={12} color="#ffffff" />
                                ) : (
                                  <View style={styles.stepInnerDot} />
                                )}
                              </View>
                              <Text style={[styles.stepLabel, isComplete && styles.stepLabelActive]}>
                                {st.label}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                {/* Shipping & Customer Details */}
                <View style={styles.infoCard}>
                  <View style={styles.infoCardTitleRow}>
                    <MapPin size={15} color="#60a5fa" />
                    <Text style={styles.infoCardTitle}>Delivery Address</Text>
                  </View>
                  <Text style={styles.infoCardName}>
                    {selectedOrder.shippingAddress?.fullName || user?.name || 'Customer'}
                  </Text>
                  <Text style={styles.infoCardText}>
                    {selectedOrder.shippingAddress?.addressLine || selectedOrder.shippingAddress?.addressLine1 || 'Delivery Address'}
                  </Text>
                  <Text style={styles.infoCardText}>
                    {selectedOrder.shippingAddress?.city || 'City'}, {selectedOrder.shippingAddress?.state || 'State'} - {selectedOrder.shippingAddress?.postalCode || selectedOrder.shippingAddress?.pincode || '500001'}
                  </Text>
                  {selectedOrder.shippingAddress?.phone && (
                    <Text style={styles.infoCardText}>Contact: {selectedOrder.shippingAddress.phone}</Text>
                  )}
                </View>

                {/* Itemized Table */}
                <View style={styles.tableBox}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.tableHeadCol, { flex: 2 }]}>Item Description</Text>
                    <Text style={[styles.tableHeadCol, { width: 45, textAlign: 'center' }]}>Qty</Text>
                    <Text style={[styles.tableHeadCol, { width: 80, textAlign: 'right' }]}>Total</Text>
                  </View>

                  {(selectedOrder.items || []).map((it, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={2}>
                        {it.name || it.productId?.name || 'Product Item'}
                      </Text>
                      <Text style={[styles.tableCell, { width: 45, textAlign: 'center' }]}>
                        {it.qty || 1}
                      </Text>
                      <Text style={[styles.tableCell, { width: 80, textAlign: 'right', fontWeight: '700' }]}>
                        {formatPrice((it.price || 0) * (it.qty || 1))}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Financial Summary */}
                <View style={styles.billBox}>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Subtotal</Text>
                    <Text style={styles.billVal}>
                      {formatPrice(selectedOrder.subtotal || selectedOrder.totalAmount || 0)}
                    </Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Estimated GST / Tax (Included)</Text>
                    <Text style={styles.billVal}>
                      {formatPrice(Math.round((selectedOrder.totalAmount || 0) * 0.18))}
                    </Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Express Shipping Delivery</Text>
                    <Text style={[styles.billVal, { color: '#10b981' }]}>FREE</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Payment Mode</Text>
                    <Text style={[styles.billVal, { color: '#38bdf8' }]}>
                      {(selectedOrder.paymentMethod || 'COD').toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.billRow, styles.grandTotalRow]}>
                    <Text style={styles.grandTotalLabel}>Grand Total (INR)</Text>
                    <Text style={styles.grandTotalVal}>
                      {formatPrice(selectedOrder.totalAmount || selectedOrder.subtotal || 0)}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  {/* Order Cancellation */}
                  {['placed', 'pending'].includes((selectedOrder.status || '').toLowerCase()) && (
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => handleCancelOrder(selectedOrder._id)}
                    >
                      <Text style={styles.modalCancelText}>Cancel This Order</Text>
                    </TouchableOpacity>
                  )}

                  {/* Return Request Button */}
                  {(selectedOrder.status || '').toLowerCase() === 'delivered' &&
                    (!selectedOrder.returnStatus || selectedOrder.returnStatus === 'none') && (
                      <TouchableOpacity
                        style={styles.modalReturnBtn}
                        onPress={() => {
                          const target = selectedOrder;
                          setSelectedOrder(null);
                          handleOpenReturnModal(target);
                        }}
                      >
                        <RotateCcw size={16} color="#fb923c" />
                        <Text style={styles.modalReturnBtnText}>Request Return & Refund</Text>
                      </TouchableOpacity>
                    )}

                  {/* Cancel Return Button */}
                  {selectedOrder.returnStatus === 'requested' && (
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => handleCancelReturn(selectedOrder._id)}
                    >
                      <Text style={styles.modalCancelText}>Cancel Return Request</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.modalDoneBtn}
                    onPress={() => setSelectedOrder(null)}
                  >
                    <Text style={styles.modalDoneText}>Close Invoice</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Return & Refund Modal */}
      {showReturnModal && returnOrderTarget && (
        <Modal
          visible={showReturnModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowReturnModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalTopBar}>
                <View style={styles.invoiceTitleWrap}>
                  <RotateCcw size={18} color="#fb923c" />
                  <Text style={styles.invoiceModalHeading}>Request Return & Refund</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowReturnModal(false)}
                >
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.invoiceScrollBody}>
                <Text style={styles.returnSubNotice}>
                  Please choose a reason for returning order #{returnOrderTarget.orderId || returnOrderTarget._id?.slice(-6).toUpperCase()}. Reverse courier pickup will be arranged.
                </Text>

                <Text style={styles.inputSectionLabel}>Select Reason for Return</Text>
                {[
                  'Defective or damaged item',
                  'Wrong item received',
                  'Quality not as expected',
                  'Missing parts or accessories',
                  'No longer needed / Changed mind',
                ].map((reason) => {
                  const isSelected = returnReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                      onPress={() => setReturnReason(reason)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 4 }}>
                  <Text style={[styles.inputSectionLabel, { marginTop: 0, marginBottom: 0 }]}>Additional Comments (Optional)</Text>
                  <AiWriteButton
                    task="return_request"
                    input={returnComments}
                    context={{
                      orderId: returnOrderTarget?.orderId || returnOrderTarget?._id,
                      productName: returnOrderTarget?.items?.[0]?.product?.name || returnOrderTarget?.items?.[0]?.name || 'Purchased Item',
                      reason: returnReason,
                    }}
                    onGenerated={(res) => {
                      const text = res.message || res.text || res.result || '';
                      if (text) setReturnComments(text);
                    }}
                    label={returnComments.trim() ? "✨ Polish / Rewrite" : "✨ AI Draft"}
                  />
                </View>
                <TextInput
                  style={styles.returnCommentInput}
                  placeholder="Tell us what went wrong so we can resolve it faster..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={returnComments}
                  onChangeText={setReturnComments}
                />

                <View style={styles.returnActionRow}>
                  <TouchableOpacity
                    style={styles.returnCancelBtn}
                    onPress={() => setShowReturnModal(false)}
                    disabled={submittingReturn}
                  >
                    <Text style={styles.returnCancelBtnText}>Dismiss</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.returnSubmitBtn, submittingReturn && { opacity: 0.6 }]}
                    onPress={handleSubmitReturn}
                    disabled={submittingReturn}
                  >
                    {submittingReturn ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.returnSubmitBtnText}>Submit Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  headerSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  authSub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#0c121e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 10,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  orderDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemsPreview: {
    backgroundColor: '#070b14',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  itemTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  totalAmount: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '800',
  },
  viewInvoiceAction: {
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
  viewInvoiceText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 40,
  },
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
    maxHeight: '90%',
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  invoiceTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceModalHeading: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  shareBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  invoiceScrollBody: {
    padding: 20,
  },
  invoiceHeaderBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  companyName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  companySub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  metaVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  pipelineBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  pipelineTitle: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepDotActive: {
    backgroundColor: '#2563eb',
  },
  stepInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748b',
  },
  stepLabel: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  infoCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoCardTitle: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoCardName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  infoCardText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  tableBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeadCol: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tableCell: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  billBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
    gap: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  billVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  grandTotalVal: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '900',
  },
  modalActions: {
    gap: 10,
  },
  modalCancelBtn: {
    backgroundColor: '#450a0a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  modalCancelText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
  },
  modalDoneBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 0,
  },
  statusTabsScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  statusTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusTabPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  statusTabPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
    paddingBottom: 4,
  },
  sortLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  sortChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sortChipActive: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderColor: '#3b82f6',
  },
  sortChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  cardReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#451a03',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ea580c',
  },
  cardReturnText: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '700',
  },
  modalReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#451a03',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ea580c',
  },
  modalReturnBtnText: {
    color: '#fb923c',
    fontSize: 13,
    fontWeight: '700',
  },
  returnSubNotice: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputSectionLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: '#ea580c',
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#fb923c',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fb923c',
  },
  reasonText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  returnCommentInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    textAlignVertical: 'top',
    height: 80,
    marginBottom: 20,
  },
  returnActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  returnCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  returnCancelBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  returnSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

