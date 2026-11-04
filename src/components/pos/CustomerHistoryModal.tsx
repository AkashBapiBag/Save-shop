import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';
import { customerApi } from '@/services/api';
import { Customer, CustomerHistoryResponse, CustomerTransactionHistoryItem } from '@/types/api';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { logError } from '@/utils/errorHandler';

export interface CustomerHistoryModalProps {
  visible: boolean;
  customer: Customer | null;
  onClose: () => void;
  onViewReceipt: (transactionId: string) => void | Promise<void>;
  loadingReceiptId?: string | null;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  visible,
  customer,
  onClose,
  onViewReceipt,
  loadingReceiptId,
}) => {
  const [history, setHistory] = useState<CustomerHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [localLoadingId, setLocalLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (visible && customer) {
      setIsLoading(true);
      customerApi
        .getCustomerHistory(customer.customer_id)
        .then((data) => {
          if (isMounted) {
            setHistory(data);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            logError('CustomerHistoryModal:fetch', err);
            setIsLoading(false);
          }
        });
    } else {
      setHistory(null);
    }

    return () => {
      isMounted = false;
    };
  }, [visible, customer]);

  if (!customer) return null;

  const totalSpentVal = parseFloat(String(history?.total_spent ?? customer.total_spent ?? 0));
  const totalOrdersVal = history?.total_orders ?? customer.total_orders ?? 0;

  const handlePressReceipt = async (transactionId: string) => {
    setLocalLoadingId(transactionId);
    try {
      await onViewReceipt(transactionId);
    } finally {
      setLocalLoadingId(null);
    }
  };

  const renderHistoryItem = ({ item }: { item: CustomerTransactionHistoryItem }) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const finalTotalNum = parseFloat(String(item.final_total || 0));
    const isItemLoading = localLoadingId === item.transaction_id || loadingReceiptId === item.transaction_id;

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyCardTop}>
          <TouchableOpacity
            onPress={() => void handlePressReceipt(item.transaction_id)}
            activeOpacity={0.7}
          >
            <Text style={styles.invoiceNumText}>{item.invoice_number}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </TouchableOpacity>
          <View style={styles.amountCol}>
            <Text style={styles.historyTotalAmount}>₹ {finalTotalNum.toFixed(2)}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{item.payment_status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.historyCardDivider} />

        <View style={styles.historyCardBottom}>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="card-outline" size={12} color={Palette.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.metaText}>{item.payment_method}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Ionicons name="basket-outline" size={12} color={Palette.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.metaText}>{item.items_count} items</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewInvoiceBtn}
            onPress={() => void handlePressReceipt(item.transaction_id)}
            disabled={isItemLoading}
            accessibilityRole="button"
            accessibilityLabel={`Generate PDF for invoice ${item.invoice_number}`}
          >
            {isItemLoading ? (
              <ActivityIndicator size="small" color={Palette.bluePrimary} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={14} color={Palette.bluePrimary} style={{ marginRight: 4 }} />
                <Text style={styles.viewInvoiceBtnText}>Invoice PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.containerCard}>
          {/* Header */}
          <View style={styles.header}>
            <UserAvatar
              name={customer.name}
              size={44}
              fontSize={18}
              backgroundColor={Palette.bluePrimary}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.customerName} numberOfLines={1}>{customer.name}</Text>
              <Text style={styles.customerPhone}>{customer.phone || 'No phone registered'}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close customer history"
            >
              <Ionicons name="close" size={22} color={Palette.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Stats Banner */}
          <View style={styles.statsBanner}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Total Spend</Text>
              <Text style={styles.statValue}>₹ {totalSpentVal.toFixed(2)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Total Bills</Text>
              <Text style={styles.statValue}>{totalOrdersVal}</Text>
            </View>
          </View>

          {/* Past Transactions List */}
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>
              Bills Purchased ({history?.transactions.length || 0})
            </Text>
            {isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color={Palette.bluePrimary} />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : !history || history.transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={40} color={Palette.textMuted} />
                <Text style={styles.emptyTitle}>No Previous Bills</Text>
                <Text style={styles.emptySubtitle}>This customer does not have any recorded transactions yet.</Text>
              </View>
            ) : (
              <FlatList
                data={history.transactions}
                keyExtractor={(it) => it.transaction_id}
                renderItem={renderHistoryItem}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
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
  containerCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: Palette.surfaceCard,
    borderRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  customerPhone: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceMuted,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Palette.borderLight,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginTop: 2,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 10,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: Palette.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  historyCard: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  historyTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  statusPill: {
    backgroundColor: Palette.emeraldLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.emerald,
  },
  historyCardDivider: {
    height: 1,
    backgroundColor: Palette.borderLight,
    marginVertical: 8,
  },
  historyCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  viewInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewInvoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
});
