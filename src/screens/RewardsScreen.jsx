import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gift,
  ArrowLeft,
  Crown,
  Sparkles,
  Ticket,
  CheckCircle2,
} from 'lucide-react-native';
import colors from '../theme/colors';
import rewardsService from '../services/rewardsService';
import Toast from 'react-native-toast-message';

export default function RewardsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [rewards, setRewards] = useState({ points: 450, tier: 'Platinum Tier' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await rewardsService.getRewards();
        if (data) setRewards(data);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRedeem = (couponName, cost) => {
    if (rewards.points < cost) {
      Toast.show({ type: 'error', text1: 'Insufficient Points', text2: `You need ${cost} points for this coupon.`, position: 'bottom' });
      return;
    }
    setRewards((prev) => ({ ...prev, points: prev.points - cost }));
    Toast.show({ type: 'success', text1: 'Coupon Redeemed! 🎟️', text2: `${couponName} applied to your account.`, position: 'bottom' });
  };

  const COUPONS = [
    { id: 'c1', title: '₹250 Off Next Order', cost: 100, desc: 'Valid on orders over ₹1,000' },
    { id: 'c2', title: '₹500 Premium Voucher', cost: 250, desc: 'Valid on all electronics & apparel' },
    { id: 'c3', title: '₹1,500 VIP Reward', cost: 500, desc: 'Unlocks free express shipping for 1 month' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loyalty Rewards</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Tier Card */}
        <View style={styles.tierCard}>
          <View style={styles.tierTop}>
            <View style={styles.tierBadge}>
              <Crown size={14} color="#f59e0b" />
              <Text style={styles.tierBadgeText}>{rewards.tier || 'Gold VIP'}</Text>
            </View>
            <Sparkles size={18} color="#f59e0b" />
          </View>

          <Text style={styles.pointsNumber}>{rewards.points || 0}</Text>
          <Text style={styles.pointsLabel}>AVAILABLE REWARD POINTS</Text>

          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { width: `${Math.min(100, (rewards.points / 500) * 100)}%` }]} />
          </View>
          <Text style={styles.progressSub}>Earn 50 more points to reach Diamond VIP Tier</Text>
        </View>

        {/* Coupons List */}
        <Text style={styles.sectionHeader}>Redeem Available Vouchers</Text>
        <View style={styles.couponsList}>
          {COUPONS.map((c) => (
            <View key={c.id} style={styles.couponCard}>
              <View style={styles.couponLeft}>
                <View style={styles.ticketIcon}>
                  <Ticket size={20} color={colors.primaryLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.couponTitle}>{c.title}</Text>
                  <Text style={styles.couponDesc}>{c.desc}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.redeemBtn}
                onPress={() => handleRedeem(c.title, c.cost)}
              >
                <Text style={styles.redeemText}>{c.cost} pts</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  tierCard: {
    backgroundColor: '#120f06',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#382a0a',
    padding: 20,
    marginBottom: 24,
  },
  tierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  tierBadgeText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
  },
  pointsNumber: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
  },
  pointsLabel: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 16,
  },
  progressWrap: {
    height: 6,
    backgroundColor: '#261b04',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  progressSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  couponsList: {
    gap: 10,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  ticketIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#121426',
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  couponDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  redeemBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  redeemText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
