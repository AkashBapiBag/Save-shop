import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { Product, PaymentMethod, ReceiptResponse, POSTransactionCreate, Customer } from '@/types/api';
import { inventoryApi, billingApi, customerApi } from '@/services/api';
import { Palette } from '@/theme/designSystem';
import { TaxInvoiceModal } from '@/components/TaxInvoiceModal';
import { POSTerminalSkeleton } from '@/components/ui/Skeleton';
import { useCart } from '@/hooks/pos/useCart';
import { POSProductCard } from '@/components/pos/POSProductCard';
import { POSCategoryBar } from '@/components/pos/POSCategoryBar';
import { POSCartSummaryBar } from '@/components/pos/POSCartSummaryBar';
import { POSCartDrawer } from '@/components/pos/POSCartDrawer';
import { POSCheckoutModal } from '@/components/pos/POSCheckoutModal';
import { POSCustomerSelectView } from '@/components/pos/POSCustomerSelectView';
import { POSActiveCustomerBanner } from '@/components/pos/POSActiveCustomerBanner';
import { CustomerHistoryModal } from '@/components/pos/CustomerHistoryModal';
import { useNetworkStatus } from '@/context/NetworkContext';
import { showErrorAlert, logError } from '@/utils/errorHandler';

interface POSTerminalScreenProps {
  onNavigateToSales?: () => void;
}

