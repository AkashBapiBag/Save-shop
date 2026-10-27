import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  StyleProp,
  ViewStyle,
  DimensionValue,
  ScrollView,
} from 'react-native';
import { Palette, Shadows } from '@/theme/designSystem';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
  testID?: string;
}

/**
 * Base animated skeleton placeholder element.
 * Pulses gently with opacity transitions to signal background data fetching.
 */
export const Skeleton: React.FC<SkeletonProps> & {
  Text: typeof SkeletonText;
  Avatar: typeof SkeletonAvatar;
  Badge: typeof SkeletonBadge;
  Button: typeof SkeletonButton;
  Card: typeof SkeletonCard;
} = ({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
  animated = true,
  testID = 'skeleton-item',
}) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!animated) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [animated, pulseAnim]);

  return (
    <Animated.View
      testID={testID}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading content"
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          opacity: animated ? pulseAnim : 0.5,
        },
        style,
      ]}
    />
  );
};

// -------------------------------------------------------------
// Sub-primitives
// -------------------------------------------------------------

export interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  lastLineWidth?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 2,
  lineHeight = 12,
  gap = 6,
  lastLineWidth = '60%',
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, idx) => {
        const isLast = idx === lines - 1;
        const width = isLast && lines > 1 ? lastLineWidth : '100%';
        return (
          <Skeleton
            key={idx}
            height={lineHeight}
            width={width}
            borderRadius={4}
            style={{ marginBottom: isLast ? 0 : gap }}
          />
        );
      })}
    </View>
  );
};

export interface SkeletonAvatarProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({ size = 40, style }) => {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
};

export interface SkeletonBadgeProps {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonBadge: React.FC<SkeletonBadgeProps> = ({
  width = 64,
  height = 20,
  style,
}) => {
  return <Skeleton width={width} height={height} borderRadius={10} style={style} />;
};

export interface SkeletonButtonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  width = 80,
  height = 36,
  borderRadius = 8,
  style,
}) => {
  return <Skeleton width={width} height={height} borderRadius={borderRadius} style={style} />;
};

export interface SkeletonCardProps {
  children?: React.ReactNode;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  children,
  height,
  style,
  testID,
}) => {
  return (
    <View testID={testID} style={[styles.cardContainer, height !== undefined ? { height } : null, style]}>
      {children}
    </View>
  );
};

// Bind sub-components to default Skeleton
Skeleton.Text = SkeletonText;
Skeleton.Avatar = SkeletonAvatar;
Skeleton.Badge = SkeletonBadge;
Skeleton.Button = SkeletonButton;
Skeleton.Card = SkeletonCard;

// -------------------------------------------------------------
// Dedicated Page & Section Skeletons
// -------------------------------------------------------------

/**
 * Skeleton loader for Billing / POS Terminal Screen.
 * Previews category pills, filter indicator, and 2-column product catalog grid.
 */
