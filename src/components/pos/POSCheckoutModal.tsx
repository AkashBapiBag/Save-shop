import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethod, CartItem } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface POSCheckoutModalProps {
  visible: boolean;
  finalTotal: number;
  paymentMethod: PaymentMethod;
  receivedAmount: string;
  customerName: string;
  customerPhone: string;
  isProcessingCheckout: boolean;
  cart?: CartItem[];
  onClose: () => void;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onChangeReceivedAmount: (amount: string) => void;
  onChangeCustomerName: (name: string) => void;
  onChangeCustomerPhone: (phone: string) => void;
  onConfirmCheckout: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'CREDIT'];

export const POSCheckoutModal: React.FC<POSCheckoutModalProps> = ({
  visible,
  finalTotal,
  paymentMethod,
  receivedAmount,
  customerName,
  customerPhone,
  isProcessingCheckout,
  cart,
  onClose,
  onSelectPaymentMethod,
  onChangeReceivedAmount,
  onChangeCustomerName,
  onChangeCustomerPhone,
  onConfirmCheckout,
}) => {
  const parsedReceived = parseFloat(receivedAmount) || 0;
  const isCredit = paymentMethod === 'CREDIT';
  const isWalkIn = customerName.toLowerCase().includes('walk-in');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.checkoutOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.checkoutCard}>
            <View style={styles.checkoutHeader}>
              <Text style={styles.checkoutTitle}>Complete Payment</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View style={styles.checkoutAmountBanner}>
                <Text style={styles.checkoutAmountLabel}>Amount Payable:</Text>
                <Text style={styles.checkoutAmountValue}>₹ {finalTotal.toFixed(2)}</Text>
              </View>

              {/* Order Items & Quantities Summary */}
              {cart && cart.length > 0 && (
                <View style={styles.orderSummaryCard}>
                  <Text style={styles.orderSummaryTitle}>
                    Order Items ({cart.reduce((s, it) => s + it.quantity, 0)} {cart.reduce((s, it) => s + it.quantity, 0) === 1 ? 'item' : 'items'})
                  </Text>
                  {cart.map((item) => (
                    <View key={item.product.product_id} style={styles.orderSummaryItemRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.orderSummaryItemName} numberOfLines={1}>
                          {item.product.name}
                        </Text>
                        <Text style={styles.orderSummaryItemMeta}>
                          ₹{item.unit_price.toFixed(2)} / {item.product.default_unit}
                        </Text>
                      </View>
                      <View style={styles.orderSummaryQtyPill}>
                        <Text style={styles.orderSummaryQtyText}>
                          Qty: {item.quantity}
                        </Text>
                      </View>
                      <Text style={styles.orderSummaryItemTotal}>
                        ₹{(item.quantity * item.unit_price - (item.item_discount_amount || 0)).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Payment Method Selector */}
              <Text style={styles.sectionLabel}>Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[styles.paymentMethodChip, isSelected && styles.paymentMethodChipActive]}
                      onPress={() => onSelectPaymentMethod(method)}
                    >
                      <Text style={[styles.paymentMethodText, isSelected && styles.paymentMethodTextActive]} numberOfLines={1}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Received Amount Input & Balance Calculation */}
              <View style={{ marginBottom: 12 }}>
                <View style={styles.amountHeaderRow}>
                  <Text style={styles.sectionLabel}>Amount Received (₹)</Text>
                  {!isCredit && (
                    <TouchableOpacity
                      onPress={() => onChangeReceivedAmount(finalTotal.toFixed(2))}
                      style={styles.exactPill}
                    >
                      <Text style={styles.exactPillText}>Exact (₹{finalTotal.toFixed(2)})</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Input
                  placeholder="0.00"
                  value={receivedAmount}
                  onChangeText={onChangeReceivedAmount}
                  keyboardType="decimal-pad"
                  icon={<Text style={styles.currencyPrefix}>₹</Text>}
                />

                {/* Dynamic Balance Due / Change Calculation */}
                <View style={styles.paymentSummaryBox}>
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Bill Total:</Text>
                    <Text style={styles.paymentSummaryVal}>₹ {finalTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Received:</Text>
                    <Text style={styles.paymentSummaryVal}>₹ {parsedReceived.toFixed(2)}</Text>
                  </View>
                  {parsedReceived < finalTotal ? (
                    <View style={styles.paymentSummaryRow}>
                      <Text style={[styles.paymentSummaryLabel, { color: Palette.rose, fontWeight: '800' }]}>
                        Balance Due (Credit):
                      </Text>
                      <Text style={[styles.paymentSummaryVal, { color: Palette.rose, fontWeight: '800' }]}>
                        ₹ {(finalTotal - parsedReceived).toFixed(2)}
                      </Text>
                    </View>
                  ) : parsedReceived > finalTotal ? (
                    <View style={styles.paymentSummaryRow}>
                      <Text style={[styles.paymentSummaryLabel, { color: Palette.emerald, fontWeight: '800' }]}>
                        Change to Return:
                      </Text>
                      <Text style={[styles.paymentSummaryVal, { color: Palette.emerald, fontWeight: '800' }]}>
                        ₹ {(parsedReceived - finalTotal).toFixed(2)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.paymentSummaryRow}>
                      <Text style={[styles.paymentSummaryLabel, { color: Palette.emerald, fontWeight: '800' }]}>
                        Balance Due:
                      </Text>
                      <Text style={[styles.paymentSummaryVal, { color: Palette.emerald, fontWeight: '800' }]}>
                        ₹ 0.00 (Fully Paid)
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Customer Details - Name required, Phone optional */}
              <Text style={styles.sectionLabel}>
                Customer Details
              </Text>

              <View style={styles.customerPreviewBox}>
                <View style={styles.customerPreviewLeft}>
                  <View style={styles.customerAvatarSmall}>
                    <Ionicons name="person" size={16} color={Palette.bluePrimary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.customerPreviewName} numberOfLines={1}>
                      {customerName || 'Customer Name'}
                    </Text>
                    <Text style={styles.customerPreviewPhone}>
                      {customerPhone
                        ? `📞 ${customerPhone}`
                        : isWalkIn
                        ? 'Walk-in Customer (Mobile optional)'
                        : 'No mobile registered (Optional)'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Input
                  placeholder="Customer Name *"
                  value={customerName}
                  onChangeText={onChangeCustomerName}
                  icon={<Ionicons name="person-outline" size={16} color={Palette.textMuted} />}
                  containerStyle={{ marginBottom: 4 }}
                />
                {!customerName.trim() && (
                  <Text style={styles.fieldErrorText}>* Customer name is required for bill</Text>
                )}
              </View>

              <View style={{ marginBottom: 16 }}>
                <Input
                  placeholder="Contact Mobile Number (Optional)"
                  value={customerPhone}
                  onChangeText={onChangeCustomerPhone}
                  keyboardType="phone-pad"
                  icon={<Ionicons name="call-outline" size={16} color={Palette.textMuted} />}
                  containerStyle={{ marginBottom: 4 }}
                />
                <Text style={styles.optionalHelperText}>
                  {isWalkIn
                    ? '💡 Mobile number is optional for unknown walk-in customers'
                    : '💡 Mobile number is optional for bill generation'}
                </Text>
              </View>

              {/* Confirm Checkout Action */}
              <Button
                title={isProcessingCheckout ? 'Finalizing Bill & Tax Invoice...' : 'Generate Bill & Receipt'}
                variant="primary"
                size="lg"
                loading={isProcessingCheckout}
                disabled={!customerName.trim() || isProcessingCheckout}
                onPress={onConfirmCheckout}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  checkoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 17, 32, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 440,
  },
  checkoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
    ...Shadows.lg,
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkoutTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  checkoutAmountBanner: {
    backgroundColor: Palette.emeraldLight,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  checkoutAmountLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.emeraldDark,
  },
  checkoutAmountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.emeraldDark,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  paymentMethodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    alignItems: 'center',
  },
  paymentMethodChipActive: {
    backgroundColor: Palette.bluePrimary,
    borderColor: Palette.bluePrimary,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  exactPill: {
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exactPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.textSecondary,
  },
  paymentSummaryBox: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  paymentSummaryLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  paymentSummaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  fieldErrorText: {
    fontSize: 11,
    color: Palette.rose,
    marginTop: 2,
    marginLeft: 4,
  },
  customerPreviewBox: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  customerPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerPreviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  customerPreviewPhone: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  optionalHelperText: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 3,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  orderSummaryCard: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  orderSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderSummaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  orderSummaryItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  orderSummaryItemMeta: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  orderSummaryQtyPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  orderSummaryQtyText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  orderSummaryItemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
});