export const POSTerminalScreen: React.FC<POSTerminalScreenProps> = ({ onNavigateToSales }) => {
  const { activeStore } = useAuth();
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, Platform.OS === 'android' ? 28 : 12);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValidatingStock, setIsValidatingStock] = useState<boolean>(false);

  // Cart Custom Hook
  const {
    cart,
    setCart,
    addToCart,
    updateQuantity,
    setQuantity,
    updateItemCashback,
    clearCart,
    subtotalDiscountType,
    setSubtotalDiscountType,
    subtotalDiscountValue,
    setSubtotalDiscountValue,
    calculation,
    totalCartCount,
  } = useCart();

  // Customer Selection & History State
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState<boolean>(false);
  const [returnToHistoryOnClose, setReturnToHistoryOnClose] = useState<boolean>(false);

  // Modals
  const [cartDrawerVisible, setCartDrawerVisible] = useState<boolean>(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [receivedAmount, setReceivedAmount] = useState<string>('0');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);
  const [saveExcessAsAdvance, setSaveExcessAsAdvance] = useState<boolean>(false);
  const [useAdvanceBalance, setUseAdvanceBalance] = useState<boolean>(false);

  // Tax Invoice Modal State
  const [receiptData, setReceiptData] = useState<ReceiptResponse | null>(null);
  const [taxInvoiceVisible, setTaxInvoiceVisible] = useState<boolean>(false);

  const activeStoreId = activeStore?.store_id;

  const loadProducts = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await inventoryApi.listProducts(activeStoreId ? { store_id: activeStoreId } : undefined);
      setProducts(data);
      const uniqueCats = Array.from(new Set(data.map((p) => p.category || 'General')));
      setCategories(['All', ...uniqueCats]);
    } catch (e: unknown) {
      logError('POSTerminalScreen:loadProducts', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeStoreId]);

  // Track active store changes during render to reset filters and modals
  const [prevStoreId, setPrevStoreId] = useState(activeStoreId);
  if (activeStoreId !== prevStoreId) {
    setPrevStoreId(activeStoreId);
    setSelectedCategory('All');
    setSearchQuery('');
    setCartDrawerVisible(false);
    setCheckoutModalVisible(false);
    setActiveCustomer(null);
    setHistoryCustomer(null);
    setHistoryModalVisible(false);
    setReturnToHistoryOnClose(false);
    setTaxInvoiceVisible(false);
    setReceiptData(null);
  }

  // Clear cart whenever active store changes
  useEffect(() => {
    clearCart();
  }, [activeStoreId]);

  // Load products on mount or store tenant change
  useEffect(() => {
    let isMounted = true;
    inventoryApi
      .listProducts(activeStoreId ? { store_id: activeStoreId } : undefined)
      .then((data) => {
        if (isMounted) {
          setProducts(data);
          const uniqueCats = Array.from(new Set(data.map((p) => p.category || 'General')));
          setCategories(['All', ...uniqueCats]);
          setIsLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (isMounted) {
          logError('POSTerminalScreen:loadProducts', e);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeStoreId]);

  // Auto-reload products when connection is restored
  useEffect(() => {
    if (!isOffline && products.length === 0 && !isLoading) {
      void loadProducts(true);
    }
  }, [isOffline]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: products.length,
    };
    products.forEach((p) => {
      const cat = p.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  const isFilterActive = selectedCategory !== 'All' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
  };

  // Proceed to Checkout: Pre-check Backend Stock in Real-time
  const handleProceedToCheckout = async () => {
    if (cart.length === 0) return;
    setIsValidatingStock(true);
    try {
      const res = await billingApi.validateStock(
        cart.map((it) => ({
          product_id: it.product.product_id,
          quantity: it.quantity,
        }))
      );
      if (!res.is_valid && res.errors.length > 0) {
        const errorLines = res.errors.map((e) => `• ${e.message}`).join('\n');
        Alert.alert(
          'Insufficient Stock',
          `Cannot proceed to checkout. Not enough stock available:\n\n${errorLines}`
        );
        return;
      }
      const isWalkIn = activeCustomer?.customer_id === 'guest' || customerName.toLowerCase().includes('walk-in');
      const adv = !isWalkIn ? parseFloat(String(activeCustomer?.advance_balance || 0)) : 0;
      setUseAdvanceBalance(adv > 0);
      setSaveExcessAsAdvance(false);
      if (isWalkIn && paymentMethod === 'CREDIT') {
        setPaymentMethod('CASH');
      }
      if (paymentMethod === 'CREDIT' && !isWalkIn) {
        setReceivedAmount('0');
      } else {
        const netAfterAdv = adv > 0 ? Math.max(0, calculation.finalTotal - adv) : calculation.finalTotal;
        setReceivedAmount(netAfterAdv.toFixed(2));
      }
      setCheckoutModalVisible(true);
    } catch (err: unknown) {
      showErrorAlert(err, 'Stock Check Error', 'Could not verify stock with server.');
    } finally {
      setIsValidatingStock(false);
    }
  };

  // Execute POS Checkout with Selected Customer & Optional Mobile Number
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      Alert.alert('Required Field', 'Please enter Customer Name.');
      return;
    }

    const trimmedPhone = customerPhone.trim();
    if (trimmedPhone) {
      const cleanPhone = trimmedPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit mobile number, or leave it blank.');
        return;
      }
    }

    const isWalkIn = activeCustomer?.customer_id === 'guest' || customerName.toLowerCase().includes('walk-in');
    const parsedReceived = paymentMethod === 'CREDIT' ? 0 : (parseFloat(receivedAmount) || 0);
    const advApplied = (!isWalkIn && useAdvanceBalance) ? Math.min(parseFloat(String(activeCustomer?.advance_balance || 0)), calculation.finalTotal) : 0;
    const netPayable = Math.max(0, calculation.finalTotal - advApplied);

    if (isWalkIn && (paymentMethod === 'CREDIT' || parsedReceived < netPayable)) {
      Alert.alert(
        'Full Payment Required',
        `Walk-in customers must pay in full. Dues or credit purchases are not allowed. Please collect the remaining ₹${(netPayable - parsedReceived).toFixed(2)}.`
      );
      return;
    }

    setIsProcessingCheckout(true);

    const posPayload: POSTransactionCreate = {
      store_id: activeStore?.store_id,
      customer_id: activeCustomer?.customer_id === 'guest' ? undefined : activeCustomer?.customer_id,
      items: cart.map((item) => ({
        product_id: item.product.product_id,
        quantity: item.quantity,
        unit_price_override: item.unit_price,
        item_discount_pct: item.item_discount_pct,
        cashback_amount: item.cashback_amount,
        cashback_pct: item.cashback_type === 'percentage' ? item.cashback_value : 0,
      })),
      discount_type: 'amount',
      total_discount_amount: 0,
      total_discount_pct: 0,
      received_amount: paymentMethod === 'CREDIT' ? 0 : (parseFloat(receivedAmount) || 0),
      payment_method: paymentMethod,
      customer_name: customerName.trim(),
      customer_phone: trimmedPhone || undefined,
      allow_negative_stock: true,
      save_excess_as_advance: saveExcessAsAdvance,
      use_advance_balance: useAdvanceBalance,
    };

    try {
      const response = await billingApi.checkout(posPayload);
      const receipt = await billingApi.getReceipt(response.transaction_id);

      setReceiptData(receipt);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setReceivedAmount('0');
      setSubtotalDiscountValue('0');
      setCheckoutModalVisible(false);
      setCartDrawerVisible(false);
      setTaxInvoiceVisible(true);
      void loadProducts(false);
      void refreshActiveCustomer();
    } catch (err: unknown) {
      showErrorAlert(err, 'Checkout Error', 'Transaction could not be completed. Please check your connection.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const refreshActiveCustomer = useCallback(async () => {
    if (!activeCustomer || activeCustomer.customer_id === 'guest') return;
    try {
      const updated = await customerApi.getCustomer(activeCustomer.customer_id);
      setActiveCustomer(updated);
    } catch (err: unknown) {
      logError('POSTerminalScreen:refreshActiveCustomer', err);
    }
  }, [activeCustomer]);

  const handleChangeCustomer = () => {
    if (cart.length > 0) {
      Alert.alert(
        'Switch Customer?',
        'You have items in your cart. Switching customer will keep your cart items for the new customer. Do you want to continue?',
        [
          { text: 'Keep Current', style: 'cancel' },
          {
            text: 'Switch Customer',
            onPress: () => {
              setActiveCustomer(null);
            },
          },
        ]
      );
    } else {
      setActiveCustomer(null);
    }
  };

  const handleViewReceiptFromHistory = async (txId: string) => {
    try {
      const r = await billingApi.getReceipt(txId);
      setReceiptData(r);
      // Temporarily hide history modal to prevent simultaneous Modal presentation issues
      setHistoryModalVisible(false);
      setReturnToHistoryOnClose(true);
      setTaxInvoiceVisible(true);
    } catch (e) {
      showErrorAlert(e, 'Receipt Error', 'Could not load receipt.');
    }
  };

  const handleCloseTaxInvoiceInDirectory = () => {
    setTaxInvoiceVisible(false);
    setReceiptData(null);
    if (returnToHistoryOnClose && historyCustomer) {
      setReturnToHistoryOnClose(false);
      setHistoryModalVisible(true);
    }
  };

  const handleCloseTaxInvoiceInPOS = () => {
    setTaxInvoiceVisible(false);
    setReceiptData(null);
    if (returnToHistoryOnClose && historyCustomer) {
      setReturnToHistoryOnClose(false);
      setHistoryModalVisible(true);
    } else {
      setActiveCustomer(null);
    }
  };

  // Step 1: Customer Selection View (Phone Book Directory)
  if (!activeCustomer) {
    return (
      <View style={styles.container}>
        <POSCustomerSelectView
          onSelectCustomer={(cust) => {
            setActiveCustomer(cust);
            setCustomerName(cust.name);
            setCustomerPhone(cust.phone || '');
          }}
          onViewCustomerHistory={(cust) => {
            setHistoryCustomer(cust);
            setHistoryModalVisible(true);
          }}
          onNavigateToSales={onNavigateToSales}
        />

        {/* Customer History Modal */}
        <CustomerHistoryModal
          visible={historyModalVisible}
          customer={historyCustomer}
          onClose={() => {
            setHistoryModalVisible(false);
            setHistoryCustomer(null);
            setReturnToHistoryOnClose(false);
          }}
          onViewReceipt={handleViewReceiptFromHistory}
        />

        {/* Tax Invoice Modal */}
        <TaxInvoiceModal
          visible={taxInvoiceVisible}
          receipt={receiptData}
          onClose={handleCloseTaxInvoiceInDirectory}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Billing Header Bar */}
      <View style={styles.topHeaderBar}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backToCustomersBtn}
            onPress={handleChangeCustomer}
            accessibilityLabel="Back to customer directory"
          >
            <Ionicons name="arrow-back" size={20} color={Palette.bluePrimary} />
          </TouchableOpacity>
          <View style={styles.headerIconCircle}>
            <Ionicons name="receipt-outline" size={18} color={Palette.bluePrimary} />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={styles.screenHeaderTitle} numberOfLines={1} ellipsizeMode="tail">Billing Counter</Text>
            <Text style={styles.screenHeaderSub} numberOfLines={1} ellipsizeMode="tail">{activeStore?.name || 'My Save Shop'}</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {onNavigateToSales && (
            <TouchableOpacity
              style={styles.salesHistoryButton}
              onPress={onNavigateToSales}
              activeOpacity={0.7}
              accessibilityLabel="Go to sales section"
            >
              <Ionicons name="time-outline" size={15} color={Palette.bluePrimary} style={{ marginRight: 4 }} />
              <Text style={styles.salesHistoryButtonText}>Sales</Text>
            </TouchableOpacity>
          )}

          {totalCartCount > 0 ? (
            <TouchableOpacity
              style={styles.headerCartQuickPill}
              activeOpacity={0.8}
              onPress={() => setCartDrawerVisible(true)}
              accessibilityLabel="View cart items"
            >
              <Ionicons name="cart" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.headerCartQuickText}>
                {totalCartCount} • ₹{calculation.finalTotal.toFixed(0)}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Active Customer Banner */}
      <POSActiveCustomerBanner
        customer={activeCustomer}
        onChangeCustomer={handleChangeCustomer}
        onViewHistory={() => {
          setHistoryCustomer(activeCustomer);
          setHistoryModalVisible(true);
        }}
      />

      {/* Modern Search Bar */}
      <View style={styles.searchBarSection}>
        <View style={styles.searchInputBox}>
          <Ionicons name="search" size={18} color={Palette.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by product name or category..."
            placeholderTextColor={Palette.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchTextInput}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Scroller & Catalog / Skeleton */}
      {isLoading && products.length === 0 ? (
        <POSTerminalSkeleton cardCount={6} />
      ) : (
        <>
          <POSCategoryBar
            categories={categories}
            selectedCategory={selectedCategory}
            categoryCounts={categoryCounts}
            onSelectCategory={setSelectedCategory}
          />

          {/* Filter Status Bar */}
          <View style={styles.filterStatusBar}>
            <Text style={styles.filterStatusSummary} numberOfLines={1} ellipsizeMode="tail">
              {selectedCategory !== 'All' ? (
                <>
                  Category: <Text style={styles.filterStatusStrong}>{selectedCategory}</Text> • {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
                </>
              ) : searchQuery.trim() ? (
                <>
                  Search: &ldquo;<Text style={styles.filterStatusStrong}>{searchQuery.trim()}</Text>&rdquo; • {filteredProducts.length} found
                </>
              ) : (
                <>
                  Catalog • <Text style={styles.filterStatusStrong}>{filteredProducts.length}</Text> product{filteredProducts.length === 1 ? '' : 's'} available
                </>
              )}
            </Text>

            {isFilterActive && (
              <TouchableOpacity style={styles.resetFilterChip} onPress={handleResetFilters}>
                <Ionicons name="refresh-outline" size={12} color={Palette.bluePrimary} style={{ marginRight: 3 }} />
                <Text style={styles.resetFilterChipText}>Reset Filter</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Product Catalog Grid */}
          {isLoading ? (
            <POSTerminalSkeleton cardCount={4} />
          ) : filteredProducts.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="cube-outline" size={44} color={Palette.textMuted} />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySubtitle}>
                {isFilterActive
                  ? 'No products match your current search or category filter.'
                  : 'This store has no products yet. Add products from the Inventory tab.'}
              </Text>
              {isFilterActive && (
                <TouchableOpacity style={styles.emptyResetBtn} onPress={handleResetFilters}>
                  <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.emptyResetBtnText}>Show All Products</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.product_id}
              numColumns={2}
              contentContainerStyle={styles.catalogGrid}
              renderItem={({ item }) => {
                const inCartItem = cart.find((c) => c.product.product_id === item.product_id);
                return (
                  <POSProductCard
                    item={item}
                    inCartQty={inCartItem?.quantity || 0}
                    onAddToCart={addToCart}
                  />
                );
              }}
            />
          )}
        </>
      )}

      {/* Floating Bottom Cart Bar */}
      <POSCartSummaryBar
        totalCartCount={totalCartCount}
        finalTotal={calculation.finalTotal}
        onOpenCart={() => setCartDrawerVisible(true)}
      />

      {/* Cart Drawer Modal */}
      <POSCartDrawer
        visible={cartDrawerVisible}
        cart={cart}
        totalCartCount={totalCartCount}
        calculation={calculation}
        subtotalDiscountType={subtotalDiscountType}
        subtotalDiscountValue={subtotalDiscountValue}
        isValidatingStock={isValidatingStock}
        safeTop={safeTop}
        onClose={() => setCartDrawerVisible(false)}
        onClearCart={clearCart}
        onProceedToCheckout={handleProceedToCheckout}
        onUpdateQuantity={updateQuantity}
        onSetQuantity={setQuantity}
        onUpdateItemCashback={updateItemCashback}
        onSetSubtotalDiscountType={setSubtotalDiscountType}
        onSetSubtotalDiscountValue={setSubtotalDiscountValue}
      />

      {/* Checkout Details Modal */}
      <POSCheckoutModal
        visible={checkoutModalVisible}
        cart={cart}
        finalTotal={calculation.finalTotal}
        paymentMethod={paymentMethod}
        receivedAmount={receivedAmount}
        customerName={customerName}
        customerPhone={customerPhone}
        isProcessingCheckout={isProcessingCheckout}
        isWalkIn={activeCustomer?.customer_id === 'guest' || customerName.toLowerCase().includes('walk-in')}
        existingDue={parseFloat(String(activeCustomer?.total_due || 0))}
        existingAdvance={parseFloat(String(activeCustomer?.advance_balance || 0))}
        saveExcessAsAdvance={saveExcessAsAdvance}
        useAdvanceBalance={useAdvanceBalance}
        onClose={() => setCheckoutModalVisible(false)}
        onSelectPaymentMethod={setPaymentMethod}
        onChangeReceivedAmount={setReceivedAmount}
        onChangeCustomerName={setCustomerName}
        onChangeCustomerPhone={setCustomerPhone}
        onToggleSaveExcessAsAdvance={setSaveExcessAsAdvance}
        onToggleUseAdvanceBalance={setUseAdvanceBalance}
        onConfirmCheckout={handleCheckout}
      />

      {/* Customer Purchase History Modal */}
      <CustomerHistoryModal
        visible={historyModalVisible}
        customer={historyCustomer}
        onClose={() => {
          setHistoryModalVisible(false);
          setHistoryCustomer(null);
          setReturnToHistoryOnClose(false);
        }}
        onViewReceipt={handleViewReceiptFromHistory}
        onCustomerUpdated={refreshActiveCustomer}
      />

      {/* Tax Invoice Modal */}
      <TaxInvoiceModal
        visible={taxInvoiceVisible}
        receipt={receiptData}
        onClose={handleCloseTaxInvoiceInPOS}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  backToCustomersBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTextGroup: {
    marginLeft: 8,
    flex: 1,
    minWidth: 0,
  },
  screenHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  screenHeaderSub: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  salesHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Palette.blueSoft,
    borderRadius: 16,
    flexShrink: 0,
  },
  salesHistoryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  headerCartQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.navyPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexShrink: 0,
  },
  headerCartQuickText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBarSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.textPrimary,
    paddingVertical: 0,
    minWidth: 0,
  },
  filterStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Palette.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  filterStatusSummary: {
    fontSize: 12,
    color: Palette.textSecondary,
    flex: 1,
  },
  filterStatusStrong: {
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  resetFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  resetFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: Palette.textSecondary,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.navyPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  catalogGrid: {
    padding: 11,
    paddingBottom: 90,
  },
});
