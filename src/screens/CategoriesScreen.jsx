import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Laptop,
  Shirt,
  Sparkles,
  ShoppingBag,
  Dumbbell,
  BookOpen,
  Home,
  ChevronRight,
} from 'lucide-react-native';
import colors from '../theme/colors';
import productService from '../services/productService';

const { width } = Dimensions.get('window');

const CATEGORY_ICONS = {
  electronics: Laptop,
  fashion: Shirt,
  clothing: Shirt,
  accessories: ShoppingBag,
  beauty: Sparkles,
  sports: Dumbbell,
  books: BookOpen,
  home: Home,
};

export default function CategoriesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const cats = await productService.getCategories();
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(cats);
        } else {
          setCategories([
            'Electronics',
            'Fashion',
            'Footwear',
            'Wearables',
            'Audio',
            'Bags & Luggage',
            'Home & Living',
            'Sports & Fitness',
            'Beauty & Personal Care',
          ]);
        }
      } catch (e) {
        console.warn('Categories load error:', e);
        setCategories([
          'Electronics',
          'Fashion',
          'Footwear',
          'Wearables',
          'Audio',
          'Bags & Luggage',
          'Home & Living',
          'Sports & Fitness',
          'Beauty & Personal Care',
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getCategoryIcon = (name) => {
    const str = typeof name === 'string' ? name : (name?.name || '');
    const key = str.toLowerCase().split(' ')[0];
    return CATEGORY_ICONS[key] || ShoppingBag;
  };

  const renderCategoryItem = ({ item }) => {
    const IconComponent = getCategoryIcon(item);

    return (
      <TouchableOpacity
        style={styles.categoryCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Home', { selectedCategory: item })}
      >
        <View style={styles.iconContainer}>
          <IconComponent size={24} color={colors.primaryLight} />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.categoryTitle}>{item}</Text>
          <Text style={styles.categorySub}>Browse all products</Text>
        </View>

        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Categories</Text>
        <Text style={styles.headerSub}>Find exactly what you need</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    paddingBottom: 12,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#131422',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContainer: {
    flex: 1,
  },
  categoryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  categorySub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
