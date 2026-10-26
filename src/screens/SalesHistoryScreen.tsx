import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { TransactionResponse, ReceiptResponse } from '@/types/api';
import { billingApi } from '@/services/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Badge } from '@/components/ui/Badge';
import { TaxInvoiceModal } from '@/components/TaxInvoiceModal';
import { OfflineScreen } from '@/components/ui/OfflineScreen';
import { useNetworkStatus } from '@/context/NetworkContext';
import { logError } from '@/utils/errorHandler';

type DateFilterKey = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month';

const DATE_FILTERS: { key: DateFilterKey; label: string }[] = [
  { key: 'all', label: 'All Sales' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
];

export const SalesHistoryScreen: React.FC = () => {
  const { activeStore } = useAuth();
  const { isOffline } = useNetworkStatus();

  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterKey>('all');

  // Selected Transaction Receipt for TaxInvoiceModal
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptResponse | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const activeStoreId = activeStore?.store_id;

  const fetchSales = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await billingApi.listTransactions({
        search: searchQuery.trim() || undefined,
        date_filter: selectedDateFilter !== 'all' ? selectedDateFilter : undefined,
        limit: 100,
      });
      setTransactions(data);
    } catch (err) {
      logError('SalesHistoryScreen:fetchSales', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedDateFilter]);

  useEffect(() => {
    let isMounted = true;
    billingApi
      .listTransactions({
        search: searchQuery.trim() || undefined,
        date_filter: selectedDateFilter !== 'all' ? selectedDateFilter : undefined,
        limit: 100,
      })
      .then((data) => {
        if (isMounted) {
          setTransactions(data);
          setIsLoading(false);
          setIsRefreshing(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          logError('SalesHistoryScreen:useEffect', err);
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedDateFilter, activeStoreId]);

  const onRefresh = () => {
    void fetchSales();
  };

  const handleOpenReceipt = async (tx: TransactionResponse) => {
    setLoadingReceiptId(tx.transaction_id);
    try {
      const receipt = await billingApi.getReceipt(tx.transaction_id);
      setSelectedReceipt(receipt);
      setModalVisible(true);
    } catch (e: any) {
      console.warn('Failed fetching receipt, fallback to tx data:', e);
      // Construct fallback receipt from transaction
      const fallback: ReceiptResponse = {
        store: {
          store_id: activeStore?.store_id || '',
          store_name: activeStore?.name || 'MY SAVE SHOP',
          owner_name: activeStore?.owner_name,
          phone_number: activeStore?.phone_number,
          address: activeStore?.address,
          email: activeStore?.email,
          state: activeStore?.state || '19-West Bengal',
          has_logo: !!activeStore?.logo_base64,
          logo_base64: activeStore?.logo_base64,
          has_signature: !!activeStore?.authorized_signature_base64,
          authorized_signature_base64: activeStore?.authorized_signature_base64,
        },
        invoice_number: tx.invoice_number,
        invoice_seq: tx.invoice_seq,
        transaction_id: tx.transaction_id,
        date: tx.created_at,
        customer_name: tx.customer_name || 'Walk-in Customer',
        customer_phone: tx.customer_phone || undefined,
        items: tx.items,
        subtotal: tx.subtotal,
        item_discount_amount: tx.item_discount_amount,
        category_discount_amount: tx.category_discount_amount,
        total_discount_percentage: tx.total_discount_percentage,
        total_discount_amount: tx.total_discount_amount,
        total_cashback_amount: tx.total_cashback_amount,
        tax_amount: tx.tax_amount,
        final_total: tx.final_total,
        received_amount: tx.received_amount,
        balance_amount: tx.balance_amount,
        amount_in_words: tx.amount_in_words,
        you_saved_amount: tx.you_saved_amount,
        payment_method: tx.payment_method,
        payment_status: tx.payment_status,
      };
      setSelectedReceipt(fallback);
      setModalVisible(true);
    } finally {
      setLoadingReceiptId(null);
    }
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalDiscounts = 0;
    let totalCashback = 0;

    transactions.forEach((tx) => {
      totalRevenue += Number(tx.final_total || 0);
      totalDiscounts += Number(tx.total_discount_amount || 0);
      totalCashback += Number(tx.total_cashback_amount || 0);
    });

    return {
      totalOrders: transactions.length,
      totalRevenue,
      totalDiscounts,
      totalCashback,
    };
  }, [transactions]);

  const renderTransactionCard = ({ item }: { item: TransactionResponse }) => {
    const d = new Date(item.created_at);
    const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const discAmt = Number(item.total_discount_amount || 0);
    const cbAmt = Number(item.total_cashback_amount || 0);
    const isThisLoading = loadingReceiptId === item.transaction_id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handleOpenReceipt(item)}
      >
        {/* Top Row: Invoice # and Date */}
        <View style={styles.cardTopRow}>
          <View style={styles.invoiceBadge}>
            <Ionicons name="receipt-outline" size={14} color={Palette.bluePrimary} />
            <Text style={styles.invoiceNumberText} numberOfLines={1}>{item.invoice_number}</Text>
          </View>
          <Text style={styles.dateText}>{dateFormatted}</Text>
        </View>

        {/* Middle Row: Customer Details */}
        <View style={styles.customerRow}>
          <View style={styles.customerAvatarCircle}>
            <Ionicons name="person-outline" size={14} color={Palette.bluePrimary} />
          </View>
          <View style={styles.customerInfoContainer}>
            <Text style={styles.customerNameText} numberOfLines={1}>
              {item.customer_name || 'Walk-in Customer'}
            </Text>
            {item.customer_phone ? (
              <Text style={styles.customerPhoneText} numberOfLines={1}>{item.customer_phone}</Text>
            ) : null}
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Bill</Text>
            <Text style={styles.amountValue}>₹ {Number(item.final_total).toFixed(2)}</Text>
          </View>
        </View>

        {/* Bottom Row: Item count, Payment method, and Badges */}
        <View style={styles.cardBottomRow}>
          <View style={styles.bottomLeftTags}>
            <Badge label={`${item.items.length} ${item.items.length === 1 ? 'item' : 'items'}`} variant="neutral" />
            <View style={{ width: 6 }} />
            <Badge label={item.payment_method} variant="primary" />

            {discAmt > 0 && (
              <>
                <View style={{ width: 6 }} />
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>-₹{discAmt.toFixed(0)} Off</Text>
                </View>
              </>
            )}

            {cbAmt > 0 && (
              <>
                <View style={{ width: 6 }} />
                <View style={styles.cashbackPill}>
                  <Text style={styles.cashbackPillText}>₹{cbAmt.toFixed(0)} CB</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.viewBillAction}>
            {isThisLoading ? (
              <ActivityIndicator size="small" color={Palette.bluePrimary} />
            ) : (
              <>
                <Text style={styles.viewBillText}>View Bill</Text>
                <Ionicons name="chevron-forward" size={14} color={Palette.bluePrimary} />
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color={Palette.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoice #, customer name, phone..."
            placeholderTextColor={Palette.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date Filter Pills */}
      <View style={styles.filterPillsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={DATE_FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterPillsContainer}
          renderItem={({ item }) => {
            const isSelected = selectedDateFilter === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                onPress={() => setSelectedDateFilter(item.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* KPI Metric Summary Strip */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Total Sales</Text>
          <Text style={styles.metricValue}>₹ {metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Orders</Text>
          <Text style={styles.metricValue}>{metrics.totalOrders}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Total Discount</Text>
          <Text style={[styles.metricValue, { color: Palette.rose }]}>
            ₹ {metrics.totalDiscounts.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Cashback</Text>
          <Text style={[styles.metricValue, { color: Palette.bluePrimary }]}>
            ₹ {metrics.totalCashback.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {/* Sales List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Palette.bluePrimary} />
          <Text style={styles.loadingText}>Loading sales records...</Text>
        </View>
      ) : isOffline && transactions.length === 0 ? (
        <View style={styles.centerContainer}>
          <OfflineScreen
            compact
            title="Sales History Offline"
            message="Past sales transactions cannot be fetched while offline. Connect to internet and tap retry."
            onRetry={fetchSales}
          />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={48} color={Palette.textMuted} />
          <Text style={styles.emptyTitle}>No Sales Found</Text>
          <Text style={styles.emptySub}>
            {searchQuery
              ? `No transactions match "${searchQuery}" in this period.`
              : 'Completed transactions will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.transaction_id}
          renderItem={renderTransactionCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Palette.bluePrimary]}
              tintColor={Palette.bluePrimary}
            />
          }
        />
      )}

      {/* Tax Invoice Modal for Viewed Transaction */}
      <TaxInvoiceModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        receipt={selectedReceipt}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.surfaceLight,
  },
  searchBarWrapper: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    fontSize: 13,
    color: Palette.textPrimary,
    paddingVertical: 0,
  },
  filterPillsRow: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  filterPillsContainer: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  filterPillSelected: {
    backgroundColor: Palette.blueSoft,
    borderColor: Palette.bluePrimary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterPillTextSelected: {
    color: Palette.bluePrimary,
    fontWeight: '700',
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: Palette.borderLight,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceLight,
  },
  invoiceBadge: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invoiceNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  dateText: {
    fontSize: 11,
    color: Palette.textMuted,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  customerInfoContainer: {
    flex: 1,
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  customerPhoneText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    color: Palette.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.surfaceLight,
  },
  bottomLeftTags: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  discountPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  discountPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.rose,
  },
  cashbackPill: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cashbackPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  viewBillAction: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewBillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Palette.textSecondary,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
