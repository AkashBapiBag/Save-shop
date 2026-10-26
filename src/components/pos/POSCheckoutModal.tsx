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
import { PaymentMethod } from '@/types/api';
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
  onClose,
  onSelectPaymentMethod,
  onChangeReceivedAmount,
  onChangeCustomerName,
  onChangeCustomerPhone,
  onConfirmCheckout,
}) => {
  const parsedReceived = parseFloat(receivedAmount) || 0;
  const isCredit = paymentMethod === 'CREDIT';

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

              {/* Customer Details - Strictly Required */}
              <Text style={styles.sectionLabel}>
                Customer Details <Text style={{ color: Palette.rose }}>*</Text>
              </Text>

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
                  placeholder="Contact Mobile Number *"
                  value={customerPhone}
                  onChangeText={onChangeCustomerPhone}
                  keyboardType="phone-pad"
                  icon={<Ionicons name="call-outline" size={16} color={Palette.textMuted} />}
                  containerStyle={{ marginBottom: 4 }}
                />
                {!customerPhone.trim() && (
                  <Text style={styles.fieldErrorText}>* Mobile number is required</Text>
                )}
              </View>

              {/* Confirm Checkout Action */}
              <Button
                title={isProcessingCheckout ? 'Finalizing Bill & Tax Invoice...' : 'Generate Bill & Receipt'}
                variant="primary"
                size="lg"
                loading={isProcessingCheckout}
                disabled={!customerName.trim() || !customerPhone.trim() || isProcessingCheckout}
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
});
