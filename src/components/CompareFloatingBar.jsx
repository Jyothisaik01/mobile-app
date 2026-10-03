import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ArrowLeftRight, X, Trash2 } from 'lucide-react-native';
import { useCompare } from '../context/CompareContext';
import colors from '../theme/colors';

export default function CompareFloatingBar({ navigation }) {
  const { compareList, removeFromCompare, clearCompare } = useCompare();

  if (!compareList || compareList.length === 0) {
    return null;
  }

  const canCompare = compareList.length >= 2;

  return (
    <View style={styles.floatingContainer}>
      <View style={styles.innerBar}>
        {/* Left Thumbnails & Counter */}
        <View style={styles.leftSection}>
          <View style={styles.badgeWrap}>
            <ArrowLeftRight size={14} color="#60a5fa" />
            <Text style={styles.badgeText}>{compareList.length}/4</Text>
          </View>

          <View style={styles.thumbnailsRow}>
            {compareList.map((item) => (
              <View key={item._id} style={styles.thumbWrapper}>
                <Image source={{ uri: item.image }} style={styles.thumbImg} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.thumbRemove}
                  onPress={() => removeFromCompare(item._id)}
                >
                  <X size={10} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Right CTA */}
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.clearBtn} onPress={clearCompare}>
            <Trash2 size={14} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.compareBtn, !canCompare && styles.compareBtnDisabled]}
            disabled={!canCompare}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Compare')}
          >
            <Text style={styles.compareBtnText}>
              {canCompare ? 'Compare Now' : 'Add 1 More'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 75,
    left: 14,
    right: 14,
    zIndex: 99,
  },
  innerBar: {
    backgroundColor: '#0c0f1d',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#172554',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  thumbWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    padding: 6,
  },
  compareBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  compareBtnDisabled: {
    backgroundColor: '#1e293b',
  },
  compareBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
