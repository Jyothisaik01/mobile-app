import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Trash2,
  Sparkles,
  ShoppingBag,
  Star,
  CheckCircle2,
  X,
  Crown,
  Cpu,
} from 'lucide-react-native';
import colors from '../theme/colors';
import { useCompare } from '../context/CompareContext';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';
import compareService from '../services/compareService';
import productService from '../services/productService';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = Math.max(170, (width - 44) / 2);

export default function CompareScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();

  const [enrichedProducts, setEnrichedProducts] = useState(compareList);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState(new Set());
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Fetch full specifications for all compared items
  useEffect(() => {
    async function enrich() {
      if (!compareList || compareList.length === 0) {
        setEnrichedProducts([]);
        return;
      }
      try {
        setLoadingSpecs(true);
        const enriched = await Promise.all(
          compareList.map(async (p) => {
            const pId = p._id || p.id;
            try {
              const full = await productService.getProductById(pId);
              return { ...p, ...full };
            } catch {
              return p;
            }
          })
        );
        setEnrichedProducts(enriched);
      } catch (err) {
        console.warn('Failed to enrich compare specs:', err);
      } finally {
        setLoadingSpecs(false);
      }
    }
    enrich();
  }, [compareList]);

  const handleAddToCartWithFeedback = (item) => {
    const id = item._id || item.id;
    addToCart(item, 1);
    setAddedItemIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setAddedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1800);
  };

  const handleRunAiCompare = async () => {
    if (compareList.length < 2) return;
    try {
      setAnalyzingAi(true);
      const productIds = compareList.map((p) => p._id);
      const result = await compareService.requestCompareAiAnalysis(productIds);
      // The backend returns { recommendation: { winnerId, winnerName, badge, verdict, pros }, products }
      const rec = result?.recommendation || result;
      setAiAnalysis(rec);
      Toast.show({ type: 'success', text1: 'AI Analysis Complete! 🧠', position: 'bottom' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'AI Analysis Failed', text2: err.message, position: 'bottom' });
    } finally {
      setAnalyzingAi(false);
    }
  };

  if (!compareList || compareList.length === 0) {
    return (
      <View style={[styles.container, styles.emptyCenter, { paddingTop: insets.top }]}>
        <View style={styles.emptyIconCircle}>
          <Sparkles size={40} color={colors.primaryLight} />
        </View>
        <Text style={styles.emptyTitle}>No Products in Compare</Text>
        <Text style={styles.emptySubtitle}>
          Select at least 2 items from the catalog or product pages to compare side-by-side.
        </Text>
        <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.exploreBtnText}>Browse Catalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Normalize technical specs across all compared products
  const flattenProductSpecs = (product) => {
    const specsMap = {};

    // Standard technical attributes
    specsMap['Category'] = String(product.category || 'General');
    specsMap['Brand'] = String(product.brand || 'Prime Certified');
    specsMap['Stock Status'] = (product.quantity || product.stock || 0) > 0 ? 'In Stock' : 'Out of Stock';
    specsMap['Customer Rating'] = `${product.rating || '4.8'} ★ (${product.ratingCount || product.numReviews || 24} ratings)`;
    specsMap['Price'] = formatPrice(product.price);

    if (product.clothingType) specsMap['Apparel Type'] = String(product.clothingType);
    if (product.material) specsMap['Material / Fabric'] = String(product.material);
    if (product.dimensions) specsMap['Dimensions'] = String(product.dimensions);
    if (product.weight) specsMap['Weight'] = String(product.weight);
    if (product.color) specsMap['Color Variant'] = String(product.color);
    if (product.confidenceScore) specsMap['Authenticity'] = `${product.confidenceScore}% Certified`;

    // Custom specification fields
    let raw = product.specifications;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { raw = null; }
    }

    if (raw && typeof raw === 'object') {
      Object.entries(raw).forEach(([secOrKey, secVal]) => {
        // Exclude warranty or returns from technical comparison
        const lowerKey = secOrKey.toLowerCase();
        if (lowerKey.includes('warranty') || lowerKey.includes('return')) return;

        if (secVal && typeof secVal === 'object' && !Array.isArray(secVal)) {
          Object.entries(secVal).forEach(([k, v]) => {
            const lowerK = k.toLowerCase();
            if (lowerK.includes('warranty') || lowerK.includes('return')) return;
            if (v !== undefined && v !== null && v !== '') {
              specsMap[`${secOrKey}: ${k}`] = String(v);
            }
          });
        } else if (secVal !== undefined && secVal !== null && secVal !== '') {
          specsMap[secOrKey] = String(secVal);
        }
      });
    }

    return specsMap;
  };

  const productSpecsList = enrichedProducts.map((p) => ({
    _id: p._id || p.id,
    specs: flattenProductSpecs(p),
  }));

  // Unique specification keys across compared products
  const allSpecKeys = Array.from(
    new Set(productSpecsList.flatMap((p) => Object.keys(p.specs)))
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Technical Comparison</Text>
          <Text style={styles.headerSubtitle}>{compareList.length} of 4 items selected</Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={clearCompare}>
          <Trash2 size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}>
        {/* AI Comparison Analysis Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiTag}>
              <Sparkles size={14} color="#818cf8" />
              <Text style={styles.aiTagText}>Darwin AI Engine</Text>
            </View>
            <TouchableOpacity
              style={[styles.aiRunBtn, (analyzingAi || compareList.length < 2) && { opacity: 0.6 }]}
              disabled={analyzingAi || compareList.length < 2}
              onPress={handleRunAiCompare}
            >
              {analyzingAi ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.aiRunBtnText}>Run AI Compare</Text>
              )}
            </TouchableOpacity>
          </View>

          {aiAnalysis ? (
            <View style={styles.aiResultWrap}>
              <View style={styles.winnerHeader}>
                <View style={styles.winnerBadgePill}>
                  <Crown size={12} color="#f59e0b" />
                  <Text style={styles.winnerBadgeText}>{String(aiAnalysis.badge || 'AI Recommended')}</Text>
                </View>
                <Text style={styles.winnerTitle}>Winner: {String(aiAnalysis.winnerName || 'Top Pick')}</Text>
              </View>

              <Text style={styles.aiVerdictText}>
                {typeof aiAnalysis.verdict === 'string'
                  ? aiAnalysis.verdict.replace(/\*\*/g, '')
                  : typeof aiAnalysis.summary === 'string'
                  ? aiAnalysis.summary
                  : 'AI analysis evaluated performance, rating, and value ratio.'}
              </Text>

              {Array.isArray(aiAnalysis.pros) && aiAnalysis.pros.length > 0 && (
                <View style={styles.prosContainer}>
                  {aiAnalysis.pros.map((pro, idx) => (
                    <View key={idx} style={styles.proRow}>
                      <CheckCircle2 size={13} color="#34d399" />
                      <Text style={styles.proText}>{String(pro)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.aiPrompt}>
              Tap "Run AI Compare" to generate an automatic technical trade-off analysis, feature breakdown, and purchase recommendation.
            </Text>
          )}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Cpu size={15} color="#38bdf8" />
          <Text style={styles.sectionHeadingText}>Technical Specifications Matrix</Text>
        </View>

        {/* Horizontal Side-by-Side Comparison Table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableContainer}>
          {enrichedProducts.map((item) => {
            const pId = item._id || item.id;
            const isWinner = aiAnalysis?.winnerId && String(aiAnalysis.winnerId) === String(pId);
            const mySpecs = productSpecsList.find((p) => p._id === pId)?.specs || {};
            const isAdded = addedItemIds.has(pId);
            const imageUrl =
              item.images?.[0]?.url ||
              item.image ||
              (Array.isArray(item.images) && typeof item.images[0] === 'string' ? item.images[0] : null) ||
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';

            return (
              <View key={pId} style={[styles.productColumn, isWinner && styles.winnerColumn, { width: COLUMN_WIDTH }]}>
                {/* Product Card Top */}
                <View style={[styles.colCardTop, isWinner && { backgroundColor: '#091c13' }]}>
                  {isWinner && (
                    <View style={styles.colWinnerTag}>
                      <Crown size={11} color="#f59e0b" />
                      <Text style={styles.colWinnerTagText}>WINNER</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.colRemoveBtn}
                    onPress={() => removeFromCompare(pId)}
                  >
                    <X size={14} color="#ffffff" />
                  </TouchableOpacity>

                  <Image source={{ uri: imageUrl }} style={styles.colImg} resizeMode="cover" />

                  <Text style={styles.colCategory}>{item.category || 'General'}</Text>
                  <Text style={styles.colName} numberOfLines={2}>{item.name}</Text>

                  <View style={styles.colRatingRow}>
                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                    <Text style={styles.colRatingText}>{item.rating || '4.8'}</Text>
                    <Text style={styles.colRatingCount}>({item.ratingCount || item.numReviews || 24})</Text>
                  </View>

                  <Text style={styles.colPrice}>{formatPrice(item.price)}</Text>

                  <TouchableOpacity
                    style={[styles.colAddBtn, isAdded && styles.colAddBtnSuccess]}
                    activeOpacity={0.8}
                    onPress={() => handleAddToCartWithFeedback(item)}
                  >
                    {isAdded ? (
                      <>
                        <CheckCircle2 size={14} color="#ffffff" />
                        <Text style={styles.colAddBtnText}>Added ✓</Text>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={14} color="#ffffff" />
                        <Text style={styles.colAddBtnText}>Add to Cart</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Technical Specifications Matrix */}
                <View style={styles.matrixSection}>
                  {allSpecKeys.length === 0 ? (
                    <View style={styles.matrixRow}>
                      <Text style={styles.matrixLabel}>Category</Text>
                      <Text style={styles.matrixVal}>{item.category || 'General'}</Text>
                    </View>
                  ) : (
                    allSpecKeys.map((key) => {
                      const val = mySpecs[key] || '—';
                      return (
                        <View key={key} style={styles.matrixRow}>
                          <Text style={styles.matrixLabel}>{key}</Text>
                          <Text style={[styles.matrixVal, val === '—' && { color: colors.textMuted }]}>
                            {val}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
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
    paddingVertical: 14,
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
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3f1212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCard: {
    margin: 16,
    backgroundColor: '#0c0f22',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232a56',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiTagText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700',
  },
  aiRunBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  aiRunBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  aiPrompt: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  aiResultWrap: {
    marginTop: 6,
    gap: 8,
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  winnerBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  winnerBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  winnerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  aiVerdictText: {
    color: '#cbd5e1',
    fontSize: 12.5,
    lineHeight: 18,
  },
  prosContainer: {
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e243d',
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proText: {
    color: '#34d399',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionHeadingText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productColumn: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  winnerColumn: {
    borderColor: '#10b981',
    borderWidth: 1.5,
  },
  colCardTop: {
    padding: 12,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colWinnerTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 5,
  },
  colWinnerTagText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
  },
  colRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  colImg: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    backgroundColor: '#111827',
    marginBottom: 8,
  },
  colCategory: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  colName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    height: 36,
    marginTop: 2,
  },
  colRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  colRatingText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  colRatingCount: {
    color: colors.textMuted,
    fontSize: 10,
  },
  colPrice: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 10,
  },
  colAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
  },
  colAddBtnSuccess: {
    backgroundColor: '#10b981',
  },
  colAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  matrixSection: {
    padding: 12,
    gap: 8,
  },
  matrixRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#171923',
  },
  matrixLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  matrixVal: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
