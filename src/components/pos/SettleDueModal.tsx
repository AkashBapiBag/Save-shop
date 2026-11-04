import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';
import { Customer, CustomerPaymentResponse } from '@/types/api';
import { customerApi } from '@/services/api';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { logError } from '@/utils/errorHandler';

export interface SettleDueModalProps {
  visible: boolean;
  customer: Customer | null;
  onClose: () => void;
  onPaymentSuccess: (payment: CustomerPaymentResponse) => void;
}

const SETTLEMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK'] as const;

export const SettleDueModal: React.FC<SettleDueModalProps> = ({
  visible,
  customer,
  onClose,
  onPaymentSuccess,
}) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(Math.round(screenWidth - 32), 440);
  const cardMaxHeight = Math.min(Math.round(screenHeight * 0.90), 650);

  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset or preset when opened
  React.useEffect(() => {
    if (visible && customer) {
      const due = parseFloat(String(customer.total_due || 0));
      setAmountStr(due > 0 ? due.toFixed(2) : '');
      setPaymentMethod('UPI');
      setIsSubmitting(false);
    }
  }, [visible, customer]);

  if (!customer) return null;

  const currentDue = parseFloat(String(customer.total_due || 0));
  const currentAdvance = parseFloat(String(customer.advance_balance || 0));
  const enteredAmount = parseFloat(amountStr) || 0;

  const handleQuickAmount = (val: number) => {
    setAmountStr(val.toFixed(2));
  };

  const handleConfirm = async () => {
    if (enteredAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payment = await customerApi.recordPayment(customer.customer_id, {
        amount: enteredAmount,
        payment_method: paymentMethod,
      });
      onPaymentSuccess(payment);
      onClose();
    } catch (err: unknown) {
      logError('SettleDueModal:recordPayment', err);
      Alert.alert('Payment Error', 'Could not record payment settlement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.keyboardContainer, { maxWidth: cardWidth }]}
        >
          <View style={[styles.card, { width: cardWidth, maxHeight: cardMaxHeight }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <UserAvatar
                  name={customer.name}
                  size={42}
                  fontSize={16}
                  backgroundColor={Palette.bluePrimary}
                />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    Settle Due
                  </Text>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    {customer.name} {customer.phone ? `• ${customer.phone}` : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close settle due modal"
              >
                <Ionicons name="close" size={22} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Due / Balance Banner */}
              <View style={styles.dueBanner}>
                <View>
                  <Text style={styles.dueBannerLabel}>Outstanding Due Balance</Text>
                  <Text style={styles.dueBannerValue}>₹ {currentDue.toFixed(2)}</Text>
                </View>
                {currentAdvance > 0 && (
                  <View style={styles.advanceBadge}>
                    <Text style={styles.advanceBadgeText}>
                      Advance: ₹{currentAdvance.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Amount Input */}
              <View style={styles.section}>
                <View style={styles.amountHeader}>
                  <Text style={styles.sectionLabel}>Amount to Receive (₹)</Text>
                  {currentDue > 0 && (
                    <TouchableOpacity
                      onPress={() => handleQuickAmount(currentDue)}
                      style={styles.fullDuePill}
                    >
                      <Text style={styles.fullDuePillText}>Full Due (₹{currentDue.toFixed(0)})</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Input
                  placeholder="0.00"
                  value={amountStr}
                  onChangeText={setAmountStr}
                  keyboardType="decimal-pad"
                  icon={<Text style={styles.currencyPrefix}>₹</Text>}
                />

                {/* Preset Chips */}
                <View style={styles.quickChipsRow}>
                  {[100, 200, 500, 1000].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.quickChip, enteredAmount === amt && styles.quickChipActive]}
                      onPress={() => handleQuickAmount(amt)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          enteredAmount === amt && styles.quickChipTextActive,
                        ]}
                      >
                        +₹{amt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dynamic Settlement Preview */}
              {enteredAmount > 0 && (
                <View style={styles.previewBox}>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Current Due:</Text>
                    <Text style={styles.previewVal}>₹ {currentDue.toFixed(2)}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Amount Received:</Text>
                    <Text style={styles.previewVal}>₹ {enteredAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.previewDivider} />
                  {enteredAmount < currentDue ? (
                    <View style={styles.previewRow}>
                      <Text style={[styles.previewLabel, { color: Palette.rose, fontWeight: '700' }]}>
                        Remaining Due:
                      </Text>
                      <Text style={[styles.previewVal, { color: Palette.rose, fontWeight: '800' }]}>
                        ₹ {(currentDue - enteredAmount).toFixed(2)}
                      </Text>
                    </View>
                  ) : enteredAmount === currentDue ? (
                    <View style={styles.previewRow}>
                      <Text style={[styles.previewLabel, { color: Palette.emerald, fontWeight: '700' }]}>
                        Status:
                      </Text>
                      <Text style={[styles.previewVal, { color: Palette.emerald, fontWeight: '800' }]}>
                        ✓ Clears All Dues Completely
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.previewRow}>
                      <Text style={[styles.previewLabel, { color: Palette.emerald, fontWeight: '700' }]}>
                        Excess to Advance Credit:
                      </Text>
                      <Text style={[styles.previewVal, { color: Palette.emerald, fontWeight: '800' }]}>
                        +₹ {(enteredAmount - currentDue).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Payment Method Selector */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Payment Method</Text>
                <View style={styles.methodsRow}>
                  {SETTLEMENT_METHODS.map((m) => {
                    const isSelected = paymentMethod === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.methodChip, isSelected && styles.methodChipActive]}
                        onPress={() => setPaymentMethod(m)}
                      >
                        <Text
                          style={[
                            styles.methodChipText,
                            isSelected && styles.methodChipTextActive,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </ScrollView>

            {/* Action Buttons Pinned at Bottom */}
            <View style={styles.buttonRow}>
              <Button
                title={isSubmitting ? 'Recording Settlement...' : 'Record Payment & Settle'}
                variant="primary"
                size="md"
                loading={isSubmitting}
                disabled={enteredAmount <= 0 || isSubmitting}
                onPress={handleConfirm}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 17, 32, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 440,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
    backgroundColor: '#FFFFFF',
  },
  scrollArea: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  dueBanner: {
    backgroundColor: Palette.roseLight,
    borderColor: '#FECDD3',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueBannerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.rose,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dueBannerValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Palette.rose,
    marginTop: 2,
  },
  advanceBadge: {
    backgroundColor: Palette.emeraldLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  advanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.emeraldDark,
  },
  section: {
    marginBottom: 14,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  fullDuePill: {
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  fullDuePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickChip: {
    flex: 1,
    backgroundColor: Palette.surfaceLight,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  quickChipActive: {
    backgroundColor: Palette.blueSoft,
    borderColor: Palette.bluePrimary,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  quickChipTextActive: {
    color: Palette.bluePrimary,
    fontWeight: '700',
  },
  previewBox: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  previewVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  previewDivider: {
    height: 1,
    backgroundColor: Palette.borderLight,
    marginVertical: 6,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    alignItems: 'center',
  },
  methodChipActive: {
    backgroundColor: Palette.bluePrimary,
    borderColor: Palette.bluePrimary,
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  methodChipTextActive: {
    color: '#FFFFFF',
  },
  buttonRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
});
