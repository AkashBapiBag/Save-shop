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
  isWalkIn?: boolean;
  existingDue?: number;
  existingAdvance?: number;
  saveExcessAsAdvance?: boolean;
  useAdvanceBalance?: boolean;
  onClose: () => void;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onChangeReceivedAmount: (amount: string) => void;
  onChangeCustomerName: (name: string) => void;
  onChangeCustomerPhone: (phone: string) => void;
  onToggleSaveExcessAsAdvance?: (val: boolean) => void;
  onToggleUseAdvanceBalance?: (val: boolean) => void;
  onConfirmCheckout: () => void;
}

const ALL_PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'CREDIT'];

export const POSCheckoutModal: React.FC<POSCheckoutModalProps> = ({
  visible,
  finalTotal,
  paymentMethod,
  receivedAmount,
  customerName,
  customerPhone,
  isProcessingCheckout,
  cart,
  isWalkIn: propIsWalkIn,
  existingDue = 0,
  existingAdvance = 0,
  saveExcessAsAdvance = false,
  useAdvanceBalance = false,
  onClose,
  onSelectPaymentMethod,
  onChangeReceivedAmount,
  onChangeCustomerName,
  onChangeCustomerPhone,
  onToggleSaveExcessAsAdvance,
  onToggleUseAdvanceBalance,
  onConfirmCheckout,
}) => {
  const isWalkIn =
    propIsWalkIn !== undefined
      ? propIsWalkIn
      : customerName.toLowerCase().includes('walk-in');

  const availablePaymentMethods = isWalkIn
    ? ALL_PAYMENT_METHODS.filter((m) => m !== 'CREDIT')
    : ALL_PAYMENT_METHODS;

  React.useEffect(() => {
    if (isWalkIn && paymentMethod === 'CREDIT') {
      onSelectPaymentMethod('CASH');
    }
  }, [isWalkIn, paymentMethod, onSelectPaymentMethod]);

  const parsedReceived = parseFloat(receivedAmount) || 0;
  const isCredit = paymentMethod === 'CREDIT';

  const advanceApplied = !isWalkIn && useAdvanceBalance ? Math.min(existingAdvance, finalTotal) : 0;
  const netPayable = Math.max(0, finalTotal - advanceApplied);
  const balanceDue = isCredit ? netPayable : Math.max(0, netPayable - parsedReceived);
  const excess = !isCredit && parsedReceived > netPayable ? parsedReceived - netPayable : 0;

  const isWalkInShortfall = isWalkIn && parsedReceived < netPayable;
  const isDueMissingPhone = !isWalkIn && balanceDue > 0 && !customerPhone.trim();

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
              style={{ flexGrow: 1, flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View style={styles.checkoutAmountBanner}>
                <View>
                  <Text style={styles.checkoutAmountLabel}>Amount Payable:</Text>
                  {useAdvanceBalance && advanceApplied > 0 && (
                    <Text style={styles.advanceDeductedNote}>
                      (₹{finalTotal.toFixed(2)} - ₹{advanceApplied.toFixed(2)} Advance Credit)
                    </Text>
                  )}
                </View>
                <Text style={styles.checkoutAmountValue}>₹ {netPayable.toFixed(2)}</Text>
              </View>

              {/* Outstanding Due Notice if customer has prior dues */}
              {!isWalkIn && existingDue > 0 && (
                <View style={styles.existingDueNotice}>
                  <Ionicons name="alert-circle" size={16} color={Palette.rose} />
                  <Text style={styles.existingDueNoticeText}>
                    Note: Customer owes ₹{existingDue.toFixed(2)} from previous visits.
                  </Text>
                </View>
              )}

              {/* Advance Balance Available Notice */}
              {!isWalkIn && existingAdvance > 0 && (
                <View style={styles.advanceCreditNotice}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="wallet-outline" size={18} color={Palette.emerald} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.advanceCreditTitle}>Customer Advance Available</Text>
                      <Text style={styles.advanceCreditSubtitle}>₹{existingAdvance.toFixed(2)} store credit</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.useAdvanceBtn, useAdvanceBalance && styles.useAdvanceBtnActive]}
                    onPress={() => onToggleUseAdvanceBalance?.(!useAdvanceBalance)}
                  >
                    <Ionicons
                      name={useAdvanceBalance ? 'checkmark-circle' : 'add-circle-outline'}
                      size={14}
                      color={useAdvanceBalance ? '#FFFFFF' : Palette.emeraldDark}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.useAdvanceBtnText, useAdvanceBalance && styles.useAdvanceBtnTextActive]}>
                      {useAdvanceBalance ? 'Applied' : 'Use Credit'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

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
                {availablePaymentMethods.map((method) => {
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
                      onPress={() => onChangeReceivedAmount(netPayable.toFixed(2))}
                      style={styles.exactPill}
                    >
                      <Text style={styles.exactPillText}>Exact (₹{netPayable.toFixed(2)})</Text>
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
                  {useAdvanceBalance && advanceApplied > 0 && (
                    <View style={styles.paymentSummaryRow}>
                      <Text style={[styles.paymentSummaryLabel, { color: Palette.emeraldDark }]}>Advance Applied:</Text>
                      <Text style={[styles.paymentSummaryVal, { color: Palette.emeraldDark }]}>- ₹ {advanceApplied.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Received Now:</Text>
                    <Text style={styles.paymentSummaryVal}>₹ {parsedReceived.toFixed(2)}</Text>
                  </View>
                  {balanceDue > 0 ? (
                    <View style={styles.paymentSummaryRow}>
                      <Text style={[styles.paymentSummaryLabel, { color: Palette.rose, fontWeight: '800' }]}>
                        {isWalkIn ? 'Shortfall (Unpaid):' : 'Balance Due (Credit):'}
                      </Text>
                      <Text style={[styles.paymentSummaryVal, { color: Palette.rose, fontWeight: '800' }]}>
                        ₹ {balanceDue.toFixed(2)}
                      </Text>
                    </View>
                  ) : excess > 0 ? (
                    <View style={styles.paymentSummaryRow}>
                      <Text style={[styles.paymentSummaryLabel, { color: Palette.emerald, fontWeight: '800' }]}>
                        Excess Amount:
                      </Text>
                      <Text style={[styles.paymentSummaryVal, { color: Palette.emerald, fontWeight: '800' }]}>
                        ₹ {excess.toFixed(2)}
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

                {/* Walk-in Due Blocked Warning */}
                {isWalkInShortfall && (
                  <View style={styles.walkInDueBlockedNotice}>
                    <Ionicons name="alert-circle" size={16} color={Palette.rose} />
                    <Text style={styles.walkInDueBlockedText}>
                      Walk-in customers must pay in full. Dues/credit are not allowed. Shortfall to collect: ₹{(netPayable - parsedReceived).toFixed(2)}.
                    </Text>
                  </View>
                )}

                {/* Excess Amount Handling Option */}
                {excess > 0 && !isWalkIn && (
                  <View style={styles.excessContainer}>
                    <Text style={styles.excessTitle}>Action for Excess ₹{excess.toFixed(2)}:</Text>
                    <View style={styles.excessRadioRow}>
                      <TouchableOpacity
                        style={[styles.excessBtn, !saveExcessAsAdvance && styles.excessBtnActive]}
                        onPress={() => onToggleSaveExcessAsAdvance?.(false)}
                      >
                        <Ionicons
                          name={!saveExcessAsAdvance ? 'radio-button-on' : 'radio-button-off'}
                          size={15}
                          color={!saveExcessAsAdvance ? Palette.bluePrimary : Palette.textSecondary}
                        />
                        <Text style={[styles.excessBtnText, !saveExcessAsAdvance && styles.excessBtnTextActive]}>
                          Return Change (₹{excess.toFixed(2)})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.excessBtn, saveExcessAsAdvance && styles.excessBtnActive]}
                        onPress={() => onToggleSaveExcessAsAdvance?.(true)}
                      >
                        <Ionicons
                          name={saveExcessAsAdvance ? 'radio-button-on' : 'radio-button-off'}
                          size={15}
                          color={saveExcessAsAdvance ? Palette.emerald : Palette.textSecondary}
                        />
                        <Text style={[styles.excessBtnText, saveExcessAsAdvance && styles.excessBtnTextActive]}>
                          Save as Advance Credit (+₹{excess.toFixed(2)})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {excess > 0 && isWalkIn && (
                  <View style={styles.walkInChangeNotice}>
                    <Ionicons name="cash-outline" size={16} color={Palette.emerald} />
                    <Text style={styles.walkInChangeNoticeText}>
                      Change to Return: <Text style={{ fontWeight: '800' }}>₹{excess.toFixed(2)}</Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* Customer Details */}
              <Text style={styles.sectionLabel}>Customer Details</Text>

              <View
                style={[
                  styles.customerPreviewBox,
                  !(isWalkIn || !customerName.trim()) && { marginBottom: 16 },
                ]}
              >
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

              {/* Show customer name field only if missing/empty */}
              {!customerName.trim() && (
                <View style={{ marginBottom: 10 }}>
                  <Input
                    placeholder="Customer Name *"
                    value={customerName}
                    onChangeText={onChangeCustomerName}
                    icon={<Ionicons name="person-outline" size={16} color={Palette.textMuted} />}
                    containerStyle={{ marginBottom: 4 }}
                  />
                  <Text style={styles.fieldErrorText}>* Customer name is required for bill</Text>
                </View>
              )}

              {/* For walk-in customer, show the mobile number field */}
              {isWalkIn && (
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
                    💡 Mobile number is optional for unknown walk-in customers
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Pinned Bottom Action */}
            <View style={styles.checkoutFooter}>
              <Button
                title={
                  isProcessingCheckout
                    ? 'Finalizing Bill & Tax Invoice...'
                    : isWalkInShortfall
                    ? `Pay in Full (Shortfall ₹${(netPayable - parsedReceived).toFixed(2)})`
                    : 'Generate Bill & Receipt'
                }
                variant="primary"
                size="lg"
                loading={isProcessingCheckout}
                disabled={!customerName.trim() || isDueMissingPhone || isWalkInShortfall || isProcessingCheckout}
                onPress={onConfirmCheckout}
              />
            </View>
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
  checkoutFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
    backgroundColor: '#FFFFFF',
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  checkoutAmountLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.emeraldDark,
  },
  advanceDeductedNote: {
    fontSize: 11,
    color: Palette.emeraldDark,
    marginTop: 2,
  },
  checkoutAmountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.emeraldDark,
  },
  existingDueNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.roseLight,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 10,
    gap: 6,
  },
  existingDueNoticeText: {
    fontSize: 12,
    color: Palette.rose,
    fontWeight: '600',
    flex: 1,
  },
  advanceCreditNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceLight,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 10,
  },
  advanceCreditTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.emeraldDark,
  },
  advanceCreditSubtitle: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  useAdvanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.emeraldLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  useAdvanceBtnActive: {
    backgroundColor: Palette.emerald,
    borderColor: Palette.emerald,
  },
  useAdvanceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.emeraldDark,
  },
  useAdvanceBtnTextActive: {
    color: '#FFFFFF',
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
    color: Palette.textPrimary,
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  paymentSummaryBox: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    gap: 4,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentSummaryLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  paymentSummaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  excessContainer: {
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  excessTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.emeraldDark,
    marginBottom: 6,
  },
  excessRadioRow: {
    gap: 6,
  },
  excessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  excessBtnActive: {
    borderColor: Palette.emerald,
    backgroundColor: Palette.emeraldLight,
  },
  excessBtnText: {
    fontSize: 11,
    color: Palette.textPrimary,
    fontWeight: '600',
  },
  excessBtnTextActive: {
    color: Palette.emeraldDark,
    fontWeight: '700',
  },
  customerPreviewBox: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    marginBottom: 10,
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
  fieldErrorText: {
    fontSize: 11,
    color: Palette.rose,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 6,
  },
  optionalHelperText: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  orderSummaryCard: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  orderSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 8,
  },
  orderSummaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderSummaryItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  orderSummaryItemMeta: {
    fontSize: 10,
    color: Palette.textMuted,
  },
  orderSummaryQtyPill: {
    backgroundColor: Palette.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  orderSummaryQtyText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  orderSummaryItemTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  walkInDueBlockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.roseLight,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginTop: 8,
    gap: 6,
  },
  walkInDueBlockedText: {
    fontSize: 12,
    color: Palette.rose,
    fontWeight: '600',
    flex: 1,
  },
  walkInChangeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
    gap: 6,
  },
  walkInChangeNoticeText: {
    fontSize: 12,
    color: Palette.emeraldDark,
    fontWeight: '600',
  },
});
