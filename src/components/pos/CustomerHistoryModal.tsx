import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Customer,
  CustomerHistoryResponse,
  CustomerPaymentResponse,
  CustomerTransactionHistoryItem,
} from '@/types/api';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { SettleDueModal } from '@/components/pos/SettleDueModal';
import { CustomerHistorySkeleton } from '@/components/ui/Skeleton';
import { logError } from '@/utils/errorHandler';

export interface CustomerHistoryModalProps {
  visible: boolean;
  customer: Customer | null;
  onClose: () => void;
  onViewReceipt: (transactionId: string) => void | Promise<void>;
  loadingReceiptId?: string | null;
  onCustomerUpdated?: () => void;
}

type TabType = 'bills' | 'payments';

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  visible,
  customer,
  onClose,
  onViewReceipt,
  loadingReceiptId,
  onCustomerUpdated,
}) => {
  const [history, setHistory] = useState<CustomerHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [localLoadingId, setLocalLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('bills');
  const [showSettleModal, setShowSettleModal] = useState<boolean>(false);

  const fetchHistory = useCallback(() => {
    if (!customer) return;
    setIsLoading(true);
    setHasError(false);
    customerApi
      .getCustomerHistory(customer.customer_id)
      .then((data) => {
        setHistory(data);
        setIsLoading(false);
      })
      .catch((err) => {
        logError('CustomerHistoryModal:fetch', err);
        setHasError(true);
        setIsLoading(false);
      });
  }, [customer?.customer_id]);

  useEffect(() => {
    if (visible && customer) {
      setActiveTab('bills');
      fetchHistory();
    } else {
      setHistory(null);
      setHasError(false);
      setShowSettleModal(false);
    }
  }, [visible, customer?.customer_id, fetchHistory]);

  if (!customer) return null;

  const totalSpentVal = parseFloat(String(history?.total_spent ?? customer.total_spent ?? 0));
  const totalOrdersVal = history?.total_orders ?? customer.total_orders ?? 0;
  const totalDueVal = parseFloat(String(history?.total_due ?? customer.total_due ?? 0));
  const advanceVal = parseFloat(String(history?.advance_balance ?? customer.advance_balance ?? 0));

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
    const balanceNum = parseFloat(String(item.balance_amount || 0));
    const receivedNum = parseFloat(String(item.received_amount || 0));
    const isItemLoading = localLoadingId === item.transaction_id || loadingReceiptId === item.transaction_id;
    const isPaid = item.payment_status === 'PAID';

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyCardTop}>
          <TouchableOpacity
            onPress={() => void handlePressReceipt(item.transaction_id)}
            activeOpacity={0.7}
            style={{ flex: 1 }}
            accessibilityLabel={`Invoice ${item.invoice_number}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="receipt-outline" size={15} color={Palette.bluePrimary} style={{ marginRight: 6 }} />
              <Text style={styles.invoiceNumText}>{item.invoice_number}</Text>
            </View>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </TouchableOpacity>
          <View style={styles.amountCol}>
            <Text style={styles.historyTotalAmount}>₹ {finalTotalNum.toFixed(2)}</Text>
            <View style={[styles.statusPill, isPaid ? styles.statusPillPaid : styles.statusPillPending]}>
              <Text style={[styles.statusPillText, isPaid ? styles.statusPillTextPaid : styles.statusPillTextPending]}>
                {isPaid ? 'PAID' : `DUE ₹${balanceNum.toFixed(0)}`}
              </Text>
            </View>
          </View>
        </View>

        {balanceNum > 0 && (
          <View style={styles.dueDetailBar}>
            <Text style={styles.dueDetailText}>
              Received: ₹{receivedNum.toFixed(2)} • <Text style={{ color: Palette.rose, fontWeight: '700' }}>Balance Due: ₹{balanceNum.toFixed(2)}</Text>
            </Text>
          </View>
        )}

        <View style={styles.historyCardDivider} />

        <View style={styles.historyCardBottom}>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="card-outline" size={12} color={Palette.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.metaText}>{item.payment_method}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Ionicons name="basket-outline" size={12} color={Palette.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.metaText}>{item.items_count} {item.items_count === 1 ? 'item' : 'items'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewInvoiceBtn}
            onPress={() => void handlePressReceipt(item.transaction_id)}
            disabled={isItemLoading}
            accessibilityRole="button"
            accessibilityLabel={`View bill for invoice ${item.invoice_number}`}
          >
            {isItemLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="document-text" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.viewInvoiceBtnText}>View Bill</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPaymentItem = ({ item }: { item: CustomerPaymentResponse }) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const amtNum = parseFloat(String(item.amount || 0));

    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentCardTop}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={16} color={Palette.emerald} style={{ marginRight: 6 }} />
              <Text style={styles.receiptNumText}>{item.payment_number}</Text>
            </View>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.paymentReceivedAmount}>+ ₹ {amtNum.toFixed(2)}</Text>
            <View style={styles.paymentMethodPill}>
              <Text style={styles.paymentMethodPillText}>{item.payment_method}</Text>
            </View>
          </View>
        </View>

        {item.notes ? (
          <View style={styles.paymentNotesBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={12} color={Palette.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.paymentNotesText} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        ) : null}
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

          {/* 3-Column Stats Banner */}
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
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>
                {totalDueVal > 0 ? 'Pending Due' : advanceVal > 0 ? 'Advance' : 'Due Balance'}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  totalDueVal > 0
                    ? { color: Palette.rose }
                    : advanceVal > 0
                    ? { color: Palette.emerald }
                    : { color: Palette.emerald },
                ]}
              >
                ₹ {totalDueVal > 0 ? totalDueVal.toFixed(2) : advanceVal > 0 ? advanceVal.toFixed(2) : '0.00'}
              </Text>
            </View>
          </View>

          {/* Quick Settle Due Banner if Customer has dues */}
          {totalDueVal > 0 && (
            <View style={styles.settleBannerRow}>
              <View style={styles.settleBannerLeft}>
                <Ionicons name="alert-circle" size={16} color={Palette.rose} />
                <Text style={styles.settleBannerText}>
                  ₹{totalDueVal.toFixed(2)} due to be paid
                </Text>
              </View>
              <TouchableOpacity
                style={styles.settleDueBtn}
                onPress={() => setShowSettleModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="card" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.settleDueBtnText}>Settle Due</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Segmented Tab Bar: Bills vs Payments */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'bills' && styles.tabItemActive]}
              onPress={() => setActiveTab('bills')}
            >
              <Ionicons
                name="receipt-outline"
                size={14}
                color={activeTab === 'bills' ? Palette.bluePrimary : Palette.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, activeTab === 'bills' && styles.tabTextActive]}>
                Bills ({history?.transactions.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'payments' && styles.tabItemActive]}
              onPress={() => setActiveTab('payments')}
            >
              <Ionicons
                name="cash-outline"
                size={14}
                color={activeTab === 'payments' ? Palette.bluePrimary : Palette.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
                Settlements ({history?.payments?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Section */}
          <View style={styles.listSection}>
            {isLoading ? (
              <CustomerHistorySkeleton count={4} />
            ) : hasError ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={40} color={Palette.textMuted} />
                <Text style={styles.emptyTitle}>Could Not Load History</Text>
                <Text style={styles.emptySubtitle}>Unable to retrieve records. Please try again.</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={fetchHistory}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : activeTab === 'bills' ? (
              !history || history.transactions.length === 0 ? (
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
                  contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
                  style={{ flex: 1, width: '100%' }}
                  showsVerticalScrollIndicator={true}
                />
              )
            ) : (
              !history?.payments || history.payments.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="cash-outline" size={40} color={Palette.textMuted} />
                  <Text style={styles.emptyTitle}>No Settlement Payments</Text>
                  <Text style={styles.emptySubtitle}>No dues clearance or advance payments have been recorded yet.</Text>
                </View>
              ) : (
                <FlatList
                  data={history.payments}
                  keyExtractor={(it) => it.payment_id}
                  renderItem={renderPaymentItem}
                  contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
                  style={{ flex: 1, width: '100%' }}
                  showsVerticalScrollIndicator={true}
                />
              )
            )}
          </View>
        </View>
      </View>

      {/* Settle Due Dialog */}
      <SettleDueModal
        visible={showSettleModal}
        customer={customer}
        onClose={() => setShowSettleModal(false)}
        onPaymentSuccess={() => {
          fetchHistory();
          onCustomerUpdated?.();
        }}
      />
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
    maxWidth: 520,
    height: '84%',
    minHeight: 480,
    maxHeight: 720,
    backgroundColor: Palette.surfaceCard,
    borderRadius: 20,
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
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: Palette.borderLight,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginTop: 2,
  },
  settleBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.roseLight,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  settleBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settleBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.rose,
    marginLeft: 6,
  },
  settleDueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.rose,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  settleDueBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: Palette.surfaceLight,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  tabTextActive: {
    color: Palette.bluePrimary,
    fontWeight: '700',
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    minHeight: 220,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontWeight: '800',
    color: Palette.bluePrimary,
  },
  dateText: {
    fontSize: 11,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  statusPillPaid: {
    backgroundColor: Palette.emeraldLight,
  },
  statusPillPending: {
    backgroundColor: Palette.roseLight,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextPaid: {
    color: Palette.emerald,
  },
  statusPillTextPending: {
    color: Palette.rose,
  },
  dueDetailBar: {
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    backgroundColor: '#FFF1F2',
    borderRadius: 6,
  },
  dueDetailText: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  historyCardDivider: {
    height: 1,
    backgroundColor: Palette.borderLight,
    marginVertical: 10,
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  viewInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewInvoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  paymentCard: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  paymentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receiptNumText: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.emeraldDark,
  },
  paymentReceivedAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.emeraldDark,
  },
  paymentMethodPill: {
    backgroundColor: Palette.emeraldLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  paymentMethodPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.emeraldDark,
  },
  paymentNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
  },
  paymentNotesText: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
});
