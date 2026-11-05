import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem } from '@/types/api';
import { Palette } from '@/theme/designSystem';
import { Button } from '@/components/ui/Button';

export interface POSCartCalculation {
  subtotal: number;
  totalCashback: number;
  discountAmount: number;
  discountPct: number;
  finalTotal: number;
}

export interface POSCartDrawerProps {
  visible: boolean;
  cart: CartItem[];
  totalCartCount: number;
  calculation: POSCartCalculation;
  subtotalDiscountType?: 'amount' | 'percentage';
  subtotalDiscountValue?: string;
  isValidatingStock: boolean;
  safeTop: number;
  onClose: () => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSetQuantity?: (productId: string, quantity: number) => void;
  onUpdateItemCashback?: (productId: string, type: 'amount' | 'percentage', valStr: string) => void;
  onSetSubtotalDiscountType?: (type: 'amount' | 'percentage') => void;
  onSetSubtotalDiscountValue?: (val: string) => void;
}

export const POSCartDrawer: React.FC<POSCartDrawerProps> = ({
  visible,
  cart,
  totalCartCount,
  calculation,
  isValidatingStock,
  safeTop,
  onClose,
  onClearCart,
  onProceedToCheckout,
  onUpdateQuantity,
  onSetQuantity,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.drawerContainer}>
        {/* Drawer Header */}
        <View style={[styles.drawerHeader, { paddingTop: safeTop + 8 }]}>
          <View>
            <Text style={styles.drawerTitle}>Order Cart ({totalCartCount} items)</Text>
            <Text style={styles.drawerSubtitle}>Review order items & stock discounts</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-circle" size={26} color={Palette.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Cart Items List */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          {cart.map((item) => {
            const lineBase = item.quantity * item.unit_price;
            const maxStock = Number(item.product.total_current_stock || 0);
            const discAmt = Number(item.item_discount_amount || 0);
            const cbAmt = Number(item.cashback_amount || 0);

            return (
              <View key={item.product.product_id} style={styles.cartItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName} numberOfLines={2}>{item.product.name}</Text>
                  <Text style={styles.cartItemRate} numberOfLines={1}>
                    ₹ {item.unit_price.toFixed(2)} / {item.product.default_unit} • Subtotal: ₹ {lineBase.toFixed(2)}
                  </Text>
                  <Text style={styles.cartStockAlertText}>Available Stock: {maxStock} {item.product.default_unit}</Text>

                  {/* Stock Product Discount Pill */}
                  {discAmt > 0 && (
                    <View style={styles.stockDiscountRow}>
                      <Ionicons name="pricetag" size={12} color={Palette.emeraldDark} />
                      <Text style={styles.stockDiscountText}>
                        Stock Discount: -₹ {discAmt.toFixed(2)} ({item.item_discount_pct.toFixed(0)}% off)
                      </Text>
                    </View>
                  )}

                  {/* Stock Product Automatic S.I. Point Pill */}
                  {cbAmt > 0 && (
                    <View style={styles.cashbackBadgeRow}>
                      <Ionicons name="gift" size={12} color={Palette.bluePrimary} />
                      <Text style={styles.cashbackBadgeText}>
                        S.I. Point: +₹ {cbAmt.toFixed(2)} ({item.cashback_type === 'percentage' ? `${item.cashback_value}%` : `₹${item.cashback_value}`})
                      </Text>
                    </View>
                  )}
                </View>

                {/* Quantity Stepper & Direct Editable Input */}
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateQuantity(item.product.product_id, -1)}
                    accessibilityLabel="Decrease quantity"
                  >
                    <Ionicons name="remove" size={16} color={Palette.textPrimary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.stepQtyInput}
                    keyboardType="numeric"
                    value={String(item.quantity)}
                    onChangeText={(val) => {
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num > 0 && onSetQuantity) {
                        onSetQuantity(item.product.product_id, num);
                      }
                    }}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateQuantity(item.product.product_id, 1)}
                    accessibilityLabel="Increase quantity"
                  >
                    <Ionicons name="add" size={16} color={Palette.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Financial Summary */}
          <View style={styles.breakdownTable}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownValue}>₹ {calculation.subtotal.toFixed(2)}</Text>
            </View>

            {calculation.discountAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: Palette.rose }]}>
                  Discount ({calculation.discountPct.toFixed(1)}%)
                </Text>
                <Text style={[styles.breakdownValue, { color: Palette.rose }]}>
                  -₹ {calculation.discountAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {calculation.totalCashback > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: Palette.bluePrimary }]}>Total S.I. Point</Text>
                <Text style={[styles.breakdownValue, { color: Palette.bluePrimary }]}>
                  +₹ {calculation.totalCashback.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={[styles.breakdownRow, styles.finalTotalRow]}>
              <Text style={styles.finalTotalLabel}>FINAL TOTAL</Text>
              <Text style={styles.finalTotalValue}>₹ {calculation.finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Drawer Actions */}
        <View style={styles.drawerFooter}>
          <Button
            title="Clear Cart"
            variant="secondary"
            size="md"
            onPress={onClearCart}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title={isValidatingStock ? 'Verifying Stock...' : `Charge ₹ ${calculation.finalTotal.toFixed(2)}`}
            variant="success"
            size="md"
            loading={isValidatingStock}
            onPress={onProceedToCheckout}
            style={{ flex: 2 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  drawerSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  cartItemRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  cartItemRate: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  cartStockAlertText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Palette.amber,
    marginTop: 2,
  },
  stockDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  stockDiscountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.emeraldDark,
  },
  cashbackBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  cashbackBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    marginHorizontal: 8,
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    minWidth: 18,
    textAlign: 'center',
  },
  stepQtyInput: {
    marginHorizontal: 4,
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    minWidth: 32,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  subtotalDiscountBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  discountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtotalDiscountTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  discountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountTextInput: {
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    width: 90,
  },
  discountSummaryPreview: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.rose,
    marginLeft: 10,
  },
  breakdownTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  finalTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
    paddingTop: 8,
    marginTop: 4,
  },
  finalTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  finalTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.emeraldDark,
  },
  drawerFooter: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
  },
});
