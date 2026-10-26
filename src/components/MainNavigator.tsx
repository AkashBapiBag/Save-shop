import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

type TabKey = 'pos' | 'sales' | 'inventory' | 'dashboard' | 'stores';

export const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('pos');
  const insets = useSafeAreaInsets();

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

  const tabs: {
    key: TabKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    badgeCount?: number;
  }[] = [
    { key: 'pos', label: 'Billing', icon: 'cart-outline' },
    { key: 'sales', label: 'Sales', icon: 'time-outline' },
    { key: 'inventory', label: 'Inventory', icon: 'cube-outline' },
    { key: 'dashboard', label: 'Analytics', icon: 'bar-chart-outline' },
    { key: 'stores', label: 'Stores', icon: 'business-outline' },
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

      {/* Modern Bottom Tab Bar */}
      <View
        style={[
          styles.bottomTabBar,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
            >
              <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={isSelected ? Palette.bluePrimary : Palette.textSecondary}
                />
                {tab.badgeCount && tab.badgeCount > 0 ? (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{tab.badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isSelected && styles.tabLabelSelected,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
    paddingTop: 8,
    ...Shadows.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    padding: 4,
    borderRadius: 8,
    position: 'relative',
  },
  iconContainerSelected: {
    backgroundColor: Palette.blueSoft,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 2,
  },
  tabLabelSelected: {
    color: Palette.bluePrimary,
    fontWeight: '700',
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: Palette.amber,
    borderRadius: 8,
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
