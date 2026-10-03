import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Bookmark,
  MapPin,
  CreditCard,
  QrCode,
  Wallet,
  Truck,
  CheckCircle2,
  X,
  PlusCircle,
  Tag,
  Sparkles,
  Navigation,
  Users,
  ChevronRight,
} from 'lucide-react-native';
import colors from '../theme/colors';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import cartService from '../services/cartService';
import orderService from '../services/orderService';
import addressService from '../services/addressService';
import AddressMapModal from '../components/AddressMapModal';
import productService from '../services/productService';
import CouponsModal, { calculateCouponSavings } from '../components/CouponsModal';
import { formatPrice } from '../utils/formatters';
import Toast from 'react-native-toast-message';

const AVAILABLE_COUPONS = [
  { code: 'HUB10', label: '10% OFF', title: '10% Storewide Unlimited', desc: '10% instant savings on your entire cart', minOrder: 0, type: 'percent', discountValue: 10, value: 10 },
  { code: 'WELCOME30', label: '30% OFF', title: 'Welcome 30% OFF', desc: '30% discount on your first shopping journey', minOrder: 499, type: 'percent', discountValue: 30, value: 30 },
  { code: 'TECHBOOST', label: '₹500 OFF', title: '₹500 Instant Tech Boost', desc: 'Flat ₹500 instant discount', minOrder: 2499, type: 'flat', discountValue: 500, value: 500 },
  { code: 'FREESHIP', label: 'FREE EXP', title: 'Free Express Delivery', desc: 'Free express courier delivery', minOrder: 299, type: 'shipping', discountValue: 40, value: 40 },
  { code: 'FASHION25', label: '25% OFF', title: '25% Apparel & Style', desc: 'Flat 25% discount on apparel', minOrder: 999, type: 'percent', discountValue: 25, value: 25 },
];

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery (COD)', desc: 'Pay with cash upon doorstep delivery', icon: Truck },
  { id: 'upi', label: 'Instant UPI / QR', desc: 'Google Pay, PhonePe, Paytm, BHIM', icon: QrCode },
  { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay, Amex', icon: CreditCard },
  { id: 'wallet', label: 'Digital Prime Wallet', desc: 'Instant 1-tap checkout balance', icon: Wallet },
];

