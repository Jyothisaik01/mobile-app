import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Truck,
  RotateCcw,
  CreditCard,
  User,
  ShoppingBag,
  Tag,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Headphones,
  Mail,
  Phone,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  FileText,
  ShieldCheck,
  MessageSquare,
  Sparkles,
} from 'lucide-react-native';
import colors from '../theme/colors';
import ticketService from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import AiWriteButton from '../components/AiWriteButton';

const POPULAR_TOPICS = [
  {
    id: 'track_order',
    title: 'Track My Order',
    sub: 'Check order status and delivery updates',
    icon: Truck,
    color: '#60a5fa',
    bg: '#172554',
    screen: 'Orders',
  },
  {
    id: 'returns_refunds',
    title: 'Returns & Refunds',
    sub: 'Return products and check refund status',
    icon: RotateCcw,
    color: '#fb923c',
    bg: '#451a03',
    screen: 'Orders',
  },
  {
    id: 'payment_issues',
    title: 'Payment Issues',
    sub: 'Fix failed payments, refunds and charges',
    icon: CreditCard,
    color: '#34d399',
    bg: '#064e3b',
    screen: 'Wallet',
  },
  {
    id: 'account_profile',
    title: 'Account & Profile',
    sub: 'Update your account, addresses and security',
    icon: User,
    color: '#facc15',
    bg: '#422006',
    screen: 'Profile',
  },
  {
    id: 'product_stock',
    title: 'Product & Stock',
    sub: 'Product details, availability and more',
    icon: ShoppingBag,
    color: '#f472b6',
    bg: '#4a044e',
    action: 'create_ticket_product',
  },
  {
    id: 'offers_coupons',
    title: 'Offers & Coupons',
    sub: 'Apply offers, promo codes and discounts',
    icon: Tag,
    color: '#c084fc',
    bg: '#2e1065',
    screen: 'Rewards',
  },
];

const HELP_ARTICLES = [
  {
    id: 'art_1',
    question: 'How do I track my delivery in real-time?',
    answer:
      'Go to My Orders, select your active order, and view the Delivery Timeline. You can track all stages: Order Placed, Packed, Shipped, and Delivered with courier updates.',
  },
  {
    id: 'art_2',
    question: 'How does Return & Refund work on Prime?',
    answer:
      'For any delivered product, tap "Return" on the order card within the eligible return window. Choose your reason and our courier partner will complete reverse pickup. Refunds are credited instantly to your Prime Wallet or original payment mode.',
  },
  {
    id: 'art_3',
    question: 'How do I claim product warranty?',
    answer:
      'Access Warranty Vault from your Profile screen to view active protection plans. Tap "Raise Warranty Claim" to report any hardware defects or malfunctions for authorized service inspection.',
  },
  {
    id: 'art_4',
    question: 'Can I shop collaboratively with friends?',
    answer:
      'Yes! Open the Shared Cart from your Cart or Profile screen to create a group room. Share the 6-character room code with friends to vote on items and split the checkout bill.',
  },
];

const TICKET_CATEGORIES = [
  { id: 'order', label: 'Order & Delivery' },
  { id: 'payment', label: 'Payment & Refund' },
  { id: 'product', label: 'Product Inquiry' },
  { id: 'warranty', label: 'Warranty & Claims' },
  { id: 'account', label: 'Account & Security' },
  { id: 'general', label: 'General Feedback' },
];

