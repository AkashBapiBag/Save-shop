import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Customer } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { UserAvatar } from '@/components/ui/UserAvatar';

export interface POSActiveCustomerBannerProps {
  customer: Customer;
  onChangeCustomer: () => void;
  onViewHistory: () => void;
}

export const POSActiveCustomerBanner: React.FC<POSActiveCustomerBannerProps> = ({
  customer,
  onChangeCustomer,
  onViewHistory,
}) => {
  const isGuest = customer.customer_id === 'guest';
  const totalSpentNum = parseFloat(String(customer.total_spent || 0));
  const dueAmount = parseFloat(String(customer.total_due || 0));
  const advanceAmount = parseFloat(String(customer.advance_balance || 0));

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerCard}>
        {/* Customer Avatar & Details */}
        <View style={styles.customerInfo}>
          <UserAvatar
            name={customer.name}
            size={40}
            fontSize={15}
            backgroundColor={isGuest ? Palette.navyPrimary : Palette.bluePrimary}
            borderColor="#FFFFFF"
            borderWidth={1.5}
          />
          <View style={styles.namePhoneGroup}>
            <View style={styles.nameRow}>
              <Text style={styles.billingForLabel}>Billing For:</Text>
              <Text style={styles.customerName} numberOfLines={1}>
                {customer.name}
              </Text>
              {isGuest && (
                <View style={styles.guestBadge}>
                  <Text style={styles.guestBadgeText}>Walk-in</Text>
                </View>
              )}
              {dueAmount > 0 && (
                <View style={styles.dueBadge}>
                  <Text style={styles.dueBadgeText}>₹{dueAmount.toFixed(0)} Due</Text>
                </View>
              )}
              {advanceAmount > 0 && dueAmount <= 0 && (
                <View style={styles.advanceBadge}>
                  <Text style={styles.advanceBadgeText}>₹{advanceAmount.toFixed(0)} Adv</Text>
                </View>
              )}
            </View>
            <View style={styles.subRow}>
              <Text style={styles.phoneText}>
                {customer.phone ? `📞 ${customer.phone}` : (isGuest ? 'Unknown Customer • Mobile Optional' : 'No phone registered')}
              </Text>
              {!isGuest && customer.total_orders > 0 ? (
                <>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.historyHighlight}>
                    {customer.total_orders} {customer.total_orders === 1 ? 'order' : 'orders'} (₹{totalSpentNum.toFixed(0)})
                  </Text>
                </>
              ) : !isGuest ? (
                <>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.newCustomerHighlight}>New Customer</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* Action Controls: History & Switch Customer */}
        <View style={styles.actionsGroup}>
          {!isGuest && customer.total_orders > 0 && (
            <TouchableOpacity
              style={styles.historyIconBtn}
              onPress={onViewHistory}
              accessibilityLabel="View customer purchase history"
            >
              <Ionicons name="receipt-outline" size={16} color={Palette.bluePrimary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={onChangeCustomer}
            accessibilityLabel="Switch customer"
          >
            <Ionicons name="swap-horizontal" size={14} color={Palette.bluePrimary} style={{ marginRight: 3 }} />
            <Text style={styles.switchBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceCard,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#DBEAFE', // Soft blue border
    ...Shadows.sm,
  },
  customerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  namePhoneGroup: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billingForLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginRight: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.textPrimary,
    flexShrink: 1,
  },
  guestBadge: {
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  guestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  dueBadge: {
    backgroundColor: Palette.roseLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.rose,
  },
  advanceBadge: {
    backgroundColor: Palette.emeraldLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  advanceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.emeraldDark,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  phoneText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  bullet: {
    marginHorizontal: 5,
    color: Palette.textMuted,
    fontSize: 10,
  },
  historyHighlight: {
    fontSize: 12,
    color: Palette.emerald,
    fontWeight: '700',
  },
  newCustomerHighlight: {
    fontSize: 12,
    color: Palette.bluePrimary,
    fontWeight: '600',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
});
