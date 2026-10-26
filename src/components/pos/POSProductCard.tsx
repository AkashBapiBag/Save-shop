import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Badge } from '@/components/ui/Badge';

export interface POSProductCardProps {
  item: Product;
  inCartQty: number;
  onAddToCart: (product: Product) => void;
}

export const POSProductCard: React.FC<POSProductCardProps> = ({
  item,
  inCartQty,
  onAddToCart,
}) => {
  const stockNum = Number(item.total_current_stock || 0);
  const isOutOfStock = stockNum <= 0;
  const isLowStock = !isOutOfStock && stockNum <= Number(item.min_stock_alert_threshold);

  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        isOutOfStock && styles.productCardDisabled,
        inCartQty > 0 && styles.productCardInCart,
      ]}
      activeOpacity={0.8}
      onPress={() => onAddToCart(item)}
    >
      <View style={styles.productHeader}>
        <Badge
          label={
            isOutOfStock
              ? 'OUT OF STOCK'
              : isLowStock
              ? `LOW (${stockNum})`
              : `${stockNum} ${item.default_unit}`
          }
          variant={isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success'}
          size="sm"
        />
        {inCartQty > 0 ? (
          <View style={styles.inCartBadge}>
            <Text style={styles.inCartBadgeText}>{inCartQty} in cart</Text>
          </View>
        ) : (
          <Text style={styles.productCategory} numberOfLines={1}>
            {item.category}
          </Text>
        )}
      </View>

      <Text style={styles.productName} numberOfLines={2}>
        {item.name}
      </Text>

      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>₹ {Number(item.selling_price).toFixed(2)}</Text>
        <View
          style={[
            styles.addIconCircle,
            isOutOfStock && styles.addIconCircleDisabled,
            inCartQty > 0 && styles.addIconCircleInCart,
          ]}
        >
          <Ionicons
            name={isOutOfStock ? 'ban-outline' : inCartQty > 0 ? 'checkmark' : 'add'}
            size={16}
            color="#FFFFFF"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    margin: 5,
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    justifyContent: 'space-between',
    minHeight: 120,
    ...Shadows.sm,
  },
  productCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
    borderColor: Palette.borderLight,
  },
  productCardInCart: {
    borderColor: Palette.bluePrimary,
    backgroundColor: '#F0F7FF',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productCategory: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textSecondary,
    maxWidth: '45%',
  },
  inCartBadge: {
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 10,
    lineHeight: 18,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconCircleDisabled: {
    backgroundColor: Palette.textMuted,
  },
  addIconCircleInCart: {
    backgroundColor: Palette.emerald,
  },
});
