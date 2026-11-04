import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/ui/AppHeader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { POSTerminalScreen } from '@/screens/POSTerminalScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { StoreManagementScreen } from '@/screens/StoreManagementScreen';
import { SalesHistoryScreen } from '@/screens/SalesHistoryScreen';
import { Palette, Shadows } from '@/theme/designSystem';
import { usePWAInstall } from '@/hooks/usePWAInstall';

type TabKey = 'pos' | 'sales' | 'inventory' | 'dashboard' | 'stores';

interface TabConfig {
  key: TabKey;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
}

interface NavTabItemProps {
  tab: TabConfig;
  isSelected: boolean;
  onPress: () => void;
}

const NavTabItem: React.FC<NavTabItemProps> = ({ tab, isSelected, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: Platform.OS !== 'web',
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 25,
      bounciness: 8,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.tabItem}
      activeOpacity={0.75}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${tab.label} tab`}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isSelected ? tab.activeIcon : tab.inactiveIcon}
            size={22}
            color={isSelected ? Palette.bluePrimary : Palette.textSecondary}
          />
          {tab.badgeCount && tab.badgeCount > 0 ? (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[
            styles.tabLabel,
            isSelected && styles.tabLabelSelected,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>

        {/* Modern illuminated micro-indicator pill */}
        <View style={[styles.activeIndicator, isSelected && styles.activeIndicatorVisible]} />
      </Animated.View>
    </TouchableOpacity>
  );
};

function checkIsStandalone(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }
  return Boolean(
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as unknown as { standalone?: boolean })?.standalone === true ||
      (typeof document !== 'undefined' && document.referrer?.includes('android-app://'))
  );
}

export const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('pos');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isInstalled } = usePWAInstall();

  // Floating Island style for Native Mobile, installed PWA, or mobile screen widths (< 768px).
  // Edge-to-edge full width (like old design) for standard Desktop Web browsers.
  const isPWA = isInstalled || checkIsStandalone();
  const isMobileViewport = width < 768;
  const isMobileOrPWA = Platform.OS !== 'web' || isPWA || isMobileViewport;

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'sales':
        return <SalesHistoryScreen />;
      case 'inventory':
        return <InventoryScreen />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'stores':
        return <StoreManagementScreen />;
      case 'pos':
      default:
        return <POSTerminalScreen onNavigateToSales={() => setActiveTab('sales')} />;
    }
  };

  const tabs: TabConfig[] = [
    { key: 'pos', label: 'Billing', activeIcon: 'cart', inactiveIcon: 'cart-outline' },
    { key: 'sales', label: 'Sales', activeIcon: 'receipt', inactiveIcon: 'receipt-outline' },
    { key: 'inventory', label: 'Inventory', activeIcon: 'cube', inactiveIcon: 'cube-outline' },
    { key: 'dashboard', label: 'Analytics', activeIcon: 'stats-chart', inactiveIcon: 'stats-chart-outline' },
    { key: 'stores', label: 'Stores', activeIcon: 'business', inactiveIcon: 'business-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Universal App Header */}
      <AppHeader />

      {/* Screen Content */}
      <View style={styles.contentArea}>
        <ErrorBoundary key={activeTab}>
          {renderActiveScreen()}
        </ErrorBoundary>
      </View>

      {/* Bottom Tab Bar: Responsive Adaptive Layout */}
      {isMobileOrPWA ? (
        /* Floating Island Dock for Mobile & PWA */
        <View
          style={[
            styles.bottomTabBarWrapper,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <View style={styles.bottomTabBarFloating}>
            {tabs.map((tab) => (
              <NavTabItem
                key={tab.key}
                tab={tab}
                isSelected={activeTab === tab.key}
                onPress={() => setActiveTab(tab.key)}
              />
            ))}
          </View>
        </View>
      ) : (
        /* Full-Width Docked Bar for Desktop Web (like old design) */
        <View
          style={[
            styles.bottomTabBarWeb,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          {tabs.map((tab) => (
            <NavTabItem
              key={tab.key}
              tab={tab}
              isSelected={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.surfaceLight,
  },
  contentArea: {
    flex: 1,
  },
  // Floating Mobile / PWA bottom tab bar
  bottomTabBarWrapper: {
    backgroundColor: Palette.surfaceLight,
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  bottomTabBarFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
      },
    }),
  },
  // Full-width Desktop Web bottom tab bar (like old design)
  bottomTabBarWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
    paddingTop: 8,
    width: '100%',
    ...Shadows.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Palette.textSecondary,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  tabLabelSelected: {
    color: Palette.bluePrimary,
    fontWeight: '700',
  },
  activeIndicator: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 3,
  },
  activeIndicatorVisible: {
    backgroundColor: Palette.bluePrimary,
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: Palette.amber,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
