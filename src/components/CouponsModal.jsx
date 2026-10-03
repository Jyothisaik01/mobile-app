import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Tag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  ArrowRight,
  TrendingDown,
  Gift,
} from 'lucide-react-native';
import { formatPrice } from '../utils/formatters';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export function calculateCouponSavings(c, subtotal = 0, deliveryFee = 0) {
  if (!c) return 0;
  const isShip = c.code === 'FREESHIP' || c.discountType === 'shipping' || c.type === 'shipping';
  if (isShip) return deliveryFee || 40;

  const isPct = c.discountType === 'percentage' || c.type === 'percent' || c.type === 'percentage';
  const val = Number(c.discountValue ?? c.value ?? 0);
  const maxCap = c.maxDiscountAmount ? Number(c.maxDiscountAmount) : (c.cap || Infinity);

  if (isPct) {
    return Math.min(Math.round((subtotal * val) / 100), maxCap);
  }
  return Math.min(val, subtotal);
}

export default function CouponsModal({
  visible,
  onClose,
  coupons = [],
  appliedCoupon = null,
  cartTotal = 0,
  onApplyCoupon,
  onRemoveCoupon,
  loading = false,
}) {
  const insets = useSafeAreaInsets();
  const [inputCode, setInputCode] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'eligible' | 'best'

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const minSpend = Number(c.minOrderAmount ?? c.minOrder ?? 0);
      const isEligible = cartTotal >= minSpend;

      if (activeFilter === 'eligible') {
        return isEligible;
      }
      if (activeFilter === 'best') {
        const savings = calculateCouponSavings(c, cartTotal);
        return savings > 100 || (c.discountValue >= 20 && (c.discountType === 'percentage' || c.type === 'percent'));
      }
      return true;
    });
  }, [coupons, cartTotal, activeFilter]);

  const handleManualApply = () => {
    const code = inputCode.trim().toUpperCase();
    if (!code) {
      Toast.show({ type: 'info', text1: 'Enter Coupon Code', text2: 'Please type a valid promo code' });
      return;
    }
    onApplyCoupon(code);
    setInputCode('');
  };

  const handleCopy = (code) => {
    setInputCode(code);
    Toast.show({
      type: 'success',
      text1: 'Code Filled! 📋',
      text2: `Code "${code}" entered into coupon box`,
      position: 'bottom',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconWrap}>
                <Gift size={20} color="#38bdf8" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Available Coupons</Text>
                <Text style={styles.headerSubtitle}>
                  {coupons.length} exclusive promo offers available
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Manual Input Row */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Tag size={16} color="#64748b" style={styles.inputTagIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter Coupon / Promo Code"
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                value={inputCode}
                onChangeText={setInputCode}
              />
              {inputCode.trim().length > 0 && (
                <TouchableOpacity onPress={() => setInputCode('')} style={styles.clearInputBtn}>
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.applyBtn, !inputCode.trim() && { opacity: 0.5 }]}
              disabled={!inputCode.trim()}
              onPress={handleManualApply}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {/* Currently Applied Banner */}
          {appliedCoupon && (
            <View style={styles.appliedBanner}>
              <View style={styles.appliedBannerLeft}>
                <CheckCircle2 size={18} color="#10b981" />
                <View>
                  <Text style={styles.appliedCodeText}>{appliedCoupon.code} Applied</Text>
                  <Text style={styles.appliedSavingText}>
                    Saving {formatPrice(calculateCouponSavings(appliedCoupon, cartTotal))} with this order
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onRemoveCoupon} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Filter Pills */}
          <View style={styles.filterTabsRow}>
            {[
              { id: 'all', label: `All (${coupons.length})` },
              { id: 'eligible', label: 'Eligible for Cart' },
              { id: 'best', label: '⚡ Top Savings' },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setActiveFilter(tab.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Coupons List */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.loadingText}>Fetching available discounts...</Text>
            </View>
          ) : filteredCoupons.length === 0 ? (
            <View style={styles.emptyWrap}>
              <AlertCircle size={36} color="#64748b" />
              <Text style={styles.emptyTitle}>No matching coupons found</Text>
              <Text style={styles.emptySub}>
                Try selecting "All" or add more items to your shopping cart to unlock special tiers.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {filteredCoupons.map((cp) => {
                const code = cp.code;
                const isApplied = appliedCoupon?.code?.toUpperCase() === code?.toUpperCase();
                const minSpend = Number(cp.minOrderAmount ?? cp.minOrder ?? 0);
                const isEligible = cartTotal >= minSpend;
                const savings = calculateCouponSavings(cp, cartTotal);
                const isPct = cp.discountType === 'percentage' || cp.type === 'percent' || cp.type === 'percentage';
                const discountVal = cp.discountValue ?? cp.value ?? 0;
                const badgeLabel = cp.label || (isPct ? `${discountVal}% OFF` : `₹${discountVal} OFF`);

                return (
                  <View
                    key={cp._id || cp.code}
                    style={[
                      styles.couponCard,
                      isApplied && styles.couponCardApplied,
                      !isEligible && styles.couponCardIneligible,
                    ]}
                  >
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.codeWrap}>
                        <View style={[styles.codeBadge, isApplied && styles.codeBadgeApplied]}>
                          <Tag size={13} color={isApplied ? '#10b981' : '#38bdf8'} />
                          <Text style={[styles.codeText, isApplied && styles.codeTextApplied]}>
                            {code}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyBtn}
                          onPress={() => handleCopy(code)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Copy size={13} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.discountPill, isApplied && styles.discountPillApplied]}>
                        <Text style={[styles.discountPillText, isApplied && styles.discountPillTextApplied]}>
                          {badgeLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Title & Description */}
                    <Text style={styles.couponTitle}>{cp.title || cp.desc || `${badgeLabel} on your purchase`}</Text>
                    {cp.description ? (
                      <Text style={styles.couponDesc}>{cp.description}</Text>
                    ) : cp.desc ? (
                      <Text style={styles.couponDesc}>{cp.desc}</Text>
                    ) : null}

                    {/* Savings Indicator */}
                    {isEligible && savings > 0 && (
                      <View style={styles.savingsRow}>
                        <Sparkles size={13} color="#10b981" />
                        <Text style={styles.savingsText}>
                          Saves {formatPrice(savings)} on this order
                        </Text>
                      </View>
                    )}

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Footer Actions */}
                    <View style={styles.cardFooter}>
                      <View style={styles.conditionBox}>
                        {isEligible ? (
                          <View style={styles.conditionRow}>
                            <CheckCircle2 size={13} color="#10b981" />
                            <Text style={styles.eligibleText}>
                              {minSpend > 0 ? `Min. spend ${formatPrice(minSpend)} met` : 'No minimum spend'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.conditionRow}>
                            <AlertCircle size={13} color="#f59e0b" />
                            <Text style={styles.ineligibleText}>
                              Add {formatPrice(minSpend - cartTotal)} more to unlock
                            </Text>
                          </View>
                        )}
                      </View>

                      {isApplied ? (
                        <TouchableOpacity
                          style={styles.appliedBtn}
                          onPress={onRemoveCoupon}
                          activeOpacity={0.8}
                        >
                          <CheckCircle2 size={14} color="#10b981" />
                          <Text style={styles.appliedBtnText}>Applied</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.cardApplyBtn,
                            !isEligible && styles.cardApplyBtnDisabled,
                          ]}
                          disabled={!isEligible}
                          onPress={() => onApplyCoupon(code)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.cardApplyBtnText,
                              !isEligible && styles.cardApplyBtnTextDisabled,
                            ]}
                          >
                            Apply Coupon
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0a0f1d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#070b14',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1527',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
  },
  inputTagIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 10,
    letterSpacing: 0.5,
  },
  clearInputBtn: {
    padding: 4,
  },
  applyBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  appliedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  appliedCodeText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  appliedSavingText: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  removeBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterTabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  filterTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  couponCard: {
    backgroundColor: '#0d1527',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
  },
  couponCardApplied: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  couponCardIneligible: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeBadgeApplied: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderStyle: 'solid',
  },
  codeText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  codeTextApplied: {
    color: '#10b981',
  },
  copyBtn: {
    padding: 4,
  },
  discountPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountPillApplied: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  discountPillText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  discountPillTextApplied: {
    color: '#10b981',
  },
  couponTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  couponDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  savingsText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conditionBox: {
    flex: 1,
    marginRight: 10,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eligibleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  ineligibleText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
  },
  cardApplyBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cardApplyBtnDisabled: {
    backgroundColor: '#1e293b',
  },
  cardApplyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardApplyBtnTextDisabled: {
    color: '#64748b',
  },
  appliedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appliedBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  emptyWrap: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
