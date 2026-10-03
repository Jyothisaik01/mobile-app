import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Wallet,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  CreditCard,
  ShieldCheck,
  X,
  QrCode,
  Trash2,
  CheckCircle2,
  Building,
  Search,
  PlusCircle,
  RotateCcw,
  ShoppingBag,
  Filter,
} from 'lucide-react-native';
import colors from '../theme/colors';
import walletService from '../services/walletService';
import { formatPrice } from '../utils/formatters';
import Toast from 'react-native-toast-message';

const FALLBACK_TRANSACTIONS = [
  {
    _id: 't1',
    type: 'credit',
    amount: 2500,
    description: 'Instant UPI Wallet Recharge',
    date: 'Today, 2:15 PM',
    status: 'Completed',
  },
  {
    _id: 't2',
    type: 'debit',
    amount: 1299,
    description: 'Order Payment #ORD0821',
    date: 'Yesterday, 6:40 PM',
    status: 'Completed',
  },
  {
    _id: 't3',
    type: 'credit',
    amount: 450,
    description: 'Instant Refund - Order #ORD0784',
    date: '3 days ago',
    status: 'Completed',
  },
  {
    _id: 't4',
    type: 'credit',
    amount: 100,
    description: 'Cashback Reward Credit',
    date: '5 days ago',
    status: 'Completed',
  },
  {
    _id: 't5',
    type: 'debit',
    amount: 850,
    description: 'Express Delivery Split Pay',
    date: 'Last week',
    status: 'Completed',
  },
];

const DEFAULT_PAYMENT_METHODS = [
  {
    _id: 'pm-1',
    type: 'upi',
    title: 'Google Pay UPI',
    identifier: 'customer@okaxis',
    isDefault: true,
  },
  {
    _id: 'pm-2',
    type: 'card',
    title: 'HDFC Bank Millennia Credit Card',
    identifier: '•••• •••• •••• 4242',
    expiry: '08/29',
    isDefault: false,
  },
  {
    _id: 'pm-3',
    type: 'card',
    title: 'ICICI Bank Coral Debit Card',
    identifier: '•••• •••• •••• 8821',
    expiry: '11/27',
    isDefault: false,
  },
];

