import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Customer } from '@/types/api';
import { customerApi } from '@/services/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { POSCustomerCard } from '@/components/pos/POSCustomerCard';
import { useAuth } from '@/context/AuthContext';
import { logError } from '@/utils/errorHandler';

export interface POSCustomerSelectViewProps {
  onSelectCustomer: (customer: Customer) => void;
  onViewCustomerHistory: (customer: Customer) => void;
  onNavigateToSales?: () => void;
}

type SortCriteria = 'recent' | 'name' | 'spent' | 'orders';

export const POSCustomerSelectView: React.FC<POSCustomerSelectViewProps> = ({
  onSelectCustomer,
  onViewCustomerHistory,
  onNavigateToSales,
}) => {
  const { activeStore } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortCriteria>('recent');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadCustomers = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await customerApi.listCustomers({
        search: searchQuery.trim() || undefined,
        sort_by: sortBy,
      });
      setCustomers(data);
    } catch (err: unknown) {
      logError('POSCustomerSelectView:loadCustomers', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, sortBy]);

  // Load immediately on mount / sort change / store change, or debounced when typing search query
  useEffect(() => {
    const delay = searchQuery ? 200 : 0;
    const handler = setTimeout(() => {
      void loadCustomers(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [activeStore?.store_id, searchQuery, sortBy, loadCustomers]);

  const handleSelectWalkIn = () => {
    const walkInCustomer: Customer = {
      customer_id: 'guest',
      store_id: activeStore?.store_id || '',
      name: 'Walk-in Customer',
      phone: null,
      email: null,
      address: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_orders: 0,
      total_spent: 0,
      last_order_date: null,
    };
    onSelectCustomer(walkInCustomer);
  };

  const sortChips: { key: SortCriteria; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'recent', label: 'Recent', icon: 'time-outline' },
    { key: 'name', label: 'A-Z', icon: 'text-outline' },
    { key: 'spent', label: 'Top Spent', icon: 'cash-outline' },
    { key: 'orders', label: 'Most Orders', icon: 'ribbon-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="people-outline" size={18} color={Palette.bluePrimary} />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={styles.screenHeaderTitle}>Billing Directory</Text>
            <Text style={styles.screenHeaderSub} numberOfLines={1}>
              {activeStore?.name || 'My Save Shop'} • Step 1: Choose Customer
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {onNavigateToSales && (
            <TouchableOpacity
              style={styles.salesHistoryButton}
              onPress={onNavigateToSales}
              activeOpacity={0.7}
              accessibilityLabel="Go to sales history"
            >
              <Ionicons name="time-outline" size={15} color={Palette.bluePrimary} style={{ marginRight: 4 }} />
              <Text style={styles.salesHistoryButtonText}>Sales</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modern Search Bar */}
      <View style={styles.searchBarSection}>
        <View style={styles.searchInputBox}>
          <Ionicons name="search" size={18} color={Palette.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search phone book by name or mobile number..."
            placeholderTextColor={Palette.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchTextInput}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Quick Sort Action Row */}
      <View style={styles.optionsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={sortChips}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.sortChipsContainer}
          renderItem={({ item }) => {
            const isSelected = sortBy === item.key;
            return (
              <TouchableOpacity
                style={[styles.sortChip, isSelected && styles.sortChipActive]}
                onPress={() => setSortBy(item.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={12}
                  color={isSelected ? Palette.bluePrimary : Palette.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.sortChipText, isSelected && styles.sortChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Customer List / States */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.bluePrimary} />
          <Text style={styles.loadingLabel}>Loading Customer Phone Book...</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.customer_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadCustomers(true)}
              colors={[Palette.bluePrimary]}
              tintColor={Palette.bluePrimary}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeaderWrapper}>
              {/* Always on top: Walk-in Customer Card */}
              <TouchableOpacity
                style={styles.walkInCard}
                activeOpacity={0.7}
                onPress={handleSelectWalkIn}
                accessibilityRole="button"
                accessibilityLabel="Select walk-in customer for billing"
              >
                <View style={styles.walkInLeft}>
                  <View style={styles.walkInAvatarCircle}>
                    <Ionicons name="walk" size={22} color={Palette.bluePrimary} />
                  </View>
                  <View style={styles.walkInInfoCol}>
                    <View style={styles.walkInTitleRow}>
                      <Text style={styles.walkInTitle}>Walk-in Customer</Text>
                      <View style={styles.walkInBadge}>
                        <Text style={styles.walkInBadgeText}>Quick Bill</Text>
                      </View>
                    </View>
                    <View style={styles.walkInSubRow}>
                      <Ionicons name="shield-checkmark-outline" size={12} color={Palette.emerald} style={{ marginRight: 4 }} />
                      <Text style={styles.walkInSubtitle}>Mobile number optional • Unknown customers</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.walkInSelectPill}>
                  <Text style={styles.walkInSelectPillText}>Select</Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              {/* Subheader separator for registered phone book customers */}
              <View style={styles.registeredDividerRow}>
                <Text style={styles.registeredSectionLabel}>
                  {searchQuery.trim()
                    ? `Matching Customers (${customers.length})`
                    : `Saved Customers (${customers.length})`}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={searchQuery ? 'search-outline' : 'people-outline'}
                  size={32}
                  color={Palette.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Registered Customers Match Search' : 'No Registered Customers Yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No saved customer matches "${searchQuery}". Tap below to bill as Walk-in Customer.`
                  : 'Tap below to bill as Walk-in Customer.'}
              </Text>

              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={handleSelectWalkIn}
                activeOpacity={0.8}
              >
                <Ionicons name="walk" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyAddBtnText}>Bill as Walk-in Customer</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <POSCustomerCard
              customer={item}
              onSelect={onSelectCustomer}
              onViewHistory={onViewCustomerHistory}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.surfaceLight,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Palette.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextGroup: {
    flex: 1,
  },
  screenHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  screenHeaderSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  salesHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  salesHistoryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  searchBarSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.textPrimary,
    height: '100%',
  },
  optionsRow: {
    paddingTop: 6,
    paddingBottom: 8,
  },
  sortChipsContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  sortChipActive: {
    borderColor: Palette.bluePrimary,
    backgroundColor: Palette.blueSoft,
  },
  sortChipText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: Palette.bluePrimary,
    fontWeight: '700',
  },
  guestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  guestChipText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  directoryInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  directoryInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listHeaderWrapper: {
    paddingBottom: 4,
  },
  walkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  walkInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  walkInAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  walkInInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  walkInTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  walkInTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  walkInBadge: {
    backgroundColor: Palette.emeraldLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  walkInBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.emerald,
  },
  walkInSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  walkInSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  walkInSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 3,
  },
  walkInSelectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  registeredDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 6,
  },
  registeredSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingLabel: {
    marginTop: 12,
    fontSize: 14,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    ...Shadows.sm,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyGuestBtnText: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
});
