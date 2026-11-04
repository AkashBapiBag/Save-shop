import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Customer } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { UserAvatar } from '@/components/ui/UserAvatar';

export interface POSCustomerCardProps {
  customer: Customer;
  isSelected?: boolean;
  onSelect: (customer: Customer) => void;
  onViewHistory: (customer: Customer) => void;
}

const AVATAR_COLORS = [
  '#2563EB', // Blue
  '#059669', // Emerald
  '#7C3AED', // Purple
  '#D97706', // Amber
  '#0284C7', // Sky
  '#DB2777', // Pink
  '#4F46E5', // Indigo
  '#0D9488', // Teal
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export const POSCustomerCard: React.FC<POSCustomerCardProps> = ({
  customer,
  isSelected = false,
  onSelect,
  onViewHistory,
}) => {
  const avatarBg = getAvatarColor(customer.name);
  const totalSpentNum = parseFloat(String(customer.total_spent || 0));

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      activeOpacity={0.7}
      onPress={() => onSelect(customer)}
      accessibilityRole="button"
      accessibilityLabel={`Select customer ${customer.name}`}
    >
      <View style={styles.cardMain}>
        {/* Avatar */}
        <UserAvatar
          name={customer.name}
          size={46}
          fontSize={18}
          backgroundColor={avatarBg}
          borderColor="#FFFFFF"
          borderWidth={2}
        />

        {/* Customer Information */}
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.customerName} numberOfLines={1}>
              {customer.name}
            </Text>
            {customer.total_orders === 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            )}
          </View>

          {/* Phone Badge / Tag */}
          <View style={styles.phoneRow}>
            <Ionicons
              name={customer.phone ? 'call-outline' : 'person-outline'}
              size={13}
              color={customer.phone ? Palette.bluePrimary : Palette.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.phoneText,
                !customer.phone && styles.phoneTextMuted,
              ]}
              numberOfLines={1}
            >
              {customer.phone || 'No phone number'}
            </Text>
          </View>

          {/* Quick Metrics */}
          {customer.total_orders > 0 ? (
            <View style={styles.metricsRow}>
              <Text style={styles.metricsText}>
                <Text style={styles.metricsHighlight}>₹{totalSpentNum.toFixed(0)}</Text> spent
                {' • '}
                <Text style={styles.metricsHighlight}>{customer.total_orders}</Text> {customer.total_orders === 1 ? 'order' : 'orders'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action Controls */}
        <View style={styles.actionsCol}>
          {/* View Purchase History / Bills Button */}
          {customer.total_orders > 0 && (
            <TouchableOpacity
              style={styles.viewBillsBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                onViewHistory(customer);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`View bills for ${customer.name}`}
            >
              <Ionicons name="receipt-outline" size={14} color={Palette.bluePrimary} style={{ marginRight: 5 }} />
              <Text style={styles.viewBillsBtnText}>View Bill</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surfaceCard,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },
  cardSelected: {
    borderColor: Palette.bluePrimary,
    backgroundColor: Palette.blueSoft,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
    flexShrink: 1,
  },
  newBadge: {
    backgroundColor: Palette.emeraldLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.emerald,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  phoneText: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  phoneTextMuted: {
    color: Palette.textMuted,
    fontStyle: 'italic',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metricsText: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  metricsHighlight: {
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 6,
  },
  viewBillsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewBillsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  historyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 2,
  },
  selectPillActive: {
    backgroundColor: Palette.bluePrimary,
  },
  selectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  selectPillTextActive: {
    color: '#FFFFFF',
  },
});
