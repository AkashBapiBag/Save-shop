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
  subtotalDiscountType: 'amount' | 'percentage';
  subtotalDiscountValue: string;
  isValidatingStock: boolean;
  safeTop: number;
  onClose: () => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateItemCashback: (productId: string, type: 'amount' | 'percentage', valStr: string) => void;
  onSetSubtotalDiscountType: (type: 'amount' | 'percentage') => void;
  onSetSubtotalDiscountValue: (val: string) => void;
}

export const POSCartDrawer: React.FC<POSCartDrawerProps> = ({
  visible,
  cart,
  totalCartCount,
  calculation,
  subtotalDiscountType,
  subtotalDiscountValue,
  isValidatingStock,
  safeTop,
  onClose,
  onClearCart,
  onProceedToCheckout,
  onUpdateQuantity,
  onUpdateItemCashback,
  onSetSubtotalDiscountType,
  onSetSubtotalDiscountValue,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.drawerContainer}>
        {/* Drawer Header */}
        <View style={[styles.drawerHeader, { paddingTop: safeTop + 8 }]}>
          <View>
            <Text style={styles.drawerTitle}>Order Cart ({totalCartCount} items)</Text>
            <Text style={styles.drawerSubtitle}>Set line cashback & subtotal discount</Text>
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

            return (
              <View key={item.product.product_id} style={styles.cartItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemRate}>
                    ₹ {item.unit_price.toFixed(2)} / {item.product.default_unit} • Subtotal: ₹ {lineBase.toFixed(2)}
                  </Text>
                  <Text style={styles.cartStockAlertText}>Available Stock: {maxStock} {item.product.default_unit}</Text>

                  {/* Product-level Cashback Setup */}
                  <View style={styles.cashbackSection}>
                    <View style={styles.cashbackLabelRow}>
                      <Text style={styles.cashbackLabel}>Product Cashback:</Text>
                      <View style={styles.toggleButtonGroup}>
                        <TouchableOpacity
                          style={[styles.toggleBtn, item.cashback_type === 'percentage' && styles.toggleBtnActive]}
                          onPress={() => onUpdateItemCashback(item.product.product_id, 'percentage', String(item.cashback_value))}
                        >
                          <Text style={[styles.toggleBtnText, item.cashback_type === 'percentage' && styles.toggleBtnTextActive]}>%</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleBtn, item.cashback_type === 'amount' && styles.toggleBtnActive]}
                          onPress={() => onUpdateItemCashback(item.product.product_id, 'amount', String(item.cashback_value))}
                        >
                          <Text style={[styles.toggleBtnText, item.cashback_type === 'amount' && styles.toggleBtnTextActive]}>₹</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.cashbackInputRow}>
                      <TextInput
                        style={styles.cashbackTextInput}
                        placeholder="0"
                        keyboardType="numeric"
                        value={item.cashback_value ? String(item.cashback_value) : ''}
                        onChangeText={(t) => onUpdateItemCashback(item.product.product_id, item.cashback_type, t)}
                      />
                      <Text style={styles.cashbackSummaryPreview}>
                        = ₹ {Number(item.cashback_amount || 0).toFixed(2)} Cashback
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quantity Stepper */}
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateQuantity(item.product.product_id, -1)}
                  >
                    <Ionicons name="remove" size={16} color={Palette.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepQty}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateQuantity(item.product.product_id, 1)}
                  >
                    <Ionicons name="add" size={16} color={Palette.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Subtotal Discount Control */}
          <View style={styles.subtotalDiscountBox}>
            <View style={styles.discountHeaderRow}>
              <Text style={styles.subtotalDiscountTitle}>Order Subtotal Discount</Text>
              <View style={styles.toggleButtonGroup}>
                <TouchableOpacity
                  style={[styles.toggleBtn, subtotalDiscountType === 'amount' && styles.toggleBtnActive]}
                  onPress={() => onSetSubtotalDiscountType('amount')}
                >
                  <Text style={[styles.toggleBtnText, subtotalDiscountType === 'amount' && styles.toggleBtnTextActive]}>₹ Amount</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, subtotalDiscountType === 'percentage' && styles.toggleBtnActive]}
                  onPress={() => onSetSubtotalDiscountType('percentage')}
                >
                  <Text style={[styles.toggleBtnText, subtotalDiscountType === 'percentage' && styles.toggleBtnTextActive]}>% Pct</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.discountInputRow}>
              <TextInput
                style={styles.discountTextInput}
                placeholder="0"
                keyboardType="numeric"
                value={subtotalDiscountValue}
                onChangeText={onSetSubtotalDiscountValue}
              />
              <Text style={styles.discountSummaryPreview}>
                Discount: -₹ {calculation.discountAmount.toFixed(2)}
                {subtotalDiscountType === 'percentage' ? ` (${calculation.discountPct}%)` : ''}
              </Text>
            </View>
          </View>

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
                <Text style={[styles.breakdownLabel, { color: Palette.bluePrimary }]}>Total Cashback Given</Text>
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
  cashbackSection: {
    backgroundColor: Palette.surfaceLight,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  cashbackLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cashbackLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  toggleBtnTextActive: {
    color: Palette.bluePrimary,
  },
  cashbackInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashbackTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    width: 70,
  },
  cashbackSummaryPreview: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.bluePrimary,
    marginLeft: 8,
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