export const POSTerminalSkeleton: React.FC<{ cardCount?: number }> = ({ cardCount = 6 }) => {
  return (
    <View style={styles.pageContainer} testID="pos-terminal-skeleton">
      {/* Category Pills Strip Skeleton */}
      <View style={styles.posCategoryRow}>
        {['70', '90', '65', '85', '75'].map((w, idx) => (
          <Skeleton
            key={idx}
            width={parseInt(w, 10)}
            height={32}
            borderRadius={16}
            style={{ marginRight: 8 }}
          />
        ))}
      </View>

      {/* Filter Status Strip Skeleton */}
      <View style={styles.posStatusRow}>
        <Skeleton width="45%" height={12} borderRadius={4} />
      </View>

      {/* 2-Column Product Grid Skeleton */}
      <ScrollView
        contentContainerStyle={styles.posGridContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.posRowWrapper}>
          {Array.from({ length: cardCount }).map((_, idx) => (
            <View key={idx} style={styles.posCard}>
              {/* Header: badge + category */}
              <View style={styles.rowBetween}>
                <Skeleton width={70} height={16} borderRadius={8} />
                <Skeleton width={50} height={12} borderRadius={4} />
              </View>

              {/* Title lines */}
              <View style={{ marginVertical: 12 }}>
                <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <Skeleton width="55%" height={11} borderRadius={4} />
              </View>

              {/* Footer: Price + Add Button */}
              <View style={styles.rowBetween}>
                <Skeleton width={55} height={18} borderRadius={4} />
                <Skeleton width={32} height={32} borderRadius={16} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * Skeleton loader for Inventory Screen.
 * Previews inventory item list cards with stock tags, unit metrics, and prices.
 */
export const InventorySkeleton: React.FC<{ itemCount?: number }> = ({ itemCount = 6 }) => {
  return (
    <View style={styles.pageContainer} testID="inventory-skeleton">
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: itemCount }).map((_, idx) => (
          <View key={idx} style={styles.inventoryRowCard}>
            <View style={{ flex: 1, marginRight: 12 }}>
              {/* Product title + Stock status pill */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Skeleton width="55%" height={15} borderRadius={4} style={{ marginRight: 8 }} />
                <Skeleton width={75} height={18} borderRadius={9} />
              </View>

              {/* Product category + min alert */}
              <Skeleton width="40%" height={12} borderRadius={4} />
            </View>

            {/* Price + Stock quantity */}
            <View style={{ alignItems: 'flex-end' }}>
              <Skeleton width={60} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width={45} height={12} borderRadius={4} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * Skeleton loader for Sales History Screen.
 * Previews summary KPI metric strip and sales transaction receipt cards.
 */
export const SalesHistorySkeleton: React.FC<{ itemCount?: number }> = ({ itemCount = 5 }) => {
  return (
    <View style={styles.pageContainer} testID="sales-history-skeleton">
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: itemCount }).map((_, idx) => (
          <View key={idx} style={styles.salesCard}>
            {/* Top Row: Invoice pill + Date */}
            <View style={[styles.rowBetween, { marginBottom: 12 }]}>
              <Skeleton width={110} height={20} borderRadius={6} />
              <Skeleton width={90} height={12} borderRadius={4} />
            </View>

            {/* Customer Info Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Skeleton width="50%" height={14} borderRadius={4} style={{ marginBottom: 5 }} />
                <Skeleton width="35%" height={11} borderRadius={4} />
              </View>
            </View>

            {/* Separator */}
            <View style={styles.cardDivider} />

            {/* Bottom Row: Item count badge + Final Total */}
            <View style={[styles.rowBetween, { marginTop: 10 }]}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Skeleton width={60} height={20} borderRadius={10} />
                <Skeleton width={50} height={20} borderRadius={10} />
              </View>
              <Skeleton width={80} height={20} borderRadius={4} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * Skeleton loader for Store Analytics / Dashboard Screen.
 * Previews store header, 4 KPI metric cards, fast moving items, and stock health sections.
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <ScrollView
      style={styles.pageContainer}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      testID="dashboard-skeleton"
    >
      {/* Store Header Skeleton */}
      <View style={[styles.rowBetween, { marginBottom: 16 }]}>
        <View style={{ flex: 1 }}>
          <Skeleton width="60%" height={22} borderRadius={6} style={{ marginBottom: 6 }} />
          <Skeleton width="35%" height={12} borderRadius={4} />
        </View>
        <Skeleton width={70} height={26} borderRadius={13} />
      </View>

      {/* 2x2 KPI Overview Grid Skeleton */}
      <View style={styles.kpiGrid}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <View key={idx} style={styles.kpiCard}>
            <Skeleton width={36} height={36} borderRadius={10} style={{ marginBottom: 10 }} />
            <Skeleton width="50%" height={11} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="70%" height={20} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={10} borderRadius={3} />
          </View>
        ))}
      </View>

      {/* FEFO Stock Health Card Skeleton */}
      <View style={styles.sectionCard}>
        <View style={[styles.rowBetween, { marginBottom: 14 }]}>
          <Skeleton width="50%" height={16} borderRadius={4} />
          <Skeleton width={60} height={12} borderRadius={4} />
        </View>
        {Array.from({ length: 3 }).map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.rowBetween,
              {
                paddingVertical: 10,
                borderBottomWidth: idx < 2 ? 1 : 0,
                borderBottomColor: Palette.surfaceMuted,
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Skeleton width="65%" height={14} borderRadius={4} style={{ marginBottom: 5 }} />
              <Skeleton width="45%" height={11} borderRadius={4} />
            </View>
            <Skeleton width={70} height={18} borderRadius={9} />
          </View>
        ))}
      </View>

      {/* Fast Moving Velocity Items Skeleton */}
      <View style={styles.sectionCard}>
        <View style={[styles.rowBetween, { marginBottom: 14 }]}>
          <Skeleton width="45%" height={16} borderRadius={4} />
          <Skeleton width={70} height={12} borderRadius={4} />
        </View>
        {Array.from({ length: 3 }).map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.rowBetween,
              {
                paddingVertical: 10,
                borderBottomWidth: idx < 2 ? 1 : 0,
                borderBottomColor: Palette.surfaceMuted,
              },
            ]}
          >
            <Skeleton width={22} height={22} borderRadius={11} style={{ marginRight: 10 }} />
            <View style={{ flex: 1, marginRight: 10 }}>
              <Skeleton width="60%" height={14} borderRadius={4} style={{ marginBottom: 5 }} />
              <Skeleton width="35%" height={11} borderRadius={4} />
            </View>
            <Skeleton width={75} height={15} borderRadius={4} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

/**
 * Skeleton loader for Store Management Screen.
 * Previews store profiles list, owner badges, and action buttons.
 */
export const StoreManagementSkeleton: React.FC<{ storeCount?: number }> = ({ storeCount = 3 }) => {
  return (
    <View style={styles.pageContainer} testID="store-management-skeleton">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: storeCount }).map((_, idx) => (
          <View key={idx} style={styles.storeCard}>
            {/* Header: Store icon + Name + Active badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Skeleton width={44} height={44} borderRadius={12} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Skeleton width="55%" height={16} borderRadius={4} style={{ marginRight: 8 }} />
                  {idx === 0 && <Skeleton width={80} height={18} borderRadius={9} />}
                </View>
                <Skeleton width="40%" height={12} borderRadius={4} />
              </View>
            </View>

            {/* Address line */}
            <Skeleton width="85%" height={12} borderRadius={4} style={{ marginBottom: 12 }} />

            {/* Details pills */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              <Skeleton width={90} height={20} borderRadius={6} />
              <Skeleton width={110} height={20} borderRadius={6} />
              <Skeleton width={100} height={20} borderRadius={6} />
            </View>

            <View style={styles.cardDivider} />

            {/* Action buttons row */}
            <View style={[styles.rowBetween, { marginTop: 12 }]}>
              <Skeleton width={95} height={34} borderRadius={8} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Skeleton width={75} height={34} borderRadius={8} />
                <Skeleton width={75} height={34} borderRadius={8} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * Skeleton loader for Batch Inspection Modal.
 */
export const BatchInspectionSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={{ paddingVertical: 8 }} testID="batch-inspection-skeleton">
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.batchCard}>
          <View style={[styles.rowBetween, { marginBottom: 10 }]}>
            <Skeleton width="55%" height={16} borderRadius={4} />
            <Skeleton width={70} height={18} borderRadius={9} />
          </View>
          <View style={[styles.rowBetween, { marginBottom: 8 }]}>
            <Skeleton width="40%" height={13} borderRadius={4} />
            <Skeleton width="30%" height={13} borderRadius={4} />
          </View>
          <Skeleton width="50%" height={11} borderRadius={4} />
        </View>
      ))}
    </View>
  );
};

/**
 * Skeleton loader for Store Users / Operators Modal.
 */
export const StoreUsersSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={{ paddingVertical: 8 }} testID="store-users-skeleton">
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.operatorRow}>
          <Skeleton width={38} height={38} borderRadius={19} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="45%" height={14} borderRadius={4} style={{ marginBottom: 5 }} />
            <Skeleton width="65%" height={11} borderRadius={4} />
          </View>
          <Skeleton width={60} height={20} borderRadius={10} />
        </View>
      ))}
    </View>
  );
};

// -------------------------------------------------------------
// Styles
// -------------------------------------------------------------

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#E2E8F0',
  },
  pageContainer: {
    flex: 1,
    backgroundColor: Palette.surfaceLight,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Palette.surfaceMuted,
    width: '100%',
  },

  // POS
  posCategoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  posStatusRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Palette.surfaceLight,
  },
  posGridContainer: {
    padding: 8,
    paddingBottom: 40,
  },
  posRowWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  posCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    minHeight: 120,
    justifyContent: 'space-between',
    ...Shadows.sm,
  },

  // Inventory
  inventoryRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },

  // Sales
  salesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },

  // Dashboard
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
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

  // Store Management
  storeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },

  // Batch
  batchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },

  // Operators
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
});
