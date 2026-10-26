import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import {
  DashboardOverview,
  StockHealthResponse,
  SalesVelocityResponse,
} from '@/types/api';
import { dashboardApi } from '@/services/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { OfflineScreen } from '@/components/ui/OfflineScreen';
import { useNetworkStatus } from '@/context/NetworkContext';
import { logError } from '@/utils/errorHandler';

export const DashboardScreen: React.FC = () => {
  const { activeStore } = useAuth();
  const { isOffline } = useNetworkStatus();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [stockHealth, setStockHealth] = useState<StockHealthResponse | null>(null);
  const [salesVelocity, setSalesVelocity] = useState<SalesVelocityResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [ov, sh, sv] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getStockHealth(),
        dashboardApi.getSalesVelocity(7, 5),
      ]);
      setOverview(ov);
      setStockHealth(sh);
      setSalesVelocity(sv);
    } catch (e: unknown) {
      logError('DashboardScreen:loadDashboardData', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      dashboardApi.getOverview(),
      dashboardApi.getStockHealth(),
      dashboardApi.getSalesVelocity(7, 5),
    ])
      .then(([ov, sh, sv]) => {
        if (isMounted) {
          setOverview(ov);
          setStockHealth(sh);
          setSalesVelocity(sv);
          setIsLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (isMounted) {
          logError('DashboardScreen:useEffect', e);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeStore?.store_id]);

  const onRefresh = () => {
    setIsRefreshing(true);
    void loadDashboardData();
  };

  if (isLoading && !overview) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Palette.navyPrimary} />
        <Text style={styles.loadingText}>Loading store dashboard...</Text>
      </View>
    );
  }

  if (isOffline && !overview) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <OfflineScreen
          compact
          title="Dashboard Offline"
          message="Analytics and real-time inventory health require a network connection. Please reconnect to view live statistics."
          onRetry={loadDashboardData}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Store Header Banner */}
      <View style={styles.storeHeader}>
        <View>
          <Text style={styles.storeTitle}>{overview?.store_name || activeStore?.name || 'Store Analytics'}</Text>
          <Text style={styles.storeSub}>Store Performance & Insights</Text>
        </View>
        <TouchableOpacity style={styles.refreshPill} onPress={onRefresh}>
          <Ionicons name="refresh" size={14} color={Palette.bluePrimary} />
          <Text style={styles.refreshPillText}>Update</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        <Card style={styles.kpiCard} variant="elevated">
          <View style={[styles.kpiIcon, { backgroundColor: Palette.emeraldLight }]}>
            <Ionicons name="cash-outline" size={20} color={Palette.emeraldDark} />
          </View>
          <Text style={styles.kpiLabel}>{"Today's Revenue"}</Text>
          <Text style={styles.kpiValue}>₹ {Number(overview?.today_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.kpiSub}>{overview?.today_transaction_count || 0} sales recorded</Text>
        </Card>

        <Card style={styles.kpiCard} variant="elevated">
          <View style={[styles.kpiIcon, { backgroundColor: Palette.blueSoft }]}>
            <Ionicons name="calendar-outline" size={20} color={Palette.bluePrimary} />
          </View>
          <Text style={styles.kpiLabel}>Weekly Revenue</Text>
          <Text style={styles.kpiValue}>₹ {Number(overview?.weekly_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.kpiSub}>Rolling 7-day period</Text>
        </Card>

        <Card style={styles.kpiCard} variant="elevated">
          <View style={[styles.kpiIcon, { backgroundColor: Palette.amberLight }]}>
            <Ionicons name="warning-outline" size={20} color={Palette.amber} />
          </View>
          <Text style={styles.kpiLabel}>Low Stock Alerts</Text>
          <Text style={[styles.kpiValue, { color: Palette.amber }]}>
            {overview?.low_stock_products_count || 0}
          </Text>
          <Text style={styles.kpiSub}>Below safety threshold</Text>
        </Card>

        <Card style={styles.kpiCard} variant="elevated">
          <View style={[styles.kpiIcon, { backgroundColor: Palette.roseLight }]}>
            <Ionicons name="alarm-outline" size={20} color={Palette.rose} />
          </View>
          <Text style={styles.kpiLabel}>Expiring Soon (30d)</Text>
          <Text style={[styles.kpiValue, { color: Palette.rose }]}>
            {overview?.batches_expiring_within_30_days || 0}
          </Text>
          <Text style={styles.kpiSub}>Batches near expiry</Text>
        </Card>
      </View>

      {/* Stock Health & Expiration Alerts */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Palette.bluePrimary} />
            <Text style={styles.sectionTitle}>Stock Expiration Tracking</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {stockHealth?.total_critical_batches || 0} Attention Needed
          </Text>
        </View>

        {!stockHealth?.batches || stockHealth.batches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color={Palette.emerald} />
            <Text style={styles.emptyText}>All current inventory batches are safely within shelf life.</Text>
          </View>
        ) : (
          stockHealth.batches.slice(0, 5).map((batch) => {
            const isExpired = batch.status === 'EXPIRED';
            const isCritical = batch.status === 'CRITICAL_30_DAYS';
            return (
              <View key={batch.batch_id} style={styles.stockHealthRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stockItemTitle}>{batch.product_name}</Text>
                  <Text style={styles.stockItemSub}>
                    Lot: {batch.batch_identifier} • {Number(batch.current_quantity)} {batch.unit} left
                  </Text>
                </View>
                <Badge
                  label={isExpired ? 'EXPIRED' : `${batch.days_until_expiry}d left`}
                  variant={isExpired ? 'danger' : isCritical ? 'warning' : 'neutral'}
                  size="sm"
                />
              </View>
            );
          })
        )}
      </View>

      {/* Top Velocity Products */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="trending-up-outline" size={18} color={Palette.bluePrimary} />
            <Text style={styles.sectionTitle}>Fast Moving Items</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Past 7 Days</Text>
        </View>

        {!salesVelocity?.top_selling_items || salesVelocity.top_selling_items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cart-outline" size={32} color={Palette.textSecondary} />
            <Text style={styles.emptyText}>No sales transactions registered for this period yet.</Text>
          </View>
        ) : (
          salesVelocity.top_selling_items.map((item, idx) => (
            <View key={item.product_id} style={styles.velocityRow}>
              <View style={styles.velocityRank}>
                <Text style={styles.velocityRankText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.stockItemTitle}>{item.product_name}</Text>
                <Text style={styles.stockItemSub}>
                  {item.category} • {Number(item.total_quantity_sold)} {item.unit} sold
                </Text>
              </View>
              <Text style={styles.velocityRevenue}>
                ₹ {Number(item.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.surfaceLight,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceLight,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: Palette.textSecondary,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  storeSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  refreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  refreshPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
    marginLeft: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.navyPrimary,
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: Palette.textMuted,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceMuted,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginLeft: 6,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  stockHealthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceMuted,
  },
  stockItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  stockItemSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  velocityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceMuted,
  },
  velocityRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  velocityRankText: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  velocityRevenue: {
    flexShrink: 0,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: Palette.emeraldDark,
  },
});
