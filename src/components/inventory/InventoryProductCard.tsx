import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Badge } from '@/components/ui/Badge';

export interface InventoryProductCardProps {
  item: Product;
  onPress: (product: Product) => void;
}

export const InventoryProductCard: React.FC<InventoryProductCardProps> = ({
  item,
  onPress,
}) => {
  const stock = Number(item.total_current_stock);
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= Number(item.min_stock_alert_threshold);

  return (
    <TouchableOpacity
      style={styles.productRow}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
        <View style={styles.nameBadgeRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Badge
            label={isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
            variant={isOut ? 'danger' : isLow ? 'warning' : 'success'}
            size="sm"
            style={{ marginLeft: 6, flexShrink: 0 }}
          />
        </View>
        <Text style={styles.productMeta} numberOfLines={1}>
          {item.category} • Min Stock Alert: {item.min_stock_alert_threshold} {item.default_unit}
        </Text>
      </View>

      <View style={styles.priceStockColumn}>
        <Text style={styles.productPrice}>₹ {Number(item.selling_price).toFixed(2)}</Text>
        <Text style={[styles.stockText, isOut && { color: Palette.rose }]}>
          {stock} {item.default_unit}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={Palette.textMuted} style={{ marginLeft: 6, flexShrink: 0 }} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    flexShrink: 1,
  },
  productMeta: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  priceStockColumn: {
    alignItems: 'flex-end',
    marginLeft: 8,
    flexShrink: 0,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.emeraldDark,
    marginTop: 2,
  },
});