export default function CartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    cartItems,
    savedItems,
    cartTotal,
    updateQty,
    removeFromCart,
    saveForLaterItem,
    moveToCartItem,
    clearCart,
    refreshCart,
  } = useCart();
  const { isAuthenticated, user } = useAuth();

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Delivery Address, 2: Payment Method, 3: Order Review
  const [checkingOut, setCheckingOut] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState('cod');

  // New Address form within checkout
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPincode, setNewPincode] = useState('');

  // Coupon Voucher State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [showMapModalInCheckout, setShowMapModalInCheckout] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Available Coupons Modal State & Live Fetch
  const [couponsModalVisible, setCouponsModalVisible] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState(AVAILABLE_COUPONS);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCoupons = async () => {
      setLoadingCoupons(true);
      try {
        const list = await productService.getPublicCoupons();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setAvailableCoupons(list);
        }
      } catch (err) {
        console.warn('Failed to load public coupons:', err?.message);
      } finally {
        if (isMounted) setLoadingCoupons(false);
      }
    };
    fetchCoupons();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      if (e?.endCoordinates?.height) {
        setKeyboardHeight(e.endCoordinates.height);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    return calculateCouponSavings(appliedCoupon, cartTotal, 0);
  };

  const discountAmount = calculateDiscount();
  const grandTotal = Math.max(0, cartTotal - discountAmount);

  const handleApplyCoupon = (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      Toast.show({ type: 'info', text1: 'Enter Coupon Code', position: 'bottom' });
      return;
    }

    const matched =
      availableCoupons.find((c) => c.code?.toUpperCase() === code) ||
      AVAILABLE_COUPONS.find((c) => c.code?.toUpperCase() === code);

    if (matched) {
      const minSpend = Number(matched.minOrderAmount ?? matched.minOrder ?? 0);
      if (cartTotal < minSpend) {
        Toast.show({
          type: 'error',
          text1: 'Minimum Order Not Met',
          text2: `Coupon ${matched.code} requires minimum order of ₹${minSpend}`,
          position: 'bottom',
        });
        return;
      }
      setAppliedCoupon(matched);
      setCouponInput('');
      setCouponsModalVisible(false);
      const isPct = matched.discountType === 'percentage' || matched.type === 'percent' || matched.type === 'percentage';
      const badge = matched.label || (isPct ? `${matched.discountValue || matched.value}% OFF` : `₹${matched.discountValue || matched.value} OFF`);
      Toast.show({
        type: 'success',
        text1: `Coupon ${matched.code} Applied! 🎉`,
        text2: `You unlocked ${badge} savings!`,
        position: 'bottom',
      });
    } else {
      const customCoupon = {
        code,
        label: '10% OFF',
        desc: 'Promotional Store Voucher',
        minOrder: 199,
        type: 'percent',
        discountValue: 10,
        value: 10,
      };
      setAppliedCoupon(customCoupon);
      setCouponInput('');
      setCouponsModalVisible(false);
      Toast.show({
        type: 'success',
        text1: `Coupon ${code} Applied! ✨`,
        text2: '10% promotional discount applied',
        position: 'bottom',
      });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    Toast.show({ type: 'info', text1: 'Coupon Removed', position: 'bottom' });
  };
  useEffect(() => {
    if (isCheckoutOpen && isAuthenticated) {
      loadAddresses();
    }
  }, [isCheckoutOpen, isAuthenticated]);

  const loadAddresses = async () => {
    try {
      const addrs = await addressService.getAddresses();
      setAddresses(addrs);
      if (addrs.length > 0) {
        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        setSelectedAddressId(defaultAddr._id);
      } else {
        setIsAddingNewAddress(true);
      }
    } catch (e) {
      console.warn('Failed to load addresses:', e);
    }
  };

  const handleOpenCheckout = () => {
    if (!isAuthenticated) {
      Toast.show({
        type: 'info',
        text1: 'Sign In Required',
        text2: 'Please sign in to complete your purchase.',
        position: 'bottom',
      });
      navigation.navigate('Login');
      return;
    }
    if (cartItems.length === 0) return;
    setCheckoutStep(1);
    setIsCheckoutOpen(true);
  };

  const handleProceedToPayment = () => {
    if (!selectedAddressId && addresses.length > 0) {
      Toast.show({ type: 'error', text1: 'Address Required', text2: 'Please select a delivery address.', position: 'bottom' });
      return;
    }
    if (addresses.length === 0 && !isAddingNewAddress) {
      setIsAddingNewAddress(true);
      Toast.show({ type: 'info', text1: 'Add Address', text2: 'Please enter a delivery address.', position: 'bottom' });
      return;
    }
    setCheckoutStep(2);
  };

  const handleProceedToReview = () => {
    if (!selectedPayment) {
      Toast.show({ type: 'error', text1: 'Payment Method Required', text2: 'Please select a payment method.', position: 'bottom' });
      return;
    }
    setCheckoutStep(3);
  };

  const handleCreateNewAddress = async () => {
    if (!newFullName.trim() || !newAddressLine.trim() || !newCity.trim() || !newPincode.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill name, address, city, and pincode.',
        position: 'bottom',
      });
      return;
    }

    try {
      const payload = {
        fullName: newFullName.trim(),
        phone: newPhone.trim() || '9876543210',
        addressLine1: newAddressLine.trim(),
        city: newCity.trim(),
        state: newState.trim() || 'State',
        pincode: newPincode.trim(),
        isDefault: true,
      };
      const created = await addressService.createAddress(payload);
      const newAddrId = created._id || created.id;
      setAddresses([created, ...addresses]);
      setSelectedAddressId(newAddrId);
      setIsAddingNewAddress(false);
      Toast.show({ type: 'success', text1: 'Address Saved', position: 'bottom' });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: err.response?.data?.msg || 'Could not save address.',
        position: 'bottom',
      });
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedAddressId && addresses.length > 0) {
      Toast.show({ type: 'error', text1: 'Address Required', text2: 'Please select a delivery address.', position: 'bottom' });
      return;
    }

    try {
      setCheckingOut(true);

      const itemsPayload = cartItems.map((item) => ({
        productId: item.productId?._id || item.productId || item._id,
        qty: Number(item.qty) || 1,
        price: Number(item.price || item.productId?.price || 0),
        name: item.productId?.name || item.name || 'Product',
      }));

      const chosenAddr = addresses.find((a) => a._id === selectedAddressId);
      const checkoutPayload = {
        items: itemsPayload,
        subtotal: cartTotal,
        discount: discountAmount,
        totalAmount: grandTotal,
        coupon: appliedCoupon ? { code: appliedCoupon.code, discount: discountAmount } : null,
        paymentMethod: selectedPayment,
        addressId: selectedAddressId,
        shippingAddress: chosenAddr
          ? {
              fullName: chosenAddr.fullName,
              phone: chosenAddr.phone,
              addressLine: chosenAddr.addressLine1 || chosenAddr.addressLine,
              city: chosenAddr.city,
              state: chosenAddr.state,
              postalCode: chosenAddr.pincode,
              country: 'India',
            }
          : {
              addressLine: 'Prime Delivery Address',
              city: 'Fulfillment City',
              postalCode: '500001',
              country: 'India',
            },
      };

      try {
        await cartService.checkoutCart(checkoutPayload);
      } catch (err1) {
        // Fallback to orderService.createOrder
        await orderService.createOrder(checkoutPayload);
      }

      clearCart();
      setIsCheckoutOpen(false);
      Toast.show({
        type: 'success',
        text1: 'Order Confirmed! 🎉',
        text2: 'Your order was placed successfully.',
        position: 'bottom',
      });
      navigation.navigate('Orders');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Order Failed',
        text2: err.response?.data?.msg || 'Could not complete order. Please check balance or details.',
        position: 'bottom',
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const renderCartItem = ({ item }) => {
    const prod = item.productId || item;
    const name = item.name || prod.name || 'Product';
    const price = Number(item.price || prod.price || 0);
    const qty = Number(item.qty) || 1;
    const imageUrl =
      item.image ||
      prod.image ||
      (Array.isArray(prod.images) && typeof prod.images[0] === 'string' ? prod.images[0] : null) ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60';

    return (
      <View style={styles.cartCard}>
        <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />

        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.itemPrice}>{formatPrice(price * qty)}</Text>
          <Text style={styles.unitPrice}>{formatPrice(price)} each</Text>

          <View style={styles.actionRow}>
            {/* Stepper */}
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => updateQty(item._id, qty - 1)}
              >
                <Minus size={13} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.stepperQty}>{qty}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => updateQty(item._id, qty + 1)}
              >
                <Plus size={13} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Save For Later */}
            <TouchableOpacity
              style={styles.saveLaterBtn}
              onPress={() => saveForLaterItem(item._id)}
            >
              <Bookmark size={13} color="#38bdf8" />
              <Text style={styles.saveLaterText}>Save</Text>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => removeFromCart(item._id)}
            >
              <Trash2 size={15} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderSavedItem = ({ item }) => {
    const prod = item.productId || item;
    const name = item.name || prod.name || 'Product';
    const price = Number(item.price || prod.price || 0);
    const imageUrl =
      item.image ||
      prod.image ||
      (Array.isArray(prod.images) && typeof prod.images[0] === 'string' ? prod.images[0] : null) ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60';

    return (
      <View style={styles.savedCard}>
        <Image source={{ uri: imageUrl }} style={styles.savedThumb} resizeMode="cover" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.savedName} numberOfLines={1}>{name}</Text>
          <Text style={styles.savedPrice}>{formatPrice(price)}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <TouchableOpacity
              style={styles.moveToBagBtn}
              onPress={() => moveToCartItem(item._id)}
            >
              <ShoppingBag size={12} color="#ffffff" />
              <Text style={styles.moveToBagText}>Move to Bag</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.savedDeleteBtn}
              onPress={() => removeFromCart(item._id)}
            >
              <Text style={styles.savedDeleteText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Bag</Text>
        <Text style={styles.itemCountText}>{cartItems.length} items</Text>
      </View>

      {/* Shared Cart / Group Shopping Banner */}
      <TouchableOpacity
        style={styles.sharedCartBanner}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('SharedCart')}
      >
        <View style={styles.sharedCartIconWrap}>
          <Users size={16} color="#c084fc" />
        </View>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.sharedCartBannerTitle}>Group Shopping & Shared Cart</Text>
          <Text style={styles.sharedCartBannerSub}>Shop with friends, vote on items & split bills</Text>
        </View>
        <View style={styles.sharedCartBannerBtn}>
          <Text style={styles.sharedCartBannerBtnText}>Open</Text>
          <ChevronRight size={13} color="#c084fc" />
        </View>
      </TouchableOpacity>

      {cartItems.length === 0 && savedItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Your bag is empty</Text>
          <Text style={styles.emptySubtitle}>Explore our catalog and find the best items today.</Text>
          <TouchableOpacity
            style={styles.startShoppingBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.startShoppingText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mainContent}>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item._id || String(Math.random())}
            renderItem={renderCartItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: 160 + keyboardHeight }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListFooterComponent={
              savedItems.length > 0 ? (
                <View style={styles.savedSection}>
                  <View style={styles.savedSectionHeader}>
                    <Bookmark size={16} color="#38bdf8" />
                    <Text style={styles.savedSectionTitle}>Saved for Later ({savedItems.length})</Text>
                  </View>
                  <FlatList
                    data={savedItems}
                    keyExtractor={(item) => item._id || String(Math.random())}
                    renderItem={renderSavedItem}
                    scrollEnabled={false}
                  />
                </View>
              ) : null
            }
          />

          {/* Checkout Bottom Sheet Panel */}
          {cartItems.length > 0 && (
            <View
              style={[
                styles.checkoutPanel,
                {
                  bottom: keyboardHeight,
                  paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 16),
                },
              ]}
            >
              {/* Promo Coupon Section */}
              <View style={styles.couponContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Tag size={14} color="#38bdf8" />
                    <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>Apply Promo Coupon</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCouponsModalVisible(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }}>
                      View All ({availableCoupons.length})
                    </Text>
                    <ChevronRight size={13} color="#38bdf8" />
                  </TouchableOpacity>
                </View>

                <View style={styles.couponInputRow}>
                  <Tag size={15} color="#38bdf8" />
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Enter Coupon / Promo Code"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                    value={couponInput}
                    onChangeText={setCouponInput}
                  />
                  <TouchableOpacity
                    style={styles.applyCouponBtn}
                    onPress={() => handleApplyCoupon()}
                  >
                    <Text style={styles.applyCouponBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>

                {/* Available Coupon Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.couponChipsScroll}>
                  {availableCoupons.map((cp) => {
                    const code = cp.code;
                    const isApplied = appliedCoupon?.code?.toUpperCase() === code?.toUpperCase();
                    const isPct = cp.discountType === 'percentage' || cp.type === 'percent' || cp.type === 'percentage';
                    const discountVal = cp.discountValue ?? cp.value ?? 0;
                    const badge = cp.label || (isPct ? `${discountVal}% OFF` : `₹${discountVal} OFF`);
                    return (
                      <TouchableOpacity
                        key={cp._id || code}
                        style={[styles.couponChip, isApplied && styles.couponChipActive]}
                        onPress={() => (isApplied ? handleRemoveCoupon() : handleApplyCoupon(code))}
                      >
                        <Sparkles size={11} color={isApplied ? '#ffffff' : '#38bdf8'} />
                        <Text style={[styles.couponChipCode, isApplied && styles.couponChipCodeActive]}>
                          {code}
                        </Text>
                        <Text style={[styles.couponChipLabel, isApplied && styles.couponChipLabelActive]}>
                          ({badge})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatPrice(cartTotal)}</Text>
              </View>

              {appliedCoupon && (
                <View style={styles.summaryRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Tag size={13} color="#10b981" />
                    <Text style={[styles.summaryLabel, { color: '#10b981', fontWeight: '700' }]}>
                      Coupon ({appliedCoupon.code})
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.summaryValue, { color: '#10b981', fontWeight: '700' }]}>
                      -{formatPrice(discountAmount)}
                    </Text>
                    <TouchableOpacity onPress={handleRemoveCoupon}>
                      <X size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Delivery</Text>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>FREE</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(grandTotal)}</Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                activeOpacity={0.8}
                onPress={handleOpenCheckout}
              >
                <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                <ArrowRight size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Interactive 3-Step Checkout Wizard Modal */}
      <Modal visible={isCheckoutOpen} animationType="slide" transparent onRequestClose={() => setIsCheckoutOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.modalOverlay,
            Platform.OS === 'android' && { paddingBottom: keyboardHeight },
          ]}
        >
          <View style={[styles.modalCard, { paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 20) }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order Checkout</Text>
                <Text style={styles.modalSub}>{cartItems.length} items • Total {formatPrice(cartTotal)}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCheckoutOpen(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* 3-Step Wizard Progress Bar */}
            <View style={styles.wizardIndicatorRow}>
              {[
                { num: 1, label: 'Address' },
                { num: 2, label: 'Payment' },
                { num: 3, label: 'Review' },
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <View style={styles.wizardStepItem}>
                    <View style={[styles.wizardStepBadge, checkoutStep >= s.num && styles.wizardStepBadgeActive]}>
                      <Text style={[styles.wizardStepBadgeText, checkoutStep >= s.num && styles.wizardStepBadgeTextActive]}>
                        {checkoutStep > s.num ? '✓' : s.num}
                      </Text>
                    </View>
                    <Text style={[styles.wizardStepLabel, checkoutStep === s.num && styles.wizardStepLabelActive]}>
                      {s.label}
                    </Text>
                  </View>
                  {idx < 2 && (
                    <View style={[styles.wizardLine, checkoutStep > s.num && styles.wizardLineActive]} />
                  )}
                </React.Fragment>
              ))}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={{ maxHeight: keyboardHeight > 0 ? 280 : 440 }}
            >
              {/* STEP 1: Delivery Address */}
              {checkoutStep === 1 && (
                <View style={styles.checkoutSection}>
                  <View style={styles.sectionHeadingRow}>
                    <MapPin size={16} color="#60a5fa" />
                    <Text style={styles.sectionHeading}>Step 1: Select Delivery Address</Text>
                  </View>

                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr._id;
                    return (
                      <TouchableOpacity
                        key={addr._id}
                        style={[styles.addressItem, isSelected && styles.addressItemActive]}
                        onPress={() => setSelectedAddressId(addr._id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addrName}>{addr.fullName || 'Home Address'}</Text>
                          <Text style={styles.addrText}>
                            {addr.addressLine1 || addr.addressLine}, {addr.city} {addr.pincode}
                          </Text>
                          {addr.phone && <Text style={styles.addrPhone}>Phone: {addr.phone}</Text>}
                        </View>
                        {isSelected && <CheckCircle2 size={18} color="#10b981" />}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Action Buttons for Address */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      style={styles.pinMapCheckoutBtn}
                      onPress={() => setShowMapModalInCheckout(true)}
                    >
                      <Navigation size={14} color="#ffffff" />
                      <Text style={styles.pinMapCheckoutBtnText}>Pin on Map 🗺️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addNewAddrBtn, { flex: 1, marginTop: 0 }]}
                      onPress={() => setIsAddingNewAddress(!isAddingNewAddress)}
                    >
                      <PlusCircle size={15} color="#38bdf8" />
                      <Text style={styles.addNewAddrText}>
                        {isAddingNewAddress ? 'Hide Form' : '+ New Address'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isAddingNewAddress && (
                    <View style={styles.newAddrForm}>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Recipient Full Name"
                        placeholderTextColor="#64748b"
                        value={newFullName}
                        onChangeText={setNewFullName}
                      />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Mobile Phone"
                        placeholderTextColor="#64748b"
                        value={newPhone}
                        onChangeText={setNewPhone}
                        keyboardType="phone-pad"
                      />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Street Address / Flat No"
                        placeholderTextColor="#64748b"
                        value={newAddressLine}
                        onChangeText={setNewAddressLine}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[styles.formInput, { flex: 1 }]}
                          placeholder="City"
                          placeholderTextColor="#64748b"
                          value={newCity}
                          onChangeText={setNewCity}
                        />
                        <TextInput
                          style={[styles.formInput, { flex: 1 }]}
                          placeholder="Pincode"
                          placeholderTextColor="#64748b"
                          value={newPincode}
                          onChangeText={setNewPincode}
                          keyboardType="number-pad"
                        />
                      </View>
                      <TouchableOpacity style={styles.saveNewAddrBtn} onPress={handleCreateNewAddress}>
                        <Text style={styles.saveNewAddrBtnText}>Save Address</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* STEP 2: Payment Method */}
              {checkoutStep === 2 && (
                <View style={styles.checkoutSection}>
                  <View style={styles.sectionHeadingRow}>
                    <CreditCard size={16} color="#38bdf8" />
                    <Text style={styles.sectionHeading}>Step 2: Choose Payment Method</Text>
                  </View>

                  {PAYMENT_METHODS.map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = selectedPayment === pm.id;
                    return (
                      <TouchableOpacity
                        key={pm.id}
                        style={[styles.paymentItem, isSelected && styles.paymentItemActive]}
                        onPress={() => setSelectedPayment(pm.id)}
                      >
                        <View style={styles.pmIconWrap}>
                          <Icon size={18} color={isSelected ? '#38bdf8' : '#94a3b8'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pmLabel, isSelected && { color: '#38bdf8' }]}>{pm.label}</Text>
                          <Text style={styles.pmDesc}>{pm.desc}</Text>
                        </View>
                        {isSelected && <CheckCircle2 size={18} color="#10b981" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* STEP 3: Order Review & Confirmation */}
              {checkoutStep === 3 && (
                <View style={styles.checkoutSection}>
                  <View style={styles.sectionHeadingRow}>
                    <ShieldCheck size={16} color="#10b981" />
                    <Text style={styles.sectionHeading}>Step 3: Review & Confirm Order</Text>
                  </View>

                  {/* Delivery Address Review */}
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MapPin size={14} color="#60a5fa" />
                        <Text style={styles.reviewTitle}>Deliver To</Text>
                      </View>
                      <TouchableOpacity onPress={() => setCheckoutStep(1)}>
                        <Text style={styles.reviewChangeText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                    {(() => {
                      const addr = addresses.find((a) => a._id === selectedAddressId) || addresses[0];
                      return addr ? (
                        <View>
                          <Text style={styles.reviewRecipient}>{addr.fullName}</Text>
                          <Text style={styles.reviewDetailText}>
                            {addr.addressLine1 || addr.addressLine}, {addr.city} {addr.pincode}
                          </Text>
                          {addr.phone && <Text style={styles.reviewDetailText}>Phone: {addr.phone}</Text>}
                        </View>
                      ) : (
                        <Text style={styles.reviewDetailText}>Default Prime Address</Text>
                      );
                    })()}
                  </View>

                  {/* Payment Method Review */}
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CreditCard size={14} color="#38bdf8" />
                        <Text style={styles.reviewTitle}>Payment Method</Text>
                      </View>
                      <TouchableOpacity onPress={() => setCheckoutStep(2)}>
                        <Text style={styles.reviewChangeText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                    {(() => {
                      const pm = PAYMENT_METHODS.find((p) => p.id === selectedPayment) || PAYMENT_METHODS[0];
                      return (
                        <View>
                          <Text style={styles.reviewRecipient}>{pm.label}</Text>
                          <Text style={styles.reviewDetailText}>{pm.desc}</Text>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Items Summary in Review */}
                  <View style={styles.reviewCard}>
                    <Text style={[styles.reviewTitle, { marginBottom: 10 }]}>Order Items ({cartItems.length})</Text>
                    {cartItems.map((ci, index) => {
                      const pName = ci.productId?.name || ci.name || 'Product';
                      const pPrice = Number(ci.price || ci.productId?.price || 0);
                      const pQty = Number(ci.qty || 1);
                      return (
                        <View key={ci.productId?._id || ci._id || index} style={styles.reviewItemRow}>
                          <Text style={styles.reviewItemName} numberOfLines={1}>{pName}</Text>
                          <Text style={styles.reviewItemQty}>x{pQty}</Text>
                          <Text style={styles.reviewItemPrice}>{formatPrice(pPrice * pQty)}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Coupon & Discount in Review Step */}
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Tag size={14} color="#38bdf8" />
                        <Text style={styles.reviewTitle}>Coupon & Discounts</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setCouponsModalVisible(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }}>
                          View All ({availableCoupons.length})
                        </Text>
                        <ChevronRight size={13} color="#38bdf8" />
                      </TouchableOpacity>
                    </View>

                    {appliedCoupon ? (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#10b981',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <CheckCircle2 size={16} color="#10b981" />
                          <View>
                            <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 13 }}>{appliedCoupon.code} Applied</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>
                              Saved {formatPrice(discountAmount)} with this order
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => setCouponsModalVisible(true)}
                            style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(56, 189, 248, 0.15)' }}
                          >
                            <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>Change</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleRemoveCoupon}
                            style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                          >
                            <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.couponInputRow}>
                          <Tag size={15} color="#38bdf8" />
                          <TextInput
                            style={styles.couponInput}
                            placeholder="Enter Coupon / Promo Code"
                            placeholderTextColor="#64748b"
                            autoCapitalize="characters"
                            value={couponInput}
                            onChangeText={setCouponInput}
                          />
                          <TouchableOpacity style={styles.applyCouponBtn} onPress={() => handleApplyCoupon()}>
                            <Text style={styles.applyCouponBtnText}>Apply</Text>
                          </TouchableOpacity>
                        </View>

                        {/* View All Available Coupons Banner */}
                        <TouchableOpacity
                          style={styles.viewCouponsBannerBtn}
                          onPress={() => setCouponsModalVisible(true)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Sparkles size={13} color="#f59e0b" />
                            <Text style={styles.viewCouponsBannerText}>
                              View Available Coupons ({availableCoupons.length} offers)
                            </Text>
                          </View>
                          <ChevronRight size={14} color="#f59e0b" />
                        </TouchableOpacity>

                        {/* Quick Available Coupon Chips */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.couponChipsScroll}>
                          {availableCoupons.map((cp) => {
                            const code = cp.code;
                            const isApplied = appliedCoupon?.code?.toUpperCase() === code?.toUpperCase();
                            const isPct = cp.discountType === 'percentage' || cp.type === 'percent' || cp.type === 'percentage';
                            const discountVal = cp.discountValue ?? cp.value ?? 0;
                            const badge = cp.label || (isPct ? `${discountVal}% OFF` : `₹${discountVal} OFF`);
                            return (
                              <TouchableOpacity
                                key={cp._id || code}
                                style={[styles.couponChip, isApplied && styles.couponChipActive]}
                                onPress={() => (isApplied ? handleRemoveCoupon() : handleApplyCoupon(code))}
                              >
                                <Sparkles size={11} color={isApplied ? '#ffffff' : '#38bdf8'} />
                                <Text style={[styles.couponChipCode, isApplied && styles.couponChipCodeActive]}>
                                  {code}
                                </Text>
                                <Text style={[styles.couponChipLabel, isApplied && styles.couponChipLabelActive]}>
                                  ({badge})
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </>
                    )}
                  </View>

                  {/* Bill Breakdown */}
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewBillRow}>
                      <Text style={styles.reviewBillLabel}>Items Subtotal</Text>
                      <Text style={styles.reviewBillValue}>{formatPrice(cartTotal)}</Text>
                    </View>
                    {appliedCoupon && (
                      <View style={styles.reviewBillRow}>
                        <Text style={[styles.reviewBillLabel, { color: '#10b981' }]}>Coupon ({appliedCoupon.code})</Text>
                        <Text style={[styles.reviewBillValue, { color: '#10b981', fontWeight: '700' }]}>-{formatPrice(discountAmount)}</Text>
                      </View>
                    )}
                    <View style={styles.reviewBillRow}>
                      <Text style={styles.reviewBillLabel}>Express Shipping</Text>
                      <Text style={[styles.reviewBillValue, { color: '#10b981' }]}>FREE</Text>
                    </View>
                    <View style={[styles.reviewBillRow, styles.reviewBillRowTotal]}>
                      <Text style={styles.reviewBillTotalLabel}>Grand Total</Text>
                      <Text style={styles.reviewBillTotalValue}>{formatPrice(grandTotal)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions based on step */}
            {checkoutStep === 1 && (
              <TouchableOpacity
                style={styles.confirmOrderBtn}
                onPress={handleProceedToPayment}
              >
                <Text style={styles.confirmOrderText}>Continue to Payment</Text>
                <ArrowRight size={18} color="#ffffff" />
              </TouchableOpacity>
            )}

            {checkoutStep === 2 && (
              <View style={styles.wizardBtnRow}>
                <TouchableOpacity
                  style={styles.wizardBackBtn}
                  onPress={() => setCheckoutStep(1)}
                >
                  <ArrowLeft size={16} color="#94a3b8" />
                  <Text style={styles.wizardBackBtnText}>Address</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmOrderBtn, { flex: 2, marginTop: 0 }]}
                  onPress={handleProceedToReview}
                >
                  <Text style={styles.confirmOrderText}>Review Order</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            {checkoutStep === 3 && (
              <View style={styles.wizardBtnRow}>
                <TouchableOpacity
                  style={styles.wizardBackBtn}
                  onPress={() => setCheckoutStep(2)}
                  disabled={checkingOut}
                >
                  <ArrowLeft size={16} color="#94a3b8" />
                  <Text style={styles.wizardBackBtnText}>Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmOrderBtn, { flex: 2, marginTop: 0, backgroundColor: '#10b981' }]}
                  onPress={handleConfirmOrder}
                  disabled={checkingOut}
                >
                  {checkingOut ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.confirmOrderText}>Confirm & Place Order</Text>
                      <ArrowRight size={18} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Address Map Modal inside Checkout Flow */}
      <AddressMapModal
        visible={showMapModalInCheckout}
        onClose={() => setShowMapModalInCheckout(false)}
        onAddressSaved={(saved) => {
          const newId = saved?._id || saved?.id;
          setAddresses((prev) => [saved, ...prev]);
          if (newId) setSelectedAddressId(newId);
        }}
      />

      {/* Available Coupons Modal */}
      <CouponsModal
        visible={couponsModalVisible}
        onClose={() => setCouponsModalVisible(false)}
        coupons={availableCoupons}
        appliedCoupon={appliedCoupon}
        cartTotal={cartTotal}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        loading={loadingCoupons}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  itemCountText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  sharedCartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#120d24',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b1d60',
  },
  sharedCartIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedCartBannerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sharedCartBannerSub: {
    color: '#a78bfa',
    fontSize: 11,
    marginTop: 1,
  },
  sharedCartBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  sharedCartBannerBtnText: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#0c121e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 14,
  },
  itemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemPrice: {
    color: '#34d399',
    fontSize: 15,
    fontWeight: '800',
  },
  unitPrice: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperQty: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  saveLaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#0c2238',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  saveLaterText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
  },
  savedSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 16,
  },
  savedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  savedSectionTitle: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  savedThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  savedName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  savedPrice: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  moveToBagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  moveToBagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  savedDeleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  savedDeleteText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startShoppingBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startShoppingText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  checkoutPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#070b14',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginBottom: 14,
  },
  totalLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  totalValue: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: '900',
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0a0f1d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  checkoutSection: {
    marginBottom: 20,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  addressItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#172554',
  },
  addrName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  addrText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  addNewAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  addNewAddrText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  newAddrForm: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
    marginBottom: 10,
  },
  formInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
  },
  saveNewAddrBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveNewAddrBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  paymentItemActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c2238',
  },
  pmIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pmLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  pmDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  confirmOrderBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  confirmOrderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  wizardIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  wizardStepItem: {
    alignItems: 'center',
    gap: 4,
  },
  wizardStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardStepBadgeActive: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa',
  },
  wizardStepBadgeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  wizardStepBadgeTextActive: {
    color: '#ffffff',
  },
  wizardStepLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  wizardStepLabelActive: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  wizardLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#1e293b',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  wizardLineActive: {
    backgroundColor: '#2563eb',
  },
  wizardBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  wizardBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  wizardBackBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
  },
  addrPhone: {
    color: '#60a5fa',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewTitle: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewChangeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewRecipient: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewDetailText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  reviewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  reviewItemName: {
    color: '#ffffff',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  reviewItemQty: {
    color: '#94a3b8',
    fontSize: 12,
    marginRight: 12,
  },
  reviewItemPrice: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  reviewBillLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  reviewBillValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewBillRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 8,
    paddingTop: 8,
  },
  reviewBillTotalLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  reviewBillTotalValue: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '900',
  },
  couponContainer: {
    marginBottom: 12,
    gap: 8,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 8,
  },
  couponInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 6,
    fontWeight: '600',
  },
  applyCouponBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  applyCouponBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  viewCouponsBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  viewCouponsBannerText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  couponChipsScroll: {
    flexDirection: 'row',
  },
  couponChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  couponChipActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#38bdf8',
  },
  couponChipCode: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  couponChipCodeActive: {
    color: '#ffffff',
  },
  couponChipLabel: {
    color: '#94a3b8',
    fontSize: 10,
  },
  couponChipLabelActive: {
    color: '#93c5fd',
  },
  pinMapCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pinMapCheckoutBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
