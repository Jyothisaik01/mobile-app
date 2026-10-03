import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
  Keyboard,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Send,
  Sparkles,
  Bot,
  User,
  ShoppingBag,
  ExternalLink,
  History,
  Settings,
  Plus,
  Trash2,
  Sliders,
  Check,
  X,
  MessageSquare,
  Clock,
  Cpu,
  Zap,
  Mic,
} from 'lucide-react-native';
import colors from '../theme/colors';
import darwinService from '../services/darwinService';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import { formatPrice } from '../utils/formatters';
import Toast from 'react-native-toast-message';
import VoiceSearchModal from '../components/VoiceSearchModal';

const DARWIN_MASCOT = require('../../assets/darwin-mascot-circle.png');
const { width } = Dimensions.get('window');

const INITIAL_WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text: "👋 Hi! I'm **Darwin AI**, your intelligent shopping and inventory assistant.\n\nI can help you find products, compare specifications, track orders, or find the best deals across the entire catalog. How can I assist you today?",
  suggestions: [
    'Recommend best laptops under ₹50,000',
    'Find trending sneakers & streetwear',
    'Which products have highest ratings?',
    'How does return policy work?',
  ],
};

export default function DarwinChatScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const { user } = useAuth();

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([INITIAL_WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Darwin Conversation History State
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Darwin Preferences & Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [darwinSettings, setDarwinSettings] = useState({
    aiProviderPreference: 'auto',
    budgetPreference: 0,
    suggestedPromptsEnabled: true,
    saveConversationsEnabled: true,
  });
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  const scrollToBottom = useCallback((delay = 100) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, delay);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      if (e?.endCoordinates?.height) {
        setKeyboardHeight(e.endCoordinates.height);
      }
      scrollToBottom(50);
      scrollToBottom(250);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  // Load History list from backend
  const fetchConversations = async () => {
    try {
      setLoadingHistory(true);
      const data = await darwinService.getDarwinConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load conversations:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load specific conversation messages
  const handleSelectConversation = async (convId) => {
    try {
      setLoading(true);
      setShowHistoryModal(false);
      const res = await darwinService.getDarwinConversation(convId);
      if (res && res.messages) {
        setActiveConversationId(convId);
        const mapped = res.messages.map((m, idx) => ({
          id: m._id || `m_${idx}_${Date.now()}`,
          role: m.role || 'assistant',
          text: m.content || m.text || '',
          products: m.recommendedProducts || m.products || [],
          suggestions: m.suggestions || [],
        }));
        setMessages(mapped.length > 0 ? mapped : [INITIAL_WELCOME_MESSAGE]);
        scrollToBottom(150);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load conversation', position: 'bottom' });
    } finally {
      setLoading(false);
    }
  };

  // Start new clean chat
  const handleStartNewChat = async () => {
    try {
      const res = await darwinService.createDarwinConversation('New Shopping Chat');
      if (res?._id) {
        setActiveConversationId(res._id);
      } else {
        setActiveConversationId(null);
      }
    } catch {
      setActiveConversationId(null);
    }
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setShowHistoryModal(false);
    Toast.show({ type: 'success', text1: 'Started New Chat ✨', position: 'bottom' });
  };

  // Delete a conversation
  const handleDeleteConversation = async (convId) => {
    try {
      await darwinService.deleteDarwinConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([INITIAL_WELCOME_MESSAGE]);
      }
      Toast.show({ type: 'info', text1: 'Chat deleted', position: 'bottom' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to delete chat', position: 'bottom' });
    }
  };

  // Load Darwin Settings
  const fetchSettings = async () => {
    try {
      const res = await darwinService.getDarwinSettings();
      if (res?.settings) {
        setDarwinSettings({
          aiProviderPreference: res.settings.aiProviderPreference || 'auto',
          budgetPreference: res.settings.budgetPreference || 0,
          suggestedPromptsEnabled: res.settings.suggestedPromptsEnabled !== false,
          saveConversationsEnabled: res.settings.saveConversationsEnabled !== false,
        });
      }
    } catch (err) {
      console.warn('Failed to load settings:', err.message);
    }
  };

  // Save Darwin Settings
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await darwinService.updateDarwinSettings(darwinSettings);
      setShowSettingsModal(false);
      Toast.show({
        type: 'success',
        text1: 'Darwin Preferences Saved! ⚡',
        text2: `AI routing: ${darwinSettings.aiProviderPreference.toUpperCase()}`,
        position: 'bottom',
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to save preferences', position: 'bottom' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSend = async (messageText = inputMessage) => {
    const textToSend = (messageText || '').trim();
    if (!textToSend || loading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);
    scrollToBottom(50);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await darwinService.chatWithDarwin({
        message: textToSend,
        conversationId: activeConversationId,
        conversationHistory: history,
        aiProviderPreference: darwinSettings.aiProviderPreference,
      });

      if (res?.conversationId && !activeConversationId) {
        setActiveConversationId(res.conversationId);
      }

      const replyText =
        res?.reply ||
        res?.message ||
        "I've searched our inventory catalog for you! Here are the best options matching your request.";

      const darwinMsg = {
        id: `darwin_${Date.now()}`,
        role: 'assistant',
        text: replyText,
        products: res?.recommendedProducts || res?.products || [],
        suggestions: darwinSettings.suggestedPromptsEnabled ? (res?.suggestions || []) : [],
      };

      setMessages((prev) => [...prev, darwinMsg]);
      scrollToBottom(100);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `darwin_err_${Date.now()}`,
          role: 'assistant',
          text: "I'm having a little trouble connecting to the inventory AI service right now. Please try again in a moment.",
        },
      ]);
      scrollToBottom(100);
    } finally {
      setLoading(false);
    }
  };

  const renderProductChip = (prod) => {
    const pId = prod._id || prod.id;
    const imageUrl =
      prod.image ||
      prod.images?.[0]?.url ||
      (Array.isArray(prod.images) && prod.images[0]) ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60';

    return (
      <TouchableOpacity
        key={pId || String(Math.random())}
        style={styles.productRecCard}
        onPress={() => navigation.navigate('ProductDetails', { productId: pId, product: prod })}
        activeOpacity={0.8}
      >
        <Image source={{ uri: imageUrl }} style={styles.productRecImage} resizeMode="cover" />
        <View style={styles.productRecInfo}>
          <Text style={styles.productRecTitle} numberOfLines={1}>
            {prod.name || 'Product'}
          </Text>
          <Text style={styles.productRecPrice}>
            {formatPrice(prod.price || 0)}
          </Text>
        </View>
        <ExternalLink size={14} color={colors.primaryLight} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';

    const userAvatarUri = user?.avatar
      ? (user.avatar.startsWith('data:') || user.avatar.startsWith('http')
          ? user.avatar
          : `${BASE_URL}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`)
      : null;

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowDarwin,
        ]}
      >
        {!isUser && (
          <View style={styles.darwinAvatarCircle}>
            <Image
              source={DARWIN_MASCOT}
              style={styles.darwinAvatarImg}
              resizeMode="cover"
            />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleDarwin,
          ]}
        >
          <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
            {item.text}
          </Text>

          {/* Embedded recommended products */}
          {item.products && item.products.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsLabel}>Suggested Products:</Text>
              {item.products.slice(0, 3).map((p) => renderProductChip(p))}
            </View>
          )}

          {/* Prompt Suggestions */}
          {item.suggestions && item.suggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              {item.suggestions.map((sug, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionPill}
                  onPress={() => handleSend(sug)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {isUser && (
          <View style={styles.userAvatarCircle}>
            {userAvatarUri ? (
              <Image
                source={{ uri: userAvatarUri }}
                style={styles.userAvatarImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.userAvatarFallback}>
                <User size={15} color="#ffffff" />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        Platform.OS === 'android' && { paddingBottom: keyboardHeight },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerMascotWrap}>
            <Image
              source={DARWIN_MASCOT}
              style={styles.headerMascotAvatar}
              resizeMode="cover"
            />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerTextWrap}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Darwin AI</Text>
              <Sparkles size={13} color="#60a5fa" />
            </View>
            <Text style={styles.headerStatus}>Online • Shopping Copilot</Text>
          </View>
        </View>

        {/* Header Actions: History & Settings */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => {
              setShowHistoryModal(true);
              fetchConversations();
            }}
          >
            <History size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => {
              setShowSettingsModal(true);
              fetchSettings();
            }}
          >
            <Settings size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[styles.messagesContainer, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={() => scrollToBottom(50)}
        onLayout={() => scrollToBottom(50)}
      />

      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.typingText}>Darwin is thinking & searching catalog...</Text>
        </View>
      )}

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: keyboardVisible
              ? 10
              : Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Ask Darwin anything about products..."
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
            value={inputMessage}
            onChangeText={setInputMessage}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 150);
            }}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.voiceBtn}
            onPress={() => setVoiceModalVisible(true)}
            activeOpacity={0.7}
          >
            <Mic size={19} color="#60a5fa" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendBtn, !inputMessage.trim() && styles.sendBtnDisabled]}
            disabled={!inputMessage.trim() || loading}
            onPress={() => handleSend(inputMessage)}
          >
            <Send size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice Search / Speech to Text Input Modal */}
      <VoiceSearchModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onSearchQuery={(q) => {
          setVoiceModalVisible(false);
          setInputMessage(q);
          handleSend(q);
        }}
      />

      {/* Darwin Chat History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalTopBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#60a5fa" />
                <Text style={styles.modalTitle}>Chat History</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity style={styles.newChatBtn} onPress={handleStartNewChat}>
                  <Plus size={14} color="#ffffff" />
                  <Text style={styles.newChatBtnText}>New Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowHistoryModal(false)}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>

            {loadingHistory ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 10 }}>Loading conversations...</Text>
              </View>
            ) : conversations.length === 0 ? (
              <View style={{ padding: 36, alignItems: 'center' }}>
                <MessageSquare size={36} color={colors.textMuted} />
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700', marginTop: 12 }}>No previous chats</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Your shopping conversations with Darwin will appear here.
                </Text>
                <TouchableOpacity style={[styles.newChatBtn, { marginTop: 16, paddingHorizontal: 16 }]} onPress={handleStartNewChat}>
                  <Plus size={14} color="#ffffff" />
                  <Text style={styles.newChatBtnText}>Start First Chat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item._id}
                style={{ maxHeight: 350 }}
                renderItem={({ item }) => {
                  const isActive = activeConversationId === item._id;
                  const dateStr = item.updatedAt || item.createdAt
                    ? new Date(item.updatedAt || item.createdAt).toLocaleDateString()
                    : 'Recent';
                  return (
                    <TouchableOpacity
                      style={[styles.historyItemCard, isActive && styles.historyItemCardActive]}
                      onPress={() => handleSelectConversation(item._id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.historyTitle, isActive && styles.historyTitleActive]} numberOfLines={1}>
                          {item.title || 'Shopping Conversation'}
                        </Text>
                        <Text style={styles.historyDate}>{dateStr}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteChatBtn}
                        onPress={() => handleDeleteConversation(item._id)}
                      >
                        <Trash2 size={15} color="#f87171" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Darwin AI Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalTopBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Settings size={18} color="#60a5fa" />
                <Text style={styles.modalTitle}>Darwin AI Preferences</Text>
              </View>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowSettingsModal(false)}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* AI Engine Routing */}
              <Text style={styles.settingSectionTitle}>AI PROVIDER ENGINE</Text>
              <View style={styles.providerGrid}>
                {[
                  { id: 'auto', label: 'Auto (Intelligent)', sub: 'Fastest & Best Model' },
                  { id: 'openai', label: 'OpenAI (GPT-4o)', sub: 'Deep Creative Reasoning' },
                  { id: 'gemini', label: 'Google Gemini', sub: 'High Context Specs' },
                  { id: 'groq', label: 'Groq (Llama 3.3)', sub: 'Ultra Fast Response' },
                ].map((p) => {
                  const isSel = darwinSettings.aiProviderPreference === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.providerCard, isSel && styles.providerCardActive]}
                      onPress={() => setDarwinSettings((prev) => ({ ...prev, aiProviderPreference: p.id }))}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.providerLabel, isSel && styles.providerLabelActive]}>{p.label}</Text>
                        <Text style={styles.providerSub}>{p.sub}</Text>
                      </View>
                      {isSel && <Check size={16} color="#60a5fa" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Shopping Budget Quick Setting */}
              <Text style={[styles.settingSectionTitle, { marginTop: 14 }]}>MAX BUDGET PREFERENCE</Text>
              <View style={styles.budgetRow}>
                {[0, 5000, 25000, 50000, 100000].map((amt) => {
                  const isBudget = darwinSettings.budgetPreference === amt;
                  return (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.budgetChip, isBudget && styles.budgetChipActive]}
                      onPress={() => setDarwinSettings((prev) => ({ ...prev, budgetPreference: amt }))}
                    >
                      <Text style={[styles.budgetChipText, isBudget && styles.budgetChipTextActive]}>
                        {amt === 0 ? 'No Limit' : `₹${amt >= 1000 ? `${amt / 1000}k` : amt}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Toggle Options */}
              <Text style={[styles.settingSectionTitle, { marginTop: 16 }]}>INTELLIGENCE FEATURES</Text>
              <View style={styles.toggleItem}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleItemTitle}>Smart Prompt Suggestions</Text>
                  <Text style={styles.toggleItemSub}>Show contextual question chips under Darwin answers</Text>
                </View>
                <Switch
                  value={darwinSettings.suggestedPromptsEnabled}
                  onValueChange={(val) => setDarwinSettings((prev) => ({ ...prev, suggestedPromptsEnabled: val }))}
                  trackColor={{ false: '#334155', true: '#2563eb' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleItemTitle}>Auto-Save Conversation History</Text>
                  <Text style={styles.toggleItemSub}>Retain past shopping sessions across devices</Text>
                </View>
                <Switch
                  value={darwinSettings.saveConversationsEnabled}
                  onValueChange={(val) => setDarwinSettings((prev) => ({ ...prev, saveConversationsEnabled: val }))}
                  trackColor={{ false: '#334155', true: '#2563eb' }}
                  thumbColor="#ffffff"
                />
              </View>

              <TouchableOpacity
                style={styles.saveSettingsBtn}
                onPress={handleSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveSettingsBtnText}>Save Preferences</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerMascotWrap: {
    position: 'relative',
    width: 38,
    height: 38,
  },
  headerMascotAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    backgroundColor: '#1e293b',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  headerTextWrap: {
    alignItems: 'flex-start',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerStatus: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  messagesContainer: {
    padding: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowDarwin: {
    justifyContent: 'flex-start',
  },
  darwinAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    backgroundColor: '#0f172a',
    marginBottom: 2,
  },
  darwinAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#60a5fa',
    backgroundColor: '#1e3a8a',
    marginBottom: 2,
  },
  userAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarInitial: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  bubble: {
    maxWidth: width * 0.74,
    borderRadius: 16,
    padding: 14,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleDarwin: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  recommendationsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  recommendationsLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  productRecCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    marginBottom: 6,
  },
  productRecImage: {
    width: 38,
    height: 38,
    borderRadius: 6,
  },
  productRecInfo: {
    flex: 1,
    marginLeft: 10,
  },
  productRecTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  productRecPrice: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  suggestionsList: {
    marginTop: 12,
    gap: 6,
  },
  suggestionPill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#2e3558',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  inputBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 8,
  },
  voiceBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  sendBtnDisabled: {
    backgroundColor: '#27272a',
    opacity: 0.6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: colors.card,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  newChatBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  historyItemCardActive: {
    borderColor: colors.primaryLight,
    backgroundColor: '#172554',
  },
  historyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  historyTitleActive: {
    color: '#93c5fd',
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  deleteChatBtn: {
    padding: 8,
  },
  settingSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  providerGrid: {
    gap: 8,
    marginBottom: 10,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  providerLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  providerLabelActive: {
    color: '#60a5fa',
  },
  providerSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  budgetChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  budgetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  budgetChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  budgetChipTextActive: {
    color: '#ffffff',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  toggleItemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleItemSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  saveSettingsBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  saveSettingsBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

