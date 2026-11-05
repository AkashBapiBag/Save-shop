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
  const discountVal = Number(item.discount_value || 0);
  const cashbackVal = Number(item.cashback_value || 0);

  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        isOutOfStock && styles.productCardOutOfStock,
        inCartQty > 0 && styles.productCardInCart,
      ]}
      activeOpacity={0.8}
      onPress={() => onAddToCart(item)}
    >
      <View style={styles.productHeader}>
        <Badge
          label={
            stockNum < 0
              ? `${stockNum} ${item.default_unit}`
              : isOutOfStock
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
        <View>
          <Text style={styles.productPrice}>₹ {Number(item.selling_price).toFixed(2)}</Text>
          {discountVal > 0 && (
            <Text style={styles.productDiscountBadge}>
              {item.discount_type === 'amount' ? `₹${discountVal} OFF` : `${discountVal}% OFF`}
            </Text>
          )}
          {cashbackVal > 0 && (
            <Text style={styles.productCashbackBadge}>
              {item.cashback_type === 'amount' ? `+₹${cashbackVal} S.I. Point` : `+${cashbackVal}% S.I. Point`}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.addIconCircle,
            isOutOfStock && styles.addIconCircleOutOfStock,
            inCartQty > 0 && styles.addIconCircleInCart,
          ]}
        >
          <Ionicons
            name={inCartQty > 0 ? 'checkmark' : 'add'}
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
  productCardOutOfStock: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF9F9',
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
  productDiscountBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.emeraldDark,
    marginTop: 1,
  },
  productCashbackBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.bluePrimary,
    marginTop: 1,
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconCircleOutOfStock: {
    backgroundColor: Palette.rose,
  },
  addIconCircleInCart: {
    backgroundColor: Palette.emerald,
  },
});
