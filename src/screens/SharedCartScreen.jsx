import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Share,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  ArrowLeft,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Copy,
  ShoppingBag,
  X,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Trash2,
  CreditCard,
  Sparkles,
  Search,
  Check,
} from 'lucide-react-native';
import colors from '../theme/colors';
import sharedCartService from '../services/sharedCartService';
import productService from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/formatters';
import Toast from 'react-native-toast-message';

export default function SharedCartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myName = user?.name || 'You';

  const [carts, setCarts] = useState([]);
  const [activeCart, setActiveCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'chat' | 'split'

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Form states
  const [cartName, setCartName] = useState('');
  const [targetBudget, setTargetBudget] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Chat message state
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Product Picker state
  const [availableProducts, setAvailableProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadCarts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sharedCartService.getMySharedCarts(myName);
      if (Array.isArray(data) && data.length > 0) {
        setCarts(data);
        setActiveCart((prev) => {
          if (!prev) return data[0];
          const found = data.find((c) => c._id === prev._id);
          return found || data[0];
        });
      } else {
        // Fallback default sample cart
        const sample = {
          _id: 'sc_sample',
          name: 'Weekend Tech Squad',
          shareCode: 'TECH99',
          targetBudget: 15000,
          members: [
            { name: myName, role: 'creator', isReady: true },
            { name: 'Alex', role: 'member', isReady: true },
            { name: 'Rohan', role: 'member', isReady: false },
          ],
          items: [
            {
              _id: 'item1',
              name: 'Apple AirPods Pro 2',
              price: 19999,
              quantity: 1,
              votes: [
                { customerName: myName, vote: 'up' },
                { customerName: 'Alex', vote: 'up' },
              ],
            },
            {
              _id: 'item2',
              name: 'Sony WH-1000XM5 Wireless Headphones',
              price: 26990,
              quantity: 1,
              votes: [
                { customerName: 'Alex', vote: 'up' },
                { customerName: 'Rohan', vote: 'down' },
              ],
            },
          ],
          messages: [
            {
              senderName: 'System',
              text: 'Welcome to Weekend Tech Squad! Share code TECH99 with friends.',
              createdAt: new Date().toISOString(),
            },
            {
              senderName: 'Alex',
              text: 'Hey everyone, I added the AirPods Pro 2. Please vote!',
              createdAt: new Date().toISOString(),
            },
          ],
        };
        setCarts([sample]);
        setActiveCart(sample);
      }
    } catch (e) {
      console.warn('Error loading shared carts:', e);
    } finally {
      setLoading(false);
    }
  }, [myName]);

  useEffect(() => {
    loadCarts();
  }, [loadCarts]);

  const handleVote = async (itemId, type) => {
    if (!activeCart) return;
    try {
      await sharedCartService.voteOnItem(activeCart._id, itemId, type, myName);
      Toast.show({
        type: 'success',
        text1: `Voted ${type === 'up' ? '👍 Approved' : '👎 Objected'}`,
        position: 'bottom',
      });
      loadCarts();
    } catch {
      // Optimistic fallback
      setActiveCart((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) => {
            if (it._id !== itemId) return it;
            const existingVotes = Array.isArray(it.votes) ? [...it.votes] : [];
            const idx = existingVotes.findIndex((v) => v.customerName === myName);
            if (idx >= 0) {
              existingVotes[idx] = { customerName: myName, vote: type };
            } else {
              existingVotes.push({ customerName: myName, vote: type });
            }
            return { ...it, votes: existingVotes };
          }),
        };
      });
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!activeCart) return;
    try {
      await sharedCartService.removeItem(activeCart._id, itemId);
      Toast.show({ type: 'info', text1: 'Item removed from group cart', position: 'bottom' });
      loadCarts();
    } catch {
      setActiveCart((prev) => ({
        ...prev,
        items: prev.items.filter((i) => i._id !== itemId),
      }));
    }
  };

  const handleShareCode = async () => {
    const code = activeCart?.shareCode || activeCart?.joinCode;
    if (!code) return;
    try {
      await Share.share({
        message: `Join my shared shopping cart "${activeCart.name}" on Inventory Prime!\nUse Room Code: ${code}\nCollaborate, vote on items, and split the bill together!`,
      });
    } catch {}
  };

  const handleCreate = async () => {
    if (!cartName.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a room name', position: 'bottom' });
      return;
    }
    try {
      setCreating(true);
      const created = await sharedCartService.createSharedCart({
        name: cartName.trim(),
        targetBudget: Number(targetBudget) || 0,
        creatorName: myName,
      });
      Toast.show({ type: 'success', text1: 'Group Room Created! 🎉', position: 'bottom' });
      setShowCreateModal(false);
      setCartName('');
      setTargetBudget('');
      await loadCarts();
      if (created) setActiveCart(created);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to create room',
        text2: err.response?.data?.msg || err.message,
        position: 'bottom',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Toast.show({ type: 'error', text1: 'Enter room code', position: 'bottom' });
      return;
    }
    try {
      setJoining(true);
      const joined = await sharedCartService.joinSharedCart(joinCode.trim().toUpperCase(), myName);
      Toast.show({ type: 'success', text1: 'Joined Room! 🎉', position: 'bottom' });
      setShowJoinModal(false);
      setJoinCode('');
      await loadCarts();
      if (joined) setActiveCart(joined);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Code',
        text2: err.response?.data?.msg || 'Could not join room.',
        position: 'bottom',
      });
    } finally {
      setJoining(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !activeCart) return;
    const text = chatMessage.trim();
    setChatMessage('');
    try {
      setSendingMsg(true);
      await sharedCartService.postMessage(activeCart._id, text, myName);
      loadCarts();
    } catch {
      // optimistic
      setActiveCart((prev) => ({
        ...prev,
        messages: [
          ...(prev.messages || []),
          { senderName: myName, text, createdAt: new Date().toISOString() },
        ],
      }));
    } finally {
      setSendingMsg(false);
    }
  };

  const handleToggleReady = async () => {
    if (!activeCart) return;
    try {
      await sharedCartService.toggleReadyStatus(activeCart._id, myName);
      Toast.show({ type: 'success', text1: 'Status updated!', position: 'bottom' });
      loadCarts();
    } catch {
      setActiveCart((prev) => ({
        ...prev,
        members: (prev.members || []).map((m) =>
          m.name === myName ? { ...m, isReady: !m.isReady } : m
        ),
      }));
    }
  };

  const openAddProductModal = async () => {
    setShowAddProductModal(true);
    if (availableProducts.length === 0) {
      try {
        setLoadingProducts(true);
        const res = await productService.getProducts({ limit: 30 });
        const list = Array.isArray(res) ? res : res.products || res.items || [];
        setAvailableProducts(list);
      } catch (e) {
        console.warn('Error loading products for picker:', e);
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  const handleAddProductToCart = async (product) => {
    if (!activeCart) return;
    const pId = product._id || product.id;
    try {
      await sharedCartService.addItemToCart(activeCart._id, pId, 1, myName);
      Toast.show({
        type: 'success',
        text1: `Added ${product.name} to room! 🛒`,
        position: 'bottom',
      });
      setShowAddProductModal(false);
      loadCarts();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to add item',
        text2: err.response?.data?.msg || err.message,
        position: 'bottom',
      });
    }
  };

  // Calculations
  const roomItems = activeCart?.items || [];
  const roomTotal = roomItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const members = activeCart?.members || [{ name: myName, role: 'creator', isReady: true }];
  const memberCount = Math.max(members.length, 1);
  const perPersonSplit = Math.round(roomTotal / memberCount);
  const targetBudgetVal = Number(activeCart?.targetBudget) || 0;
  const isBudgetExceeded = targetBudgetVal > 0 && roomTotal > targetBudgetVal;
  const myMemberObj = members.find((m) => m.name === myName) || { isReady: false };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Shared Cart & Voting</Text>
          <Text style={styles.headerSub}>
            {activeCart?.name || 'Collaborative Shopping Room'}
          </Text>
        </View>
        <TouchableOpacity style={styles.inviteHeaderBtn} onPress={handleShareCode}>
          <Share2 size={16} color="#c084fc" />
        </TouchableOpacity>
      </View>

      {/* Cart Switcher Scroll (if user has multiple rooms) */}
      {carts.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cartSwitchRow}
        >
          {carts.map((c) => {
            const isSelected = activeCart?._id === c._id;
            return (
              <TouchableOpacity
                key={c._id}
                style={[styles.cartSwitchPill, isSelected && styles.cartSwitchPillActive]}
                onPress={() => setActiveCart(c)}
              >
                <Users size={12} color={isSelected ? '#ffffff' : colors.textMuted} />
                <Text
                  style={[
                    styles.cartSwitchPillText,
                    isSelected && styles.cartSwitchPillTextActive,
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Action Row: Create Room / Join Room */}
      <View style={styles.topActionsRow}>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Plus size={15} color="#ffffff" />
          <Text style={styles.createBtnText}>Create Room</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinBtn}
          onPress={() => setShowJoinModal(true)}
        >
          <Users size={15} color="#c084fc" />
          <Text style={styles.joinBtnText}>Join with Code</Text>
        </TouchableOpacity>
      </View>

      {/* Room Overview Card */}
      {activeCart && (
        <View style={styles.roomOverviewCard}>
          <View style={styles.roomOverviewTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.roomNameText}>{activeCart.name}</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeLabel}>ROOM CODE:</Text>
                <TouchableOpacity
                  style={styles.codeBadge}
                  onPress={handleShareCode}
                  activeOpacity={0.7}
                >
                  <Text style={styles.codeText}>
                    {activeCart.shareCode || activeCart.joinCode || 'PRIME1'}
                  </Text>
                  <Copy size={11} color="#c084fc" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.roomTotalBox}>
              <Text style={styles.roomTotalLabel}>ROOM TOTAL</Text>
              <Text style={styles.roomTotalValue}>{formatPrice(roomTotal)}</Text>
            </View>
          </View>

          {/* Target Budget Bar */}
          {targetBudgetVal > 0 && (
            <View style={styles.budgetWrap}>
              <View style={styles.budgetLabels}>
                <Text style={styles.budgetText}>
                  Budget: {formatPrice(roomTotal)} / {formatPrice(targetBudgetVal)}
                </Text>
                <Text
                  style={[
                    styles.budgetText,
                    isBudgetExceeded ? { color: '#f87171' } : { color: '#34d399' },
                  ]}
                >
                  {isBudgetExceeded ? 'Exceeded' : 'On Track'}
                </Text>
              </View>
              <View style={styles.budgetTrack}>
                <View
                  style={[
                    styles.budgetFill,
                    {
                      width: `${Math.min(100, Math.round((roomTotal / targetBudgetVal) * 100))}%`,
                      backgroundColor: isBudgetExceeded ? '#ef4444' : '#a855f7',
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Members Avatars Row */}
          <View style={styles.membersRow}>
            <Text style={styles.membersRowLabel}>Members ({members.length}):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {members.map((m, idx) => (
                <View key={idx} style={styles.memberChip}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(m.name || 'M').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberNameText} numberOfLines={1}>
                    {m.name || 'Member'}
                  </Text>
                  {m.isReady && (
                    <CheckCircle2 size={12} color="#10b981" />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Room Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'items' && styles.tabItemActive]}
          onPress={() => setActiveTab('items')}
        >
          <ShoppingBag size={14} color={activeTab === 'items' ? '#ffffff' : colors.textMuted} />
          <Text style={[styles.tabItemText, activeTab === 'items' && styles.tabItemTextActive]}>
            Items ({roomItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
          onPress={() => setActiveTab('chat')}
        >
          <MessageSquare size={14} color={activeTab === 'chat' ? '#ffffff' : colors.textMuted} />
          <Text style={[styles.tabItemText, activeTab === 'chat' && styles.tabItemTextActive]}>
            Room Chat ({(activeCart?.messages || []).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'split' && styles.tabItemActive]}
          onPress={() => setActiveTab('split')}
        >
          <CreditCard size={14} color={activeTab === 'split' ? '#ffffff' : colors.textMuted} />
          <Text style={[styles.tabItemText, activeTab === 'split' && styles.tabItemTextActive]}>
            Split Bill & Ready
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Content */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : activeTab === 'items' ? (
        /* ITEMS TAB */
        <View style={{ flex: 1 }}>
          <View style={styles.itemsTabHeader}>
            <Text style={styles.itemsTabTitle}>Group Cart Items</Text>
            <TouchableOpacity style={styles.addProductBtn} onPress={openAddProductModal}>
              <Plus size={14} color="#ffffff" />
              <Text style={styles.addProductBtnText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={roomItems}
            keyExtractor={(item) => item._id || String(Math.random())}
            contentContainerStyle={styles.itemsListContent}
            renderItem={({ item }) => {
              const votes = Array.isArray(item.votes) ? item.votes : [];
              const upVotes = votes.filter((v) => v.vote === 'up').length;
              const downVotes = votes.filter((v) => v.vote === 'down').length;
              const myVote = votes.find((v) => v.customerName === myName)?.vote;
              const imageUrl =
                item.image ||
                item.productId?.image ||
                (Array.isArray(item.productId?.images) ? item.productId.images[0] : null) ||
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60';

              return (
                <View style={styles.itemCard}>
                  <Image source={{ uri: imageUrl }} style={styles.itemThumb} resizeMode="cover" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name || item.productId?.name || 'Product'}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {formatPrice(item.price)} × {item.quantity || 1}
                    </Text>

                    {/* Voting row */}
                    <View style={styles.voteControls}>
                      <TouchableOpacity
                        style={[
                          styles.voteBtn,
                          myVote === 'up' && styles.voteBtnUpActive,
                        ]}
                        onPress={() => handleVote(item._id, 'up')}
                      >
                        <ThumbsUp size={13} color={myVote === 'up' ? '#10b981' : '#64748b'} />
                        <Text style={[styles.voteNum, myVote === 'up' && { color: '#10b981' }]}>
                          {upVotes}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.voteBtn,
                          myVote === 'down' && styles.voteBtnDownActive,
                        ]}
                        onPress={() => handleVote(item._id, 'down')}
                      >
                        <ThumbsDown size={13} color={myVote === 'down' ? '#ef4444' : '#64748b'} />
                        <Text style={[styles.voteNum, myVote === 'down' && { color: '#ef4444' }]}>
                          {downVotes}
                        </Text>
                      </TouchableOpacity>

                      <View style={{ flex: 1 }} />

                      <TouchableOpacity
                        style={styles.trashBtn}
                        onPress={() => handleRemoveItem(item._id)}
                      >
                        <Trash2 size={14} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <ShoppingBag size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Group cart is empty</Text>
                <Text style={styles.emptySub}>
                  Add items from the store so your squad can vote and collaborate.
                </Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddProductModal}>
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.emptyAddBtnText}>Browse Products to Add</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      ) : activeTab === 'chat' ? (
        /* CHAT TAB */
        <View style={{ flex: 1 }}>
          <FlatList
            data={activeCart?.messages || []}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.chatScroll}
            renderItem={({ item }) => {
              const isMe = item.senderName === myName;
              const isSys = item.senderName === 'System';
              if (isSys) {
                return (
                  <View style={styles.sysMsgWrap}>
                    <Text style={styles.sysMsgText}>{item.text}</Text>
                  </View>
                );
              }
              return (
                <View style={[styles.chatBubbleWrap, isMe ? styles.chatBubbleRight : styles.chatBubbleLeft]}>
                  <Text style={styles.chatSender}>{item.senderName}</Text>
                  <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
                    <Text style={[styles.chatText, isMe ? styles.chatTextMe : styles.chatTextOther]}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Chat Input Bar */}
          <View style={[styles.chatInputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              style={styles.chatInput}
              placeholder="Suggest an item or chat with friends..."
              placeholderTextColor="#64748b"
              value={chatMessage}
              onChangeText={setChatMessage}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !chatMessage.trim() && { opacity: 0.4 }]}
              onPress={handleSendMessage}
              disabled={!chatMessage.trim() || sendingMsg}
            >
              <Send size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* SPLIT BILL TAB */
        <ScrollView contentContainerStyle={styles.splitScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.splitCard}>
            <View style={styles.splitCardHeader}>
              <CreditCard size={18} color="#c084fc" />
              <Text style={styles.splitCardTitle}>Collaborative Split Breakdown</Text>
            </View>

            <View style={styles.splitRow}>
              <Text style={styles.splitLabel}>Room Cart Subtotal</Text>
              <Text style={styles.splitVal}>{formatPrice(roomTotal)}</Text>
            </View>
            <View style={styles.splitRow}>
              <Text style={styles.splitLabel}>Express Group Shipping</Text>
              <Text style={[styles.splitVal, { color: '#10b981' }]}>FREE</Text>
            </View>
            <View style={styles.splitRow}>
              <Text style={styles.splitLabel}>Collaborating Members</Text>
              <Text style={styles.splitVal}>{memberCount} people</Text>
            </View>
            <View style={[styles.splitRow, styles.splitTotalRow]}>
              <Text style={styles.splitTotalLabel}>Equal Split Per Person</Text>
              <Text style={styles.splitTotalVal}>{formatPrice(perPersonSplit)}</Text>
            </View>
          </View>

          {/* Member Readiness Status List */}
          <Text style={styles.membersSectionTitle}>Squad Member Readiness</Text>
          {members.map((m, idx) => (
            <View key={idx} style={styles.readinessCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{(m.name || 'M').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.readinessName}>{m.name || 'Member'} {m.name === myName ? '(You)' : ''}</Text>
                <Text style={styles.readinessSub}>
                  {m.isReady ? 'Ready to place order' : 'Still reviewing items'}
                </Text>
              </View>
              <View style={[styles.readyPill, m.isReady ? styles.readyPillActive : styles.readyPillPending]}>
                {m.isReady ? (
                  <CheckCircle2 size={13} color="#10b981" />
                ) : (
                  <Clock size={13} color="#eab308" />
                )}
                <Text style={[styles.readyPillText, m.isReady ? { color: '#34d399' } : { color: '#facc15' }]}>
                  {m.isReady ? 'Ready' : 'Reviewing'}
                </Text>
              </View>
            </View>
          ))}

          {/* My Ready Toggle Button */}
          <TouchableOpacity
            style={[styles.myReadyBtn, myMemberObj.isReady && styles.myReadyBtnActive]}
            onPress={handleToggleReady}
          >
            <CheckCircle2 size={18} color="#ffffff" />
            <Text style={styles.myReadyBtnText}>
              {myMemberObj.isReady ? "You're Marked Ready! (Tap to Undo)" : "I'm Ready to Checkout"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.proceedCheckoutBtn}
            onPress={() => {
              Toast.show({
                type: 'success',
                text1: 'Group Checkout Initialized! 💳',
                text2: `Each member's share is ${formatPrice(perPersonSplit)}.`,
                position: 'bottom',
              });
            }}
          >
            <Text style={styles.proceedCheckoutText}>Proceed to Group Checkout ({formatPrice(roomTotal)})</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* CREATE ROOM MODAL */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Shared Cart</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Room Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Goa Trip Supplies, Tech Squad, Flatmates"
              placeholderTextColor="#64748b"
              value={cartName}
              onChangeText={setCartName}
            />

            <Text style={styles.inputLabel}>Target Budget (Optional ₹)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 5000"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={targetBudget}
              onChangeText={setTargetBudget}
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitText}>Create Group Cart</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* JOIN ROOM MODAL */}
      <Modal visible={showJoinModal} animationType="slide" transparent onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Shared Cart Room</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter 6-Character Room Code</Text>
            <TextInput
              style={[styles.modalInput, { letterSpacing: 2, textTransform: 'uppercase' }]}
              placeholder="e.g. TECH99 or CART-A1B"
              placeholderTextColor="#64748b"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, joining && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitText}>Join Room</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADD PRODUCT TO ROOM PICKER MODAL */}
      <Modal visible={showAddProductModal} animationType="slide" transparent onRequestClose={() => setShowAddProductModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%', paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product to Room</Text>
              <TouchableOpacity onPress={() => setShowAddProductModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Search size={15} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search catalog items..."
                placeholderTextColor="#64748b"
                value={productSearch}
                onChangeText={setProductSearch}
              />
              {productSearch.trim() ? (
                <TouchableOpacity onPress={() => setProductSearch('')}>
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingProducts ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator size="large" color="#a855f7" />
              </View>
            ) : (
              <FlatList
                data={availableProducts.filter((p) =>
                  !productSearch.trim() ||
                  p.name?.toLowerCase().includes(productSearch.toLowerCase().trim())
                )}
                keyExtractor={(item) => item._id || item.id || String(Math.random())}
                contentContainerStyle={{ paddingVertical: 10, gap: 10 }}
                renderItem={({ item }) => {
                  const img =
                    item.image ||
                    (Array.isArray(item.images) ? item.images[0] : null) ||
                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60';
                  return (
                    <View style={styles.pickerItemRow}>
                      <Image source={{ uri: img }} style={styles.pickerItemImg} resizeMode="cover" />
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={styles.pickerItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.pickerItemPrice}>{formatPrice(item.price)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.pickerAddBtn}
                        onPress={() => handleAddProductToCart(item)}
                      >
                        <Plus size={14} color="#ffffff" />
                        <Text style={styles.pickerAddBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
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
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  inviteHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9333ea',
  },
  cartSwitchRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  cartSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cartSwitchPillActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#9333ea',
  },
  cartSwitchPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  cartSwitchPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7c3aed',
    height: 40,
    borderRadius: 10,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9333ea',
  },
  joinBtnText: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: '700',
  },
  roomOverviewCard: {
    marginHorizontal: 16,
    backgroundColor: '#0d1527',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 10,
  },
  roomOverviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomNameText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  codeLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  codeText: {
    color: '#e9d5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  roomTotalBox: {
    alignItems: 'flex-end',
  },
  roomTotalLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
  },
  roomTotalValue: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '900',
  },
  budgetWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  budgetLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  budgetTrack: {
    height: 5,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  membersRowLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#070b14',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  memberAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  memberNameText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 60,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#090f1d',
    paddingHorizontal: 12,
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
    borderBottomColor: '#a855f7',
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
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemsTabTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addProductBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  itemsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#0d1527',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
  },
  itemThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  itemName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  itemPrice: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  voteControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#070b14',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  voteBtnUpActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  voteBtnDownActive: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  voteNum: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  trashBtn: {
    padding: 6,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  chatScroll: {
    padding: 16,
    gap: 12,
  },
  sysMsgWrap: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginVertical: 4,
  },
  sysMsgText: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
  },
  chatBubbleWrap: {
    maxWidth: '80%',
    marginBottom: 4,
  },
  chatBubbleLeft: {
    alignSelf: 'flex-start',
  },
  chatBubbleRight: {
    alignSelf: 'flex-end',
  },
  chatSender: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 3,
    paddingHorizontal: 4,
  },
  chatBubble: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  chatBubbleMe: {
    backgroundColor: '#7c3aed',
    borderBottomRightRadius: 2,
  },
  chatBubbleOther: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 2,
  },
  chatText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatTextMe: {
    color: '#ffffff',
  },
  chatTextOther: {
    color: '#e2e8f0',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#090f1d',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  chatInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#0f172a',
    borderRadius: 21,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitScroll: {
    padding: 16,
    gap: 16,
  },
  splitCard: {
    backgroundColor: '#0d1527',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    gap: 10,
  },
  splitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 10,
    marginBottom: 4,
  },
  splitCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  splitLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  splitVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  splitTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
    marginTop: 4,
  },
  splitTotalLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  splitTotalVal: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: '900',
  },
  membersSectionTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1527',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
  },
  readinessName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  readinessSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readyPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  readyPillPending: {
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
  },
  readyPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  myReadyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  myReadyBtnActive: {
    backgroundColor: '#10b981',
  },
  myReadyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  proceedCheckoutBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  proceedCheckoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
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
    marginBottom: 16,
  },
  modalTitle: {
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
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    height: 44,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 16,
  },
  modalSubmitBtn: {
    backgroundColor: '#7c3aed',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1527',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 10,
  },
  pickerItemImg: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  pickerItemName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  pickerItemPrice: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  pickerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pickerAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
