import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';

export interface POSCartSummaryBarProps {
  totalCartCount: number;
  finalTotal: number;
  onOpenCart: () => void;
}

export const POSCartSummaryBar: React.FC<POSCartSummaryBarProps> = ({
  totalCartCount,
  finalTotal,
  onOpenCart,
}) => {
  if (totalCartCount <= 0) return null;

  return (
    <View style={styles.bottomCartBar}>
      <TouchableOpacity
        style={styles.cartBarButton}
        activeOpacity={0.9}
        onPress={onOpenCart}
      >
        <View style={styles.cartBadgeGroup}>
          <View style={styles.cartCountBadge}>
            <Text style={styles.cartCountText}>{totalCartCount}</Text>
          </View>
          <Text style={styles.cartBarTitle} numberOfLines={1}>View Order & Discounts</Text>
        </View>
        <View style={styles.cartBarRight}>
          <Text style={styles.cartBarTotal} numberOfLines={1}>₹ {finalTotal.toFixed(2)}</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" style={{ flexShrink: 0 }} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomCartBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    ...Shadows.lg,
  },
  cartBarButton: {
    backgroundColor: Palette.navyPrimary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  cartBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  cartCountBadge: {
    backgroundColor: Palette.bluePrimary,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  cartCountText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  cartBarTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  cartBarTotal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
  },
});
