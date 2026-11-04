import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { customerApi } from '@/services/api';
import { Customer, CustomerCreateRequest } from '@/types/api';
import { showErrorAlert } from '@/utils/errorHandler';

export interface CreateCustomerModalProps {
  visible: boolean;
  initialQuery?: string;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  visible,
  initialQuery = '',
  onClose,
  onCustomerCreated,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize from initialQuery if provided
  useEffect(() => {
    if (visible) {
      const trimmed = initialQuery.trim();
      const isDigitsOnly = /^\d+$/.test(trimmed);
      if (isDigitsOnly) {
        setName('');
        setPhone(trimmed);
      } else {
        setName(trimmed);
        setPhone('');
      }
    }
  }, [visible, initialQuery]);

  const handleSubmit = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Required Field', 'Please enter customer name.');
      return;
    }

    const cleanPhone = phone.trim() ? phone.trim().replace(/\D/g, '') : null;
    if (cleanPhone && cleanPhone.length < 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number, or leave it blank.');
      return;
    }

    setIsSubmitting(true);
    const payload: CustomerCreateRequest = {
      name: cleanName,
      phone: cleanPhone,
    };

    try {
      // Immediately persists the customer in the database or retrieves existing customer
      const customer = await customerApi.createCustomer(payload);
      onCustomerCreated(customer);
      onClose();
    } catch (err: unknown) {
      showErrorAlert(err, 'Failed to Add Customer', 'Could not save customer information. Please check your connection.');
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
          style={styles.keyboardContainer}
        >
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="person-add-outline" size={20} color={Palette.bluePrimary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.title}>New Customer</Text>
                <Text style={styles.subtitle}>Save to store phone book</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close add customer modal"
              >
                <Ionicons name="close" size={22} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Form Fields: Name (Required) & Mobile (Optional) */}
            <View style={styles.formContent}>
              {/* Customer Name - Required */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Customer Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <Input
                  placeholder="Enter full name"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  icon={<Ionicons name="person-outline" size={16} color={Palette.textMuted} />}
                />
              </View>

              {/* Mobile Number - Optional */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelWithBadge}>
                  <Text style={styles.fieldLabel}>Mobile Number</Text>
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalBadgeText}>Optional</Text>
                  </View>
                </View>
                <Input
                  placeholder="e.g. 9876543210 (Optional)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={15}
                  icon={<Ionicons name="call-outline" size={16} color={Palette.textMuted} />}
                />
              </View>

              {/* Notice */}
              <View style={styles.infoNotice}>
                <Ionicons name="shield-checkmark-outline" size={14} color={Palette.emerald} style={{ marginRight: 6 }} />
                <Text style={styles.infoNoticeText}>
                  Customer is stored immediately in your phone book upon saving, even if billing is cancelled.
                </Text>
              </View>

              {/* Single Save & Start Billing Action */}
              <Button
                title={isSubmitting ? 'Saving Customer...' : 'Save & Start Billing'}
                variant="primary"
                size="lg"
                onPress={handleSubmit}
                disabled={isSubmitting || !name.trim()}
                style={styles.submitBtn}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 6,
  },
  requiredStar: {
    color: Palette.rose,
    fontWeight: '800',
  },
  optionalBadge: {
    backgroundColor: Palette.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  optionalBadgeText: {
    fontSize: 11,
    color: Palette.textMuted,
    fontWeight: '600',
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.emeraldLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoNoticeText: {
    fontSize: 11,
    color: Palette.emerald,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  submitBtn: {
    width: '100%',
  },
});
