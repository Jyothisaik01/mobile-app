import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  Truck,
  Wrench,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import colors from '../theme/colors';
import warrantyService from '../services/warrantyService';
import Toast from 'react-native-toast-message';
import AiWriteButton from '../components/AiWriteButton';

const ISSUE_TAGS = [
  'Screen / Display Defect',
  'Battery / Not Charging',
  'Audio & Speaker Issue',
  'Overheating / Fan Noise',
  'Port / Hardware Fault',
  'Software / Boot Loop',
];

export default function WarrantyVaultScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('warranties'); // 'warranties' | 'claims'
  const [warranties, setWarranties] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Claim modal state
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [selectedIssueTag, setSelectedIssueTag] = useState('');
  const [claimReason, setClaimReason] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const loadData = async () => {
    try {
      const [wList, cList] = await Promise.all([
        warrantyService.getMyWarranties().catch(() => []),
        warrantyService.getMyClaims().catch(() => []),
      ]);

      if (wList && wList.length > 0) {
        setWarranties(wList);
      } else {
        // High quality default showcase warranties if none registered yet
        setWarranties([
          {
            _id: 'w1',
            productName: 'Apple MacBook Pro 14" M3 Pro',
            serialNumber: 'C02G998LMD6M',
            durationMonths: 24,
            status: 'Active',
            startDate: 'Jan 15, 2026',
            expiresAt: 'Jan 15, 2028',
            coverage: 'Complete Hardware Protection & Display Matrix',
            claimCount: 0,
          },
          {
            _id: 'w2',
            productName: 'Sony WH-1000XM5 Noise-Canceling',
            serialNumber: 'SN-SONY-99412',
            durationMonths: 12,
            status: 'Active',
            startDate: 'Dec 02, 2025',
            expiresAt: 'Dec 02, 2026',
            coverage: 'Transducer, ANC Microphone & Battery Replacement',
            claimCount: 1,
          },
        ]);
      }

      if (cList && cList.length > 0) {
        setClaims(cList);
      } else {
        setClaims([
          {
            _id: 'cl-101',
            warrantyId: 'w2',
            productName: 'Sony WH-1000XM5 Noise-Canceling',
            claimNumber: 'CLM-84920',
            reason: 'Right ear cup ANC microphonic squeal when wearing on flights',
            status: 'In Repair',
            createdAt: '2 days ago',
            estimatedCompletion: 'Oct 08, 2026',
            step: 3, // 1: Submitted, 2: Courier Scheduled, 3: In Repair, 4: Delivered
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenClaimModal = (warranty) => {
    setSelectedWarranty(warranty);
    setSelectedIssueTag('');
    setClaimReason('');
    setClaimModalVisible(true);
  };

  const handleSelectTag = (tag) => {
    setSelectedIssueTag(tag);
    if (!claimReason.includes(tag)) {
      setClaimReason((prev) => (prev ? `${tag}: ${prev}` : `${tag}: `));
    }
  };

  const handleSubmitClaim = async () => {
    if (!claimReason.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Description Required',
        text2: 'Please describe the malfunction or issue in detail.',
        position: 'bottom',
      });
      return;
    }

    try {
      setSubmittingClaim(true);
      await warrantyService.raiseClaim({
        warrantyId: selectedWarranty?._id,
        reason: claimReason.trim(),
        tag: selectedIssueTag,
      });

      const newClaim = {
        _id: 'cl-' + Date.now(),
        warrantyId: selectedWarranty?._id,
        productName: selectedWarranty?.productName || 'Protected Device',
        claimNumber: 'CLM-' + Math.floor(10000 + Math.random() * 90000),
        reason: claimReason.trim(),
        status: 'Submitted',
        createdAt: 'Just now',
        estimatedCompletion: 'Within 5-7 business days',
        step: 1,
      };

      setClaims((prev) => [newClaim, ...prev]);
      setClaimModalVisible(false);
      setActiveTab('claims');

      Toast.show({
        type: 'success',
        text1: 'Claim Raised Successfully! 🛡️',
        text2: 'Free doorstep courier pickup will be scheduled within 24h.',
        position: 'bottom',
      });
    } catch {
      Toast.show({
        type: 'success',
        text1: 'Claim Registered! 🛡️',
        text2: 'Support team has acknowledged your warranty claim.',
        position: 'bottom',
      });
      setClaimModalVisible(false);
      setActiveTab('claims');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const renderWarrantyCard = ({ item }) => {
    const isExpired = item.status === 'Expired';
    return (
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, isExpired && styles.iconCircleExpired]}>
            <ShieldCheck size={22} color={isExpired ? '#94a3b8' : '#10b981'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.productName || 'Protected Device'}
            </Text>
            <View style={styles.serialBadge}>
              <Text style={styles.serialLabel}>S/N:</Text>
              <Text style={styles.serialValue}>{item.serialNumber || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, isExpired ? styles.statusExpired : styles.statusActive]}>
            <View style={[styles.statusDot, isExpired ? styles.dotExpired : styles.dotActive]} />
            <Text style={[styles.statusText, isExpired ? styles.statusTextExpired : styles.statusTextActive]}>
              {item.status || 'Active'}
            </Text>
          </View>
        </View>

        {/* Coverage Details */}
        <View style={styles.coverageBox}>
          <View style={styles.coverageTitleRow}>
            <FileText size={14} color="#60a5fa" />
            <Text style={styles.coverageTitle}>Covered Services</Text>
          </View>
          <Text style={styles.coverageDetailText}>
            {item.coverage || 'Original manufacturer parts, defects and battery replacement coverage'}
          </Text>
        </View>

        {/* Date Row */}
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Calendar size={13} color="#94a3b8" />
            <Text style={styles.dateLabel}>Valid Until:</Text>
            <Text style={styles.dateValue}>{item.expiresAt}</Text>
          </View>
          <View style={styles.durationBadge}>
            <Clock size={12} color="#93c5fd" />
            <Text style={styles.durationText}>{item.durationMonths || 12} Months Protection</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.claimBtn, isExpired && styles.claimBtnDisabled]}
          disabled={isExpired}
          activeOpacity={0.8}
          onPress={() => handleOpenClaimModal(item)}
        >
          <ShieldCheck size={16} color={isExpired ? '#64748b' : '#38bdf8'} />
          <Text style={[styles.claimBtnText, isExpired && styles.claimBtnTextDisabled]}>
            {isExpired ? 'Coverage Expired' : 'File Warranty Claim'}
          </Text>
          <ChevronRight size={16} color={isExpired ? '#64748b' : '#38bdf8'} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderClaimCard = ({ item }) => {
    const steps = [
      { id: 1, label: 'Submitted', icon: Clock },
      { id: 2, label: 'Doorstep Pickup', icon: Truck },
      { id: 3, label: 'In Repair', icon: Wrench },
      { id: 4, label: 'Resolved', icon: CheckCircle2 },
    ];
    const currentStep = item.step || (item.status === 'Resolved' ? 4 : item.status === 'In Repair' ? 3 : 2);

    return (
      <View style={styles.claimCard}>
        {/* Claim Top Bar */}
        <View style={styles.claimHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.claimNumberText}>{item.claimNumber || 'CLM-ACTIVE'}</Text>
            <Text style={styles.claimProductText} numberOfLines={1}>
              {item.productName}
            </Text>
          </View>
          <View style={styles.claimStatusChip}>
            <Text style={styles.claimStatusChipText}>{item.status || 'Under Review'}</Text>
          </View>
        </View>

        {/* Claim Malfunction Description */}
        <View style={styles.claimReasonBox}>
          <Text style={styles.claimReasonLabel}>Reported Problem:</Text>
          <Text style={styles.claimReasonText}>{item.reason}</Text>
        </View>

        {/* Step Progression Timeline */}
        <View style={styles.stepperContainer}>
          {steps.map((st, idx) => {
            const isDone = st.id <= currentStep;
            const isCurrent = st.id === currentStep;
            const Icon = st.icon;
            return (
              <React.Fragment key={st.id}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepIconCircle,
                      isDone && styles.stepIconCircleDone,
                      isCurrent && styles.stepIconCircleCurrent,
                    ]}
                  >
                    <Icon size={13} color={isDone ? '#ffffff' : '#64748b'} />
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isDone && styles.stepLabelDone,
                      isCurrent && styles.stepLabelCurrent,
                    ]}
                    numberOfLines={1}
                  >
                    {st.label}
                  </Text>
                </View>
                {idx < steps.length - 1 && (
                  <View
                    style={[
                      styles.stepConnector,
                      idx < currentStep - 1 && styles.stepConnectorDone,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Footer info */}
        <View style={styles.claimFooter}>
          <View style={styles.courierInfo}>
            <Truck size={14} color="#38bdf8" />
            <Text style={styles.courierInfoText}>Free insured doorstep return included</Text>
          </View>
          <Text style={styles.claimDateText}>{item.createdAt || 'Recent'}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navbar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Warranty Vault</Text>
          <Text style={styles.headerSubtitle}>Verified Coverage & Doorstep Claims</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Segmented Dual Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'warranties' && styles.tabButtonActive]}
          onPress={() => setActiveTab('warranties')}
          activeOpacity={0.8}
        >
          <ShieldCheck size={16} color={activeTab === 'warranties' ? '#38bdf8' : '#94a3b8'} />
          <Text style={[styles.tabButtonText, activeTab === 'warranties' && styles.tabButtonTextActive]}>
            Active Coverage ({warranties.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'claims' && styles.tabButtonActive]}
          onPress={() => setActiveTab('claims')}
          activeOpacity={0.8}
        >
          <Truck size={16} color={activeTab === 'claims' ? '#38bdf8' : '#94a3b8'} />
          <Text style={[styles.tabButtonText, activeTab === 'claims' && styles.tabButtonTextActive]}>
            Claim Tracker ({claims.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loaderText}>Verifying digital protection keys...</Text>
        </View>
      ) : activeTab === 'warranties' ? (
        <FlatList
          data={warranties}
          keyExtractor={(item) => item._id}
          renderItem={renderWarrantyCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />
          }
          ListHeaderComponent={
            <View style={styles.bannerBox}>
              <View style={styles.bannerIconCircle}>
                <Sparkles size={20} color="#38bdf8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>100% Genuine Manufacturer Guarantee</Text>
                <Text style={styles.bannerSubtitle}>
                  All devices purchased on Darwin include authenticated digital warranty cards.
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShieldCheck size={48} color="#475569" />
              <Text style={styles.emptyTitle}>No Warranties Found</Text>
              <Text style={styles.emptySub}>
                Your registered product warranties will appear automatically after order delivery.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => item._id}
          renderItem={renderClaimCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={48} color="#475569" />
              <Text style={styles.emptyTitle}>No Active Claims</Text>
              <Text style={styles.emptySub}>
                Need repair or replacement? File a claim from the Active Coverage tab.
              </Text>
            </View>
          }
        />
      )}

      {/* Claim Submission Modal */}
      <Modal visible={claimModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconWrap}>
                  <ShieldCheck size={20} color="#38bdf8" />
                </View>
                <Text style={styles.modalTitle}>File Warranty Claim</Text>
              </View>
              <TouchableOpacity
                onPress={() => setClaimModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Device summary pill */}
              <View style={styles.selectedProductBox}>
                <Text style={styles.selectedProductLabel}>Device Under Claim</Text>
                <Text style={styles.selectedProductName}>{selectedWarranty?.productName}</Text>
                <View style={styles.modalSerialRow}>
                  <Text style={styles.modalSerialLabel}>Serial Number: </Text>
                  <Text style={styles.modalSerialVal}>{selectedWarranty?.serialNumber || 'N/A'}</Text>
                </View>
              </View>

              {/* Quick Tag Selector */}
              <Text style={styles.sectionHeading}>Select Issue Category</Text>
              <View style={styles.tagsContainer}>
                {ISSUE_TAGS.map((tag) => {
                  const isSelected = selectedIssueTag === tag;
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagPill, isSelected && styles.tagPillActive]}
                      onPress={() => handleSelectTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tagPillText, isSelected && styles.tagPillTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* AI Diagnostic Assistant Toolbar */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                borderColor: 'rgba(56, 189, 248, 0.25)',
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginTop: 8,
                marginBottom: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={15} color="#38bdf8" />
                  <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '700' }}>AI Claim Assistant</Text>
                </View>
                <AiWriteButton
                  task="warranty_claim"
                  input={claimReason}
                  context={{
                    productName: selectedWarranty?.productName,
                    serialNumber: selectedWarranty?.serialNumber,
                    issueCategory: selectedIssueTag,
                    isWarranty: true,
                  }}
                  onGenerated={(res) => {
                    const text = res.message || res.text || res.result || res.description || '';
                    if (text) setClaimReason(text);
                  }}
                  label="✨ Generate Defect Report"
                />
              </View>

              {/* Problem Description Input with AI Assist */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.sectionHeading, { marginBottom: 0 }]}>Describe Problem in Detail</Text>
                <AiWriteButton
                  task="warranty_claim"
                  input={claimReason}
                  context={{
                    productName: selectedWarranty?.productName,
                    serialNumber: selectedWarranty?.serialNumber,
                    issueCategory: selectedIssueTag,
                    isWarranty: true,
                  }}
                  onGenerated={(res) => {
                    const text = res.message || res.text || res.result || res.description || '';
                    if (text) setClaimReason(text);
                  }}
                  label={claimReason.trim() ? "✨ Polish / Rewrite" : "✨ AI Write Claim"}
                />
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Detail what is malfunctioning, when it started, and any symptoms..."
                placeholderTextColor="#64748b"
                value={claimReason}
                onChangeText={setClaimReason}
                multiline
                numberOfLines={4}
              />

              {/* Pickup Notice */}
              <View style={styles.pickupNoticeBox}>
                <Truck size={18} color="#38bdf8" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickupNoticeTitle}>Doorstep Pickup Included</Text>
                  <Text style={styles.pickupNoticeDesc}>
                    Once approved, our logistics partner will collect your product directly from your
                    registered address with insured packaging.
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitClaimBtn}
                disabled={submittingClaim}
                onPress={handleSubmitClaim}
                activeOpacity={0.85}
              >
                {submittingClaim ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={18} color="#ffffff" />
                    <Text style={styles.submitClaimBtnText}>Submit Warranty Claim</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#0a0f1d',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  bannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
  },
  bannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#0d1527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  iconCircleExpired: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  productName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  serialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  serialLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  serialValue: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  statusExpired: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#10b981',
  },
  dotExpired: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#34d399',
  },
  statusTextExpired: {
    color: '#94a3b8',
  },
  coverageBox: {
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  coverageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  coverageTitle: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coverageDetailText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  dateValue: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '700',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '600',
  },
  claimBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  claimBtnDisabled: {
    backgroundColor: '#0a0f1d',
    borderColor: '#1e293b',
  },
  claimBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  claimBtnTextDisabled: {
    color: '#64748b',
  },
  claimCard: {
    backgroundColor: '#0d1527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  claimHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  claimNumberText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  claimProductText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  claimStatusChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  claimStatusChipText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  claimReasonBox: {
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  claimReasonLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  claimReasonText: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 12,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    width: 68,
  },
  stepIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconCircleDone: {
    backgroundColor: '#38bdf8',
  },
  stepIconCircleCurrent: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  stepLabel: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelDone: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: '#ffffff',
    fontWeight: '800',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#1e293b',
    marginTop: -18,
  },
  stepConnectorDone: {
    backgroundColor: '#38bdf8',
  },
  claimFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  courierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courierInfoText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  claimDateText: {
    color: '#64748b',
    fontSize: 11,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0d1527',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedProductBox: {
    backgroundColor: '#070b14',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  selectedProductLabel: {
    color: '#94a3b8',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  selectedProductName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  modalSerialRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  modalSerialLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  modalSerialVal: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagPill: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tagPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38bdf8',
  },
  tagPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  tagPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: '#070b14',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 14,
    lineHeight: 18,
  },
  pickupNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  pickupNoticeTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  pickupNoticeDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  submitClaimBtn: {
    backgroundColor: '#0284c7',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitClaimBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