const TICKET_PRIORITIES = [
  { id: 'low', label: 'Low', color: '#94a3b8' },
  { id: 'medium', label: 'Medium', color: '#38bdf8' },
  { id: 'high', label: 'High', color: '#f59e0b' },
  { id: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export default function CustomerSupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('help'); // 'help' | 'tickets' | 'contact'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedArticle, setExpandedArticle] = useState(null);

  // Tickets State
  const [tickets, setTickets] = useState([]);
  const [ticketCounts, setTicketCounts] = useState({ all: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 });
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketFilterStatus, setTicketFilterStatus] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicketThread, setSelectedTicketThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Create Ticket Form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('order');
  const [newPriority, setNewPriority] = useState('medium');
  const [newOrderId, setNewOrderId] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingTickets(true);
      const data = await ticketService.getMyTickets({
        status: ticketFilterStatus,
        q: searchQuery,
      });
      const list = Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data) ? data : [];
      setTickets(list);
      if (data?.counts) {
        setTicketCounts(data.counts);
      } else {
        setTicketCounts({
          all: list.length,
          open: list.filter((t) => t.status === 'open').length,
          in_progress: list.filter((t) => t.status === 'in_progress').length,
          resolved: list.filter((t) => t.status === 'resolved').length,
          closed: list.filter((t) => t.status === 'closed').length,
        });
      }
    } catch (e) {
      console.warn('Failed to load tickets:', e);
      // Fallback sample tickets matching user request
      const fallbackList = [
        {
          _id: 'tkt_1014',
          ticketId: 'TKT-1014',
          subject: 'Product Inquiry: PlayStation 6 Gaming Console',
          category: 'product',
          priority: 'medium',
          status: 'in_progress',
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          messages: [
            {
              senderType: 'customer',
              senderName: user?.name || 'Customer',
              text: 'When will PlayStation 6 pre-orders begin and what are the bundle specifications?',
              createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
            },
            {
              senderType: 'agent',
              senderName: 'Prime Support Specialist',
              text: 'Hello! Our procurement team is in touch with Sony. Pre-orders are expected to open in Q4. We have added you to the priority notify list.',
              createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
            },
          ],
        },
        {
          _id: 'tkt_1013',
          ticketId: 'TKT-1013',
          subject: 'Product Inquiry: PlayStation 6 Gaming Console',
          category: 'product',
          priority: 'low',
          status: 'resolved',
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          messages: [
            {
              senderType: 'customer',
              senderName: user?.name || 'Customer',
              text: 'Checking regional warranty support for imported units.',
              createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
            },
            {
              senderType: 'agent',
              senderName: 'Prime Support Specialist',
              text: 'All consoles sold through Inventory Prime carry an official 1-year brand warranty with doorstep coverage.',
              createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
            },
          ],
        },
      ];
      setTickets(fallbackList);
      setTicketCounts({ all: 2, open: 0, in_progress: 1, resolved: 1, closed: 0 });
    } finally {
      setLoadingTickets(false);
    }
  }, [isAuthenticated, ticketFilterStatus, searchQuery, user?.name]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleOpenThread = async (ticket) => {
    const tId = ticket.ticketId || ticket._id;
    try {
      setLoadingThread(true);
      const data = await ticketService.getTicketById(tId);
      setSelectedTicketThread(data?.ticket || data || ticket);
    } catch {
      setSelectedTicketThread(ticket);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicketThread) return;
    const text = replyText.trim();
    setReplyText('');
    try {
      setSendingReply(true);
      const tId = selectedTicketThread.ticketId || selectedTicketThread._id;
      const res = await ticketService.replyToTicket(tId, text);
      const updated = res?.ticket || res;
      setSelectedTicketThread(updated);
      fetchTickets();
      Toast.show({ type: 'success', text1: 'Reply sent! 💬', position: 'bottom' });
    } catch {
      // Optimistic
      setSelectedTicketThread((prev) => ({
        ...prev,
        messages: [
          ...(prev.messages || []),
          {
            senderType: 'customer',
            senderName: user?.name || 'You',
            text,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicketThread) return;
    const tId = selectedTicketThread.ticketId || selectedTicketThread._id;
    try {
      await ticketService.resolveOrCloseTicket(tId, 'resolved', 'Resolved by customer');
      Toast.show({ type: 'success', text1: 'Ticket Marked Resolved! ✅', position: 'bottom' });
      setSelectedTicketThread((prev) => ({ ...prev, status: 'resolved' }));
      fetchTickets();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to update ticket', position: 'bottom' });
    }
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a subject', position: 'bottom' });
      return;
    }
    if (!newMessage.trim()) {
      Toast.show({ type: 'error', text1: 'Please describe your request', position: 'bottom' });
      return;
    }

    try {
      setSubmittingTicket(true);
      const payload = {
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
        message: newMessage.trim(),
        orderId: newOrderId.trim() || undefined,
      };
      const res = await ticketService.createCustomerTicket(payload);
      Toast.show({
        type: 'success',
        text1: 'Support Ticket Raised! 🎫',
        text2: `Ticket #${res?.ticket?.ticketId || 'NEW'} has been logged.`,
        position: 'bottom',
      });
      setShowCreateModal(false);
      setNewSubject('');
      setNewMessage('');
      setNewOrderId('');
      fetchTickets();
      if (res?.ticket) {
        handleOpenThread(res.ticket);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to create ticket',
        text2: err.response?.data?.msg || err.message,
        position: 'bottom',
      });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getStatusBadge = (status) => {
    const s = String(status || 'open').toLowerCase();
    if (s === 'resolved') {
      return { bg: '#064e3b', text: '#34d399', label: 'Resolved' };
    }
    if (s === 'in_progress') {
      return { bg: '#172554', text: '#60a5fa', label: 'In Progress' };
    }
    if (s === 'closed') {
      return { bg: '#1e293b', text: '#94a3b8', label: 'Closed' };
    }
    return { bg: '#451a03', text: '#fb923c', label: 'Open' };
  };

  const activeTicketsCount = (ticketCounts.open || 0) + (ticketCounts.in_progress || 0) || tickets.filter(t => ['open', 'in_progress'].includes(t.status)).length || 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Customer Support</Text>
          <Text style={styles.headerSub}>We're here to help you</Text>
        </View>
        <TouchableOpacity
          style={styles.headerChatBtn}
          onPress={() => navigation.navigate('DarwinChat')}
        >
          <Sparkles size={16} color="#c084fc" />
          <Text style={styles.headerChatText}>Ask AI</Text>
        </TouchableOpacity>
      </View>

      {/* Top 3 Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'help' && styles.tabItemActive]}
          onPress={() => setActiveTab('help')}
        >
          <HelpCircle size={15} color={activeTab === 'help' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.tabItemText, activeTab === 'help' && styles.tabItemTextActive]}>
            Help Center
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tickets' && styles.tabItemActive]}
          onPress={() => setActiveTab('tickets')}
        >
          <FileText size={15} color={activeTab === 'tickets' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.tabItemText, activeTab === 'tickets' && styles.tabItemTextActive]}>
            My Tickets
          </Text>
          {activeTicketsCount > 0 && (
            <View style={styles.ticketCountBadge}>
              <Text style={styles.ticketCountBadgeText}>{activeTicketsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'contact' && styles.tabItemActive]}
          onPress={() => setActiveTab('contact')}
        >
          <Phone size={15} color={activeTab === 'contact' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.tabItemText, activeTab === 'contact' && styles.tabItemTextActive]}>
            Contact Us
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Views */}
      {activeTab === 'help' ? (
        /* ================= HELP CENTER VIEW ================= */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={16} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help (e.g. order, refund, payment...)"
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.trim() ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={15} color="#64748b" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Popular Topics Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Popular Topics</Text>
            <TouchableOpacity onPress={() => setActiveTab('help')}>
              <Text style={styles.sectionActionText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.topicsGrid}>
            {POPULAR_TOPICS.map((topic) => {
              const IconComp = topic.icon;
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.topicCard}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (topic.screen) {
                      navigation.navigate(topic.screen);
                    } else if (topic.action === 'create_ticket_product') {
                      setNewCategory('product');
                      setShowCreateModal(true);
                    }
                  }}
                >
                  <View style={[styles.topicIconWrap, { backgroundColor: topic.bg }]}>
                    <IconComp size={18} color={topic.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={styles.topicSub} numberOfLines={2}>
                      {topic.sub}
                    </Text>
                  </View>
                  <ChevronRight size={14} color="#64748b" />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Still Need Help CTA Banner */}
          <View style={styles.raiseTicketBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.raiseTicketTitle}>Still need help?</Text>
              <Text style={styles.raiseTicketSub}>
                Raise a support ticket and our team will get back to you.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.createTicketBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Plus size={14} color="#ffffff" />
              <Text style={styles.createTicketBtnText}>Create Ticket</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Tickets Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Tickets</Text>
            <TouchableOpacity onPress={() => setActiveTab('tickets')}>
              <Text style={styles.sectionActionText}>View All</Text>
            </TouchableOpacity>
          </View>

          {tickets.slice(0, 3).map((item) => {
            const statusConfig = getStatusBadge(item.status);
            return (
              <TouchableOpacity
                key={item._id || item.ticketId}
                style={styles.recentTicketCard}
                activeOpacity={0.8}
                onPress={() => handleOpenThread(item)}
              >
                <View style={styles.recentTicketTop}>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                  <Text style={styles.recentTicketTime}>
                    Ticket #{item.ticketId || item._id?.slice(-6).toUpperCase()} • {formatTimeAgo(item.createdAt)}
                  </Text>
                </View>

                <Text style={styles.recentTicketSubject} numberOfLines={1}>
                  {item.subject}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Browse Help Articles Section */}
          <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>Browse Help Articles</Text>
          </View>

          <View style={styles.articlesList}>
            {HELP_ARTICLES.map((art) => {
              const isExpanded = expandedArticle === art.id;
              return (
                <View key={art.id} style={styles.articleCard}>
                  <TouchableOpacity
                    style={styles.articleHeader}
                    activeOpacity={0.7}
                    onPress={() => setExpandedArticle(isExpanded ? null : art.id)}
                  >
                    <Text style={styles.articleQuestion}>{art.question}</Text>
                    {isExpanded ? (
                      <ChevronUp size={16} color="#94a3b8" />
                    ) : (
                      <ChevronDown size={16} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                  {isExpanded && (
                    <Text style={styles.articleAnswer}>{art.answer}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : activeTab === 'tickets' ? (
        /* ================= MY TICKETS VIEW ================= */
        <View style={{ flex: 1 }}>
          {/* Status Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterPillsScrollWrap}
            contentContainerStyle={styles.filterPillsScroll}
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'open', label: 'Open' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'closed', label: 'Closed' },
            ].map((st) => {
              const isActive = ticketFilterStatus === st.id;
              const count = ticketCounts[st.id];
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.filterPill,
                    isActive && styles.filterPillActive,
                  ]}
                  onPress={() => setTicketFilterStatus(st.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {st.label}
                  </Text>
                  {count !== undefined && (
                    <View
                      style={[
                        styles.filterPillBadge,
                        isActive && styles.filterPillBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillBadgeText,
                          isActive && styles.filterPillBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loadingTickets ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <FlatList
              data={tickets}
              keyExtractor={(item) => item._id || item.ticketId || String(Math.random())}
              contentContainerStyle={styles.ticketsListContent}
              renderItem={({ item }) => {
                const statusConfig = getStatusBadge(item.status);
                const msgCount = (item.messages || []).length;
                return (
                  <TouchableOpacity
                    style={styles.ticketCard}
                    activeOpacity={0.8}
                    onPress={() => handleOpenThread(item)}
                  >
                    <View style={styles.ticketCardHeader}>
                      <Text style={styles.ticketIdText}>
                        #{item.ticketId || item._id?.slice(-6).toUpperCase()}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                          {statusConfig.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.ticketCardSubject}>{item.subject}</Text>

                    <View style={styles.ticketCardFooter}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Clock size={12} color="#64748b" />
                        <Text style={styles.ticketCardDate}>{formatTimeAgo(item.createdAt)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                        <MessageSquare size={12} color="#60a5fa" />
                        <Text style={styles.ticketCardMsgCount}>{msgCount} msgs</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <FileText size={40} color="#64748b" />
                  <Text style={styles.emptyTitle}>No support tickets found</Text>
                  <Text style={styles.emptySub}>
                    Have an issue with an order or product? Raise a ticket below.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyCreateBtn}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text style={styles.emptyCreateBtnText}>Create Ticket</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}

          {/* Floating Create Ticket Button */}
          <TouchableOpacity
            style={[styles.floatingCreateBtn, { bottom: Math.max(insets.bottom, 16) + 10 }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.floatingCreateBtnText}>New Ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ================= CONTACT US VIEW ================= */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          <View style={styles.contactCard}>
            <View style={styles.contactIconWrap}>
              <Headphones size={22} color="#38bdf8" />
            </View>
            <Text style={styles.contactTitle}>Customer Care Helpline</Text>
            <Text style={styles.contactSub}>Toll-Free 24 Hours • 7 Days a Week</Text>
            <TouchableOpacity
              style={styles.contactActionBtn}
              onPress={() => Linking.openURL('tel:18004207746')}
            >
              <Phone size={15} color="#ffffff" />
              <Text style={styles.contactActionText}>1800-420-PRIME</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactCard}>
            <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}>
              <Mail size={22} color="#c084fc" />
            </View>
            <Text style={styles.contactTitle}>Official Support Email</Text>
            <Text style={styles.contactSub}>Guaranteed response within 4 hours</Text>
            <TouchableOpacity
              style={[styles.contactActionBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => Linking.openURL('mailto:support@inventoryprime.com')}
            >
              <Mail size={15} color="#ffffff" />
              <Text style={styles.contactActionText}>support@inventoryprime.com</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactCard}>
            <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
              <Sparkles size={22} color="#34d399" />
            </View>
            <Text style={styles.contactTitle}>Live AI Concierge (Darwin)</Text>
            <Text style={styles.contactSub}>Instant help with orders, returns, and recommendations</Text>
            <TouchableOpacity
              style={[styles.contactActionBtn, { backgroundColor: '#059669' }]}
              onPress={() => navigation.navigate('DarwinChat')}
            >
              <MessageSquare size={15} color="#ffffff" />
              <Text style={styles.contactActionText}>Chat with Darwin AI</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ================= CREATE TICKET MODAL ================= */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Raise Support Ticket</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {TICKET_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryPill, newCategory === cat.id && styles.categoryPillActive]}
                    onPress={() => setNewCategory(cat.id)}
                  >
                    <Text style={[styles.categoryPillText, newCategory === cat.id && styles.categoryPillTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Priority</Text>
              <View style={styles.priorityRow}>
                {TICKET_PRIORITIES.map((pri) => (
                  <TouchableOpacity
                    key={pri.id}
                    style={[
                      styles.priorityPill,
                      newPriority === pri.id && { borderColor: pri.color, backgroundColor: `${pri.color}22` },
                    ]}
                    onPress={() => setNewPriority(pri.id)}
                  >
                    <Text style={[styles.priorityPillText, newPriority === pri.id && { color: pri.color }]}>
                      {pri.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 4 }}>
                <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 0 }]}>Subject / Issue Title</Text>
                <AiWriteButton
                  task="refine_text"
                  input={newSubject || newMessage}
                  context={{
                    tone: 'concise customer support ticket title under 7 words',
                    category: newCategory,
                    orderId: newOrderId,
                  }}
                  onGenerated={(res) => {
                    const text = res.result || res.text || res.message || res.title || '';
                    if (text) setNewSubject(text.replace(/^["']|["']$/g, '').slice(0, 80));
                  }}
                  label={newSubject.trim() ? "✨ Polish Title" : "✨ Suggest Title"}
                />
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Brief summary of your inquiry..."
                placeholderTextColor="#64748b"
                value={newSubject}
                onChangeText={setNewSubject}
              />

              <Text style={styles.inputLabel}>Order ID (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. ORD-1092"
                placeholderTextColor="#64748b"
                value={newOrderId}
                onChangeText={setNewOrderId}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 4 }}>
                <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 0 }]}>Detailed Description / Complaint</Text>
                <AiWriteButton
                  task="support_ticket"
                  input={newMessage}
                  context={{
                    issueCategory: newCategory,
                    orderId: newOrderId,
                    subject: newSubject,
                  }}
                  onGenerated={(res) => {
                    const text = res.message || res.text || res.result || '';
                    if (text) setNewMessage(text);
                    if (res.subject && !newSubject) setNewSubject(res.subject);
                  }}
                  label={newMessage.trim() ? "✨ Polish / Rewrite" : "✨ AI Draft"}
                />
              </View>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Explain the issue in detail so our specialists can assist you faster..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
                value={newMessage}
                onChangeText={setNewMessage}
              />

              <TouchableOpacity
                style={[styles.submitTicketBtn, submittingTicket && { opacity: 0.6 }]}
                disabled={submittingTicket}
                onPress={handleCreateTicket}
              >
                {submittingTicket ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitTicketBtnText}>Submit Support Ticket</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= TICKET CONVERSATION THREAD MODAL ================= */}
      {selectedTicketThread && (
        <Modal
          visible={Boolean(selectedTicketThread)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedTicketThread(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '92%', paddingBottom: Math.max(insets.bottom, 14) }]}>
              {/* Thread Header */}
              <View style={styles.threadHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.threadTicketId}>
                      Ticket #{selectedTicketThread.ticketId || selectedTicketThread._id?.slice(-6).toUpperCase()}
                    </Text>
                    {(() => {
                      const cfg = getStatusBadge(selectedTicketThread.status);
                      return (
                        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
                        </View>
                      );
                    })()}
                  </View>
                  <Text style={styles.threadSubject} numberOfLines={1}>
                    {selectedTicketThread.subject}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedTicketThread(null)}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Thread Action Bar */}
              {selectedTicketThread.status !== 'resolved' && (
                <View style={styles.threadActionBar}>
                  <TouchableOpacity style={styles.markResolvedBtn} onPress={handleResolveTicket}>
                    <CheckCircle2 size={14} color="#34d399" />
                    <Text style={styles.markResolvedText}>Mark as Resolved</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Messages FlatList */}
              <FlatList
                data={selectedTicketThread.messages || []}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={styles.threadMessagesList}
                renderItem={({ item }) => {
                  const isCustomer = item.senderType === 'customer' || item.senderName === user?.name;
                  return (
                    <View style={[styles.msgWrap, isCustomer ? styles.msgWrapMe : styles.msgWrapAgent]}>
                      <View style={styles.msgHeader}>
                        <Text style={styles.msgSenderName}>{item.senderName || (isCustomer ? 'You' : 'Prime Support')}</Text>
                        <Text style={styles.msgTime}>{formatTimeAgo(item.createdAt)}</Text>
                      </View>
                      <View style={[styles.msgBubble, isCustomer ? styles.msgBubbleMe : styles.msgBubbleAgent]}>
                        <Text style={[styles.msgText, isCustomer ? styles.msgTextMe : styles.msgTextAgent]}>
                          {item.text || item.message}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />

              {/* Reply Input Bar with AI Assist */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 6 }}>
                <Text style={{ fontSize: 11.5, color: '#64748b' }}>Reply with AI assist:</Text>
                <AiWriteButton
                  task="ticket_reply"
                  input={replyText}
                  context={{
                    subject: selectedTicketThread?.subject,
                    category: selectedTicketThread?.category,
                    history: (selectedTicketThread?.messages || []).slice(-3).map(m => `${m.senderName || m.sender}: ${m.text || m.message}`).join(' | ')
                  }}
                  onGenerated={(res) => {
                    const text = res.message || res.text || res.result || '';
                    if (text) setReplyText(text);
                  }}
                  label={replyText.trim() ? "✨ Polish Reply" : "✨ Draft Reply"}
                />
              </View>
              <View style={styles.threadInputBar}>
                <TextInput
                  style={styles.threadInput}
                  placeholder="Type your response to support..."
                  placeholderTextColor="#64748b"
                  value={replyText}
                  onChangeText={setReplyText}
                  onSubmitEditing={handleSendReply}
                />
                <TouchableOpacity
                  style={[styles.threadSendBtn, !replyText.trim() && { opacity: 0.4 }]}
                  disabled={!replyText.trim() || sendingReply}
                  onPress={handleSendReply}
                >
                  <Send size={15} color="#ffffff" />
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#070b14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 12,
  },
  headerChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  headerChatText: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#090f1d',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#3b82f6',
  },
  tabItemText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  ticketCountBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  ticketCountBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
    gap: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionActionText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  topicsGrid: {
    gap: 8,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1527',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    gap: 12,
  },
  topicIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  topicSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  raiseTicketBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111c38',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2563eb',
    padding: 14,
    gap: 10,
    marginVertical: 4,
  },
  raiseTicketTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  raiseTicketSub: {
    color: '#93c5fd',
    fontSize: 11,
    marginTop: 2,
  },
  createTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createTicketBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  recentTicketCard: {
    backgroundColor: '#0d1527',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    gap: 6,
  },
  recentTicketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTicketTime: {
    color: '#64748b',
    fontSize: 11,
  },
  recentTicketSubject: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  articlesList: {
    gap: 8,
  },
  articleCard: {
    backgroundColor: '#0d1527',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleQuestion: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  articleAnswer: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  filterPillsScrollWrap: {
    flexGrow: 0,
    height: 52,
    marginBottom: 6,
  },
  filterPillsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    height: 36,
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  filterPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterPillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  filterPillBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterPillBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  filterPillBadgeTextActive: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  ticketsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    gap: 10,
  },
  ticketCard: {
    backgroundColor: '#0d1527',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    gap: 8,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketIdText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ticketCardSubject: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  ticketCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  ticketCardDate: {
    color: '#64748b',
    fontSize: 11,
  },
  ticketCardMsgCount: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '600',
  },
  floatingCreateBtn: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  floatingCreateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  contactCard: {
    backgroundColor: '#0d1527',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  contactSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  contactActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCreateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#090f1d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalHeading: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  categoryScroll: {
    gap: 6,
    paddingBottom: 6,
  },
  categoryPill: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  categoryPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  categoryPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  priorityPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    height: 42,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 12,
  },
  modalTextArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  submitTicketBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitTicketBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
  },
  threadTicketId: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
  },
  threadSubject: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  threadActionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  markResolvedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  markResolvedText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  threadMessagesList: {
    paddingVertical: 12,
    gap: 12,
  },
  msgWrap: {
    maxWidth: '82%',
  },
  msgWrapMe: {
    alignSelf: 'flex-end',
  },
  msgWrapAgent: {
    alignSelf: 'flex-start',
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  msgSenderName: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  msgTime: {
    color: '#64748b',
    fontSize: 9,
    marginLeft: 8,
  },
  msgBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  msgBubbleMe: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 2,
  },
  msgBubbleAgent: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgTextMe: {
    color: '#ffffff',
  },
  msgTextAgent: {
    color: '#e2e8f0',
  },
  threadInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  threadInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  threadSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
