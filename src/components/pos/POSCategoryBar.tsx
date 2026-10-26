import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/theme/designSystem';

export interface POSCategoryBarProps {
  categories: string[];
  selectedCategory: string;
  categoryCounts: Record<string, number>;
  onSelectCategory: (category: string) => void;
}

export const POSCategoryBar: React.FC<POSCategoryBarProps> = ({
  categories,
  selectedCategory,
  categoryCounts,
  onSelectCategory,
}) => {
  return (
    <View style={styles.categoryScrollerContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = categoryCounts[cat] || 0;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryCardPill, isSelected && styles.categoryCardPillActive]}
              activeOpacity={0.7}
              onPress={() => onSelectCategory(cat)}
            >
              <Ionicons
                name={cat === 'All' ? 'grid-outline' : 'folder-outline'}
                size={13}
                color={isSelected ? '#FFFFFF' : Palette.bluePrimary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.categoryCardText, isSelected && styles.categoryCardTextActive]}>
                {cat}
              </Text>
              <View style={[styles.categoryCountBadge, isSelected && styles.categoryCountBadgeActive]}>
                <Text style={[styles.categoryCountBadgeText, isSelected && styles.categoryCountBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  categoryScrollerContainer: {
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  categoryCardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  categoryCardPillActive: {
    backgroundColor: Palette.bluePrimary,
    borderColor: Palette.bluePrimary,
  },
  categoryCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  categoryCardTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryCountBadge: {
    backgroundColor: Palette.borderLight,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  categoryCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  categoryCountBadgeTextActive: {
    color: '#FFFFFF',
  },
});