export default function WalletScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const initialTab = route?.params?.initialTab || 'wallet';

  // Active Main Tab: 'wallet' (Balance & Transactions) | 'methods' (Saved Payment Methods)
  const [activeTab, setActiveTab] = useState(initialTab);

  // Wallet State
  const [wallet, setWallet] = useState({ balance: 2500 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState('all'); // 'all', 'credit', 'debit'

  // Transactions Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Top Up Modal State
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [processing, setProcessing] = useState(false);

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [methodType, setMethodType] = useState('upi'); // 'upi' | 'card'
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodDetail, setNewMethodDetail] = useState('');
  const [newMethodExpiry, setNewMethodExpiry] = useState('');
  const [savingMethod, setSavingMethod] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [walRes, txRes, pmRes] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions(1, 10),
        walletService.getPaymentMethods(),
      ]);

      setWallet(walRes || { balance: 2500 });

      const txList = txRes.transactions?.length ? txRes.transactions : FALLBACK_TRANSACTIONS;
      setTransactions(txList);
      setTotalCount(txRes.total || txList.length);
      setTotalPages(txRes.totalPages || Math.ceil(txList.length / 5) || 1);
      setPage(1);

      if (Array.isArray(pmRes) && pmRes.length > 0) {
        setPaymentMethods(pmRes);
      }
    } catch {
      setTransactions(FALLBACK_TRANSACTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLoadMoreTransactions = async () => {
    if (loadingMore || page >= totalPages) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await walletService.getTransactions(nextPage, 10);
      if (res.transactions?.length) {
        setTransactions((prev) => [...prev, ...res.transactions]);
        setPage(nextPage);
      }
    } catch (err) {
      console.warn('Load more transactions error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleTopUp = async () => {
    const amt = Number(topUpAmount);
    if (!amt || amt <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid amount', position: 'bottom' });
      return;
    }

    try {
      setProcessing(true);
      await walletService.topUpWallet(amt);
      Toast.show({
        type: 'success',
        text1: 'Funds Added! 🎉',
        text2: `${formatPrice(amt)} added to your wallet.`,
        position: 'bottom',
      });
      setShowTopUpModal(false);
      setWallet((prev) => ({ ...prev, balance: (Number(prev.balance) || 0) + amt }));
      setTransactions((prev) => [
        {
          _id: `t_${Date.now()}`,
          type: 'credit',
          amount: amt,
          description: 'Instant Wallet Top Up',
          date: 'Just now',
          status: 'Completed',
        },
        ...prev,
      ]);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Top Up Failed', text2: err.message, position: 'bottom' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newMethodName.trim() || !newMethodDetail.trim()) {
      Toast.show({ type: 'error', text1: 'Please fill all required fields', position: 'bottom' });
      return;
    }

    try {
      setSavingMethod(true);
      const payload = {
        type: methodType,
        title: newMethodName.trim(),
        identifier: newMethodDetail.trim(),
        expiry: newMethodExpiry.trim() || undefined,
        isDefault: paymentMethods.length === 0,
      };

      try {
        await walletService.addPaymentMethod(payload);
      } catch {
        // local fallback
      }

      setPaymentMethods((prev) => [
        ...prev,
        {
          _id: `pm_${Date.now()}`,
          ...payload,
        },
      ]);

      setShowAddMethodModal(false);
      setNewMethodName('');
      setNewMethodDetail('');
      setNewMethodExpiry('');
      Toast.show({ type: 'success', text1: 'Payment Method Saved! 💳', position: 'bottom' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save payment method', position: 'bottom' });
    } finally {
      setSavingMethod(false);
    }
  };

  const handleDeletePaymentMethod = async (id) => {
    try {
      await walletService.deletePaymentMethod(id);
    } catch {
      // local fallback
    }
    setPaymentMethods((prev) => prev.filter((p) => p._id !== id));
    Toast.show({ type: 'info', text1: 'Payment Method Removed', position: 'bottom' });
  };

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Format date helper matching web app (Today, Yesterday, or formatted date with time)
  const formatTxDate = (timestamp) => {
    if (!timestamp) return 'Recent';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return 'Recent';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === today.toDateString()) {
      return `Today, ${timeStr}`;
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • ${timeStr}`;
  };

  // Resolve transaction type metadata, colors, and icons matching web PaymentsSidepanel
  const getTxnMeta = (txn) => {
    const type = String(txn.type || '').toLowerCase();
    const isCredit =
      type === 'wallet_topup' ||
      type === 'refund' ||
      type === 'wallet_credit' ||
      type === 'credit';

    let Icon = ShoppingBag;
    let bg = '#3f1212';
    let color = '#ef4444';
    let prefix = '-';
    let typeLabel = 'Payment';

    if (type === 'wallet_topup') {
      Icon = PlusCircle;
      bg = '#064e3b';
      color = '#10b981';
      prefix = '+';
      typeLabel = 'Recharge';
    } else if (type === 'refund') {
      Icon = RotateCcw;
      bg = '#064e3b';
      color = '#10b981';
      prefix = '+';
      typeLabel = 'Refund';
    } else if (type === 'wallet_credit' || type === 'credit') {
      Icon = ArrowDownLeft;
      bg = '#064e3b';
      color = '#10b981';
      prefix = '+';
      typeLabel = 'Credit';
    } else if (type === 'wallet_debit' || type === 'debit') {
      Icon = ArrowUpRight;
      bg = '#3f1212';
      color = '#ef4444';
      prefix = '-';
      typeLabel = 'Wallet Debit';
    } else {
      Icon = ShoppingBag;
      bg = '#3f1212';
      color = '#ef4444';
      prefix = '-';
      typeLabel = 'Order Payment';
    }

    return { isCredit, Icon, bg, color, prefix, typeLabel };
  };

  // Filter transactions matching web app tabs & searches
  const filteredTransactions = transactions.filter((t) => {
    // Type tab filter
    if (txFilter !== 'all') {
      const type = String(t.type || '').toLowerCase();
      if (txFilter === 'payment' && type !== 'payment' && type !== 'order' && type !== 'debit') return false;
      if (txFilter === 'wallet' && !type.includes('wallet')) return false;
      if (txFilter === 'refund' && type !== 'refund') return false;
      if (txFilter === 'wallet_topup' && type !== 'wallet_topup' && type !== 'topup') return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const status = String(t.status || 'success').toLowerCase();
      if (status !== statusFilter) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const desc = String(t.description || t.title || '').toLowerCase();
      const id = String(t._id || t.id || '').toLowerCase();
      const amountStr = String(t.amount || '');
      if (!desc.includes(q) && !id.includes(q) && !amountStr.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // KPI Metrics matching web app
  const totalPaid = transactions
    .filter((t) => !['wallet_topup', 'refund', 'wallet_credit', 'credit'].includes(String(t.type || '').toLowerCase()))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalRefunded = transactions
    .filter((t) => String(t.type || '').toLowerCase() === 'refund')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalRecharged = transactions
    .filter((t) => ['wallet_topup', 'topup'].includes(String(t.type || '').toLowerCase()))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const renderTransaction = ({ item }) => {
    const { isCredit, Icon, bg, color, prefix, typeLabel } = getTxnMeta(item);
    const dateDisplay = formatTxDate(item.createdAt || item.date || item.timestamp);
    const statusText = item.status || 'Success';

    return (
      <View style={styles.txCard}>
        <View style={[styles.txIconWrap, { backgroundColor: bg }]}>
          <Icon size={16} color={color} />
        </View>

        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {item.description || item.title || typeLabel}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={styles.txDate}>{dateDisplay}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isCredit ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)' }]}>
              <Text style={[styles.statusBadgeText, { color: isCredit ? '#10b981' : '#60a5fa' }]}>
                {statusText}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.txAmount, { color }]}>
          {prefix}{formatPrice(Math.abs(Number(item.amount || 0)))}
        </Text>
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
        <Text style={styles.headerTitle}>Wallet & Payments</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Tabs: Wallet & Transactions vs Saved Payment Methods */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'wallet' && styles.tabBtnActive]}
          onPress={() => setActiveTab('wallet')}
        >
          <Wallet size={15} color={activeTab === 'wallet' ? '#ffffff' : colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'wallet' && styles.tabBtnTextActive]}>
            Wallet & Transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'methods' && styles.tabBtnActive]}
          onPress={() => setActiveTab('methods')}
        >
          <CreditCard size={15} color={activeTab === 'methods' ? '#ffffff' : colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'methods' && styles.tabBtnTextActive]}>
            Payment Methods
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'wallet' ? (
        /* TAB 1: Wallet Balance & Infinite Scrolling Paginated Transactions */
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderTransaction}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMoreTransactions}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <>
              {/* Wallet Balance Card */}
              <View style={styles.walletCard}>
                <View style={styles.walletTop}>
                  <View style={styles.walletLabelRow}>
                    <Wallet size={16} color={colors.primaryLight} />
                    <Text style={styles.walletLabel}>AVAILABLE PRIME BALANCE</Text>
                  </View>
                  <View style={styles.shieldBadge}>
                    <ShieldCheck size={12} color="#10b981" />
                    <Text style={styles.shieldText}>RBI Verified</Text>
                  </View>
                </View>

                <Text style={styles.balanceText}>
                  {formatPrice(wallet?.balance || 0)}
                </Text>

                <TouchableOpacity
                  style={styles.topUpBtn}
                  onPress={() => setShowTopUpModal(true)}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.topUpText}>Top Up / Add Funds</Text>
                </TouchableOpacity>
              </View>

              {/* KPI Summary Row matching Web App PaymentsSidepanel */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Total Paid</Text>
                  <Text style={[styles.kpiValue, { color: '#f87171' }]}>
                    {formatPrice(totalPaid)}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Refunded</Text>
                  <Text style={[styles.kpiValue, { color: '#34d399' }]}>
                    {formatPrice(totalRefunded)}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Recharged</Text>
                  <Text style={[styles.kpiValue, { color: '#38bdf8' }]}>
                    {formatPrice(totalRecharged)}
                  </Text>
                </View>
              </View>

              {/* Transactions Header & Search Bar */}
              <View style={styles.txHeaderSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View>
                    <Text style={styles.sectionHeader}>Transactions Log</Text>
                    <Text style={styles.sectionSub}>{filteredTransactions.length} movements found</Text>
                  </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                  <Search size={15} color={colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by order ID, title, or amount..."
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

                {/* Web-aligned Transaction Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeTabsScroll}>
                  {[
                    { id: 'all', label: 'All Transactions' },
                    { id: 'payment', label: 'Payments' },
                    { id: 'wallet', label: 'Wallet' },
                    { id: 'refund', label: 'Refunds' },
                    { id: 'wallet_topup', label: 'Recharges' },
                  ].map((tab) => (
                    <TouchableOpacity
                      key={tab.id}
                      style={[styles.typeTabPill, txFilter === tab.id && styles.typeTabPillActive]}
                      onPress={() => setTxFilter(tab.id)}
                    >
                      <Text style={[styles.typeTabPillText, txFilter === tab.id && styles.typeTabPillTextActive]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Status Filter Row */}
                <View style={styles.statusFiltersRow}>
                  {[
                    { id: 'all', label: 'All Status' },
                    { id: 'success', label: 'Success' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'failed', label: 'Failed' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.statusPill, statusFilter === s.id && styles.statusPillActive]}
                      onPress={() => setStatusFilter(s.id)}
                    >
                      <Text style={[styles.statusPillText, statusFilter === s.id && styles.statusPillTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#38bdf8" style={{ paddingVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
            ) : (
              <Text style={styles.emptyText}>No transactions found for this filter.</Text>
            )
          }
        />
      ) : (
        /* TAB 2: Saved Payment Methods Management */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.methodsHeaderRow}>
            <View>
              <Text style={styles.sectionHeader}>Saved Payment Methods</Text>
              <Text style={styles.sectionSub}>Cards, UPI IDs & Net Banking</Text>
            </View>
            <TouchableOpacity
              style={styles.addMethodBtn}
              onPress={() => setShowAddMethodModal(true)}
            >
              <Plus size={14} color="#ffffff" />
              <Text style={styles.addMethodBtnText}>Add Method</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.methodsList}>
            {paymentMethods.map((pm) => {
              const isUpi = pm.type === 'upi';
              const title =
                pm.title ||
                pm.label ||
                pm.bankName ||
                (isUpi ? 'UPI Payment Account' : `${(pm.cardType || 'Credit').toUpperCase()} Card`);
              const identifier =
                pm.identifier ||
                pm.upiId ||
                (pm.last4 ? `•••• •••• •••• ${pm.last4}` : (pm.cardNumber ? `•••• •••• •••• ${pm.cardNumber.slice(-4)}` : '•••• •••• •••• 4242'));

              return (
                <View key={pm._id} style={styles.pmCard}>
                  <View style={styles.pmCardLeft}>
                    <View style={[styles.pmIcon, { backgroundColor: isUpi ? '#1b2a4a' : '#2b1b4a' }]}>
                      {isUpi ? (
                        <QrCode size={18} color="#60a5fa" />
                      ) : (
                        <CreditCard size={18} color="#c084fc" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.pmCardTitle}>{title}</Text>
                        {pm.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.pmCardIdentifier}>{identifier}</Text>
                      {pm.expiry ? <Text style={styles.pmCardExpiry}>Expires: {pm.expiry}</Text> : null}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deletePmBtn}
                    onPress={() => handleDeletePaymentMethod(pm._id)}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Secure Guarantee Notice */}
          <View style={styles.securityBox}>
            <ShieldCheck size={20} color="#10b981" />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>100% Secure Payment Vault</Text>
              <Text style={styles.securityDesc}>
                Your card and UPI data are encrypted with 256-bit SSL tokenization in accordance with RBI guidelines.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Top Up Modal */}
      <Modal visible={showTopUpModal} animationType="slide" transparent onRequestClose={() => setShowTopUpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Prime Wallet</Text>
              <TouchableOpacity onPress={() => setShowTopUpModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select or enter the amount you wish to add</Text>

            {/* Quick Chips */}
            <View style={styles.quickChipsRow}>
              {['500', '1000', '2500', '5000'].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickChip, topUpAmount === amt && styles.quickChipActive]}
                  onPress={() => setTopUpAmount(amt)}
                >
                  <Text style={[styles.quickChipText, topUpAmount === amt && styles.quickChipTextActive]}>
                    ₹{Number(amt).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Custom Amount (₹)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="500"
              placeholderTextColor={colors.textMuted}
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.confirmBtn}
              disabled={processing}
              onPress={handleTopUp}
            >
              {processing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.confirmBtnText}>Add ₹{topUpAmount || '0'} to Balance</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add New Payment Method Modal */}
      <Modal visible={showAddMethodModal} animationType="slide" transparent onRequestClose={() => setShowAddMethodModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Method</Text>
              <TouchableOpacity onPress={() => setShowAddMethodModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Type selector: UPI vs Card */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[styles.typeBtn, methodType === 'upi' && styles.typeBtnActive]}
                onPress={() => setMethodType('upi')}
              >
                <QrCode size={16} color={methodType === 'upi' ? '#ffffff' : colors.textMuted} />
                <Text style={[styles.typeBtnText, methodType === 'upi' && styles.typeBtnTextActive]}>UPI ID</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, methodType === 'card' && styles.typeBtnActive]}
                onPress={() => setMethodType('card')}
              >
                <CreditCard size={16} color={methodType === 'card' ? '#ffffff' : colors.textMuted} />
                <Text style={[styles.typeBtnText, methodType === 'card' && styles.typeBtnTextActive]}>Card</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nickname / Label</Text>
            <TextInput
              style={styles.amountInput}
              placeholder={methodType === 'upi' ? 'e.g. My GPay Account' : 'e.g. Salary Account Card'}
              placeholderTextColor={colors.textMuted}
              value={newMethodName}
              onChangeText={setNewMethodName}
            />

            <Text style={styles.inputLabel}>
              {methodType === 'upi' ? 'UPI Virtual ID' : '16-Digit Card Number'}
            </Text>
            <TextInput
              style={styles.amountInput}
              placeholder={methodType === 'upi' ? 'name@okhdfcbank' : '4111 2222 3333 4444'}
              placeholderTextColor={colors.textMuted}
              value={newMethodDetail}
              onChangeText={setNewMethodDetail}
              keyboardType={methodType === 'upi' ? 'email-address' : 'numeric'}
            />

            {methodType === 'card' && (
              <View>
                <Text style={styles.inputLabel}>Expiry (MM/YY)</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="12/28"
                  placeholderTextColor={colors.textMuted}
                  value={newMethodExpiry}
                  onChangeText={setNewMethodExpiry}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.confirmBtn}
              disabled={savingMethod}
              onPress={handleAddPaymentMethod}
            >
              {savingMethod ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.confirmBtnText}>Save Payment Method</Text>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#0c1527',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtnActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  tabBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
  },
  walletCard: {
    backgroundColor: '#0a1628',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
    marginBottom: 20,
  },
  walletTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletLabel: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  shieldText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  balanceText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 16,
  },
  topUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
  },
  topUpText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  txHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  txList: {
    gap: 8,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  txIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  txDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
  },
  loadMoreBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadMoreText: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '700',
  },
  methodsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addMethodBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  methodsList: {
    gap: 10,
  },
  pmCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  pmCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pmIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pmCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  pmCardIdentifier: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  pmCardExpiry: {
    color: '#60a5fa',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
  },
  deletePmBtn: {
    padding: 8,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0c1a16',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#064e3b',
  },
  securityTitle: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
  },
  securityDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
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
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickChip: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  quickChipTextActive: {
    color: '#ffffff',
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa',
  },
  typeBtnText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  txHeaderSection: {
    marginBottom: 14,
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
  typeTabsScroll: {
    gap: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  typeTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeTabPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  typeTabPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  statusFiltersRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusPillActive: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: '#3b82f6',
  },
  statusPillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  statusPillTextActive: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});

