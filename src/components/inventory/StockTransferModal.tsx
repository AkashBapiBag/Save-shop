import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Product, Store, StockTransfer, StockTransferCreateRequest } from '@/types/api';
import { transferApi, inventoryApi } from '@/services/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SearchableProductModal } from '@/components/SearchableProductSelect';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { showErrorAlert } from '@/utils/errorHandler';

export interface StockTransferModalProps {
  visible: boolean;
  onClose: () => void;
  onTransferSuccess?: () => void;
}

interface TransferItemDraft {
  product: Product;
  quantity: string;
}

interface TransferSuccessInfo {
  transferNumber: string;
  sourceStoreName: string;
  destStoreName: string;
  totalItems: number;
  totalQuantity: number;
}

interface StorePickerModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  stores: Store[];
  selectedStoreId: string;
  onSelect: (store: Store) => void;
  onClose: () => void;
}

const StorePickerModal: React.FC<StorePickerModalProps> = ({
  visible,
  title,
  subtitle,
  stores,
  selectedStoreId,
  onSelect,
  onClose,
}) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 500;
  const modalWidth = isSmallScreen
    ? Math.min(Math.round(screenWidth - 24), 420)
    : Math.min(Math.round(screenWidth - 32), 440);
  const modalHeight = Math.min(
    Math.round(screenHeight * (isSmallScreen ? 0.76 : 0.70)),
    520
  );
  const [query, setQuery] = useState('');

  // Reset search when modal opens
  useEffect(() => {
    if (visible) {
      setQuery('');
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.state && s.state.toLowerCase().includes(q))
    );
  }, [stores, query]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <TouchableOpacity
          style={pickerStyles.dismissBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[pickerStyles.card, { width: modalWidth, height: modalHeight }]}>
          {/* Header */}
          <View style={pickerStyles.header}>
            <View
              style={[
                pickerStyles.iconCircle,
                {
                  backgroundColor: Palette.emeraldLight,
                },
              ]}
            >
              <Ionicons
                name="business"
                size={18}
                color={Palette.emerald}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={pickerStyles.title}>{title}</Text>
              <Text style={pickerStyles.sub}>{subtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={Palette.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search if more than 3 stores */}
          {stores.length > 3 && (
            <View style={pickerStyles.searchRow}>
              <Input
                placeholder="Search store name or location..."
                value={query}
                onChangeText={setQuery}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          )}

          {/* List */}
          <ScrollView
            style={pickerStyles.scroll}
            contentContainerStyle={pickerStyles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.map((s) => {
              const isSelected = s.store_id === selectedStoreId;

              return (
                <TouchableOpacity
                  key={s.store_id}
                  style={[
                    pickerStyles.storeItem,
                    isSelected && pickerStyles.storeItemActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => onSelect(s)}
                >
                  <View
                    style={[
                      pickerStyles.itemIconPill,
                      {
                        backgroundColor: isSelected
                          ? Palette.blueSoft
                          : Palette.surfaceLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={18}
                      color={isSelected ? Palette.bluePrimary : Palette.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        pickerStyles.itemStoreName,
                        isSelected && pickerStyles.itemStoreNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {s.name}
                    </Text>
                    <Text style={pickerStyles.itemStoreSub} numberOfLines={1}>
                      {s.address ? `${s.address} • ` : ''}
                      {s.state || 'Active Store'}
                    </Text>
                  </View>

                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color={Palette.bluePrimary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  visible,
  onClose,
  onTransferSuccess,
}) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 600;
  const modalWidth = isSmallScreen
    ? Math.min(Math.round(screenWidth - 16), 500)
    : Math.min(Math.round(screenWidth - 32), 620);
  const modalHeight = Math.min(
    Math.round(screenHeight * (isSmallScreen ? 0.94 : 0.88)),
    720
  );

  const { stores, activeStore, user } = useAuth();
  const [allStores, setAllStores] = useState<Store[]>([]);

  // Fetch available destination stores across the system
  useEffect(() => {
    let isMounted = true;
    if (visible && typeof transferApi.getDestinationStores === 'function') {
      transferApi
        .getDestinationStores()
        .then((fetched) => {
          if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
            setAllStores(fetched);
          }
        })
        .catch(() => {
          // Graceful fallback to auth stores
        });
    }
    return () => {
      isMounted = false;
    };
  }, [visible]);

  const combinedStores = useMemo(() => {
    if (allStores.length > 0) return allStores;
    return stores;
  }, [allStores, stores]);

  // Primary Tabs: 'transfer' | 'history'
  const [activeTab, setActiveTab] = useState<'transfer' | 'history'>('transfer');

  // Stores selection for Transfer (Source is fixed to current active store)
  const [sourceStoreId, setSourceStoreId] = useState<string>('');
  const [destStoreId, setDestStoreId] = useState<string>('');

  // Destination Store Picker Modal State
  const [storePickerVisible, setStorePickerVisible] = useState(false);

  // Source & Dest Products
  const [sourceProducts, setSourceProducts] = useState<Product[]>([]);
  const [destProducts, setDestProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Transfer Items Draft
  const [transferItems, setTransferItems] = useState<TransferItemDraft[]>([]);
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<TransferSuccessInfo | null>(null);

  // Product Selection Modal
  const [productPickerVisible, setProductPickerVisible] = useState(false);

  // History State
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyDirection, setHistoryDirection] = useState<'all' | 'outward' | 'inward'>('all');
  const [historyStoreFilter, setHistoryStoreFilter] = useState<string>(activeStore?.store_id || '');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Initialize store defaults
  useEffect(() => {
    if (visible && combinedStores.length > 0) {
      const defaultSource = activeStore?.store_id || combinedStores[0].store_id;
      setSourceStoreId(defaultSource);
      setHistoryStoreFilter(defaultSource);

      const defaultDest = combinedStores.find((s) => s.store_id !== defaultSource)?.store_id || '';
      setDestStoreId((prev) => (prev && prev !== defaultSource && combinedStores.some((s) => s.store_id === prev) ? prev : defaultDest));

      setTransferItems([]);
      setTransferNotes('');
      setStorePickerVisible(false);
    }
  }, [visible, activeStore?.store_id, combinedStores]);

  // Fetch Source store products when sourceStoreId changes
  useEffect(() => {
    if (!visible || !sourceStoreId) return;
    let isMounted = true;
    setIsLoadingProducts(true);

    inventoryApi
      .listProducts({ store_id: sourceStoreId })
      .then((prods) => {
        if (isMounted) {
          setSourceProducts(prods || []);
        }
      })
      .catch((err) => {
        console.warn('Failed to load source store products:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingProducts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, sourceStoreId]);

  // Fetch Destination store products to detect existing matches vs auto-creation
  useEffect(() => {
    if (!visible || !destStoreId) {
      setDestProducts([]);
      return;
    }
    let isMounted = true;

    inventoryApi
      .listProducts({ store_id: destStoreId })
      .then((prods) => {
        if (isMounted) {
          setDestProducts(prods || []);
        }
      })
      .catch((err) => {
        console.warn('Failed to load destination store products:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, destStoreId]);

  // Fetch Transfer History strictly scoped to selected store
  const loadHistory = useCallback(() => {
    if (!visible) return;
    setIsLoadingHistory(true);

    const targetStoreId = historyStoreFilter || activeStore?.store_id;

    const params: {
      direction?: 'all' | 'outward' | 'inward';
      store_id?: string;
      search?: string;
    } = {
      direction: historyDirection,
    };

    if (targetStoreId && targetStoreId !== 'all') {
      params.store_id = targetStoreId;
    }
    if (historySearch.trim()) {
      params.search = historySearch.trim();
    }

    transferApi
      .listTransfers(params)
      .then((data) => {
        setTransfers(data || []);
      })
      .catch((err) => {
        console.warn('Failed to load transfer history:', err);
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [visible, historyDirection, historyStoreFilter, historySearch, activeStore?.store_id]);

  useEffect(() => {
    if (visible && activeTab === 'history') {
      loadHistory();
    }
  }, [visible, activeTab, loadHistory]);



  // Helper to check if a source product matches an existing product in destination store
  const getDestMatch = (srcProd: Product): Product | null => {
    if (!destProducts || destProducts.length === 0) return null;
    const barcode = (srcProd.barcode || '').trim().toLowerCase();
    if (barcode) {
      const matchBarcode = destProducts.find(
        (p) => (p.barcode || '').trim().toLowerCase() === barcode
      );
      if (matchBarcode) return matchBarcode;
    }
    const name = (srcProd.name || '').trim().toLowerCase();
    return destProducts.find((p) => (p.name || '').trim().toLowerCase() === name) || null;
  };

  // Add product to transfer list
  const handleSelectProduct = (product: Product) => {
    setProductPickerVisible(false);
    const existingIndex = transferItems.findIndex((it) => it.product.product_id === product.product_id);
    if (existingIndex >= 0) {
      Alert.alert('Product Already Added', `'${product.name}' is already in your transfer list.`);
      return;
    }

    const available = Number(product.total_current_stock) || 0;
    const initialQty = available >= 1 ? '1' : available > 0 ? String(available) : '0';

    setTransferItems((prev) => [
      ...prev,
      {
        product,
        quantity: initialQty,
      },
    ]);
  };

  const updateItemQuantity = (index: number, newQty: string) => {
    setTransferItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setTransferItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Totals
  const totalItemsCount = transferItems.length;
  const totalQuantity = useMemo(() => {
    return transferItems.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      return sum + q;
    }, 0);
  }, [transferItems]);

  // Validation
  const canTransfer = useMemo(() => {
    if (!sourceStoreId || !destStoreId || sourceStoreId === destStoreId) return false;
    if (transferItems.length === 0) return false;
    for (const item of transferItems) {
      const q = parseFloat(item.quantity);
      const available = Number(item.product.total_current_stock) || 0;
      if (isNaN(q) || q <= 0 || q > available) {
        return false;
      }
    }
    return true;
  }, [sourceStoreId, destStoreId, transferItems]);

  // Handle Transfer Submission
  const handleSubmitTransfer = async () => {
    if (!canTransfer) return;
    setIsSubmitting(true);
    try {
      const payload: StockTransferCreateRequest = {
        source_store_id: sourceStoreId,
        destination_store_id: destStoreId,
        notes: transferNotes.trim() || null,
        items: transferItems.map((it) => ({
          product_id: it.product.product_id,
          quantity: it.quantity,
        })),
      };

      const result = await transferApi.transferStock(payload);

      setSuccessFeedback({
        transferNumber: result.transfer_number,
        sourceStoreName: result.source_store_name,
        destStoreName: result.destination_store_name,
        totalItems: result.total_items,
        totalQuantity: Number(result.total_quantity) || 0,
      });

      // Refresh source & destination product caches
      inventoryApi.listProducts({ store_id: sourceStoreId }).then(setSourceProducts).catch(() => {});
      if (destStoreId) {
        inventoryApi.listProducts({ store_id: destStoreId }).then(setDestProducts).catch(() => {});
      }
      onTransferSuccess?.();
    } catch (err: unknown) {
      showErrorAlert(err, 'Transfer Failed', 'Could not process the stock transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceStore = combinedStores.find((s) => s.store_id === sourceStoreId);
  const destStore = combinedStores.find((s) => s.store_id === destStoreId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalCard, { width: modalWidth, height: modalHeight }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="swap-horizontal" size={20} color={Palette.bluePrimary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.headerTitle}>Inter-Store Stock Transfer</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'transfer' && styles.tabButtonActive]}
                onPress={() => setActiveTab('transfer')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={15}
                  color={activeTab === 'transfer' ? Palette.bluePrimary : Palette.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === 'transfer' && styles.tabTextActive]}>
                  New Transfer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
                onPress={() => setActiveTab('history')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={activeTab === 'history' ? Palette.bluePrimary : Palette.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                  Transfer History & Logs
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Body Container with flex: 1 for robust scrolling */}
          <View style={styles.modalBodyContainer}>
            {activeTab === 'transfer' ? (
              combinedStores.length < 2 ? (
                <View style={styles.insufficientStoresContainer}>
                  <View style={styles.insufficientIconCircle}>
                    <Ionicons name="storefront-outline" size={36} color={Palette.amber} />
                  </View>
                  <Text style={styles.insufficientTitle}>At Least 2 Stores Required</Text>
                  <Text style={styles.insufficientDesc}>
                    Inter-store stock transfer requires at least two active stores in the system.
                    Please create or join another store in Store Management to enable this feature.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.bodyScroll}
                  contentContainerStyle={styles.bodyContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Destination Store Selector */}
                  <View style={styles.destStoreSection}>
                    <Text style={styles.destStoreSectionLabel}>TRANSFER TO (DESTINATION STORE)</Text>
                    <TouchableOpacity
                      style={styles.destStoreTrigger}
                      activeOpacity={0.7}
                      onPress={() => setStorePickerVisible(true)}
                    >
                      <View style={styles.destStoreIconBox}>
                        <Ionicons name="business" size={20} color={Palette.bluePrimary} />
                      </View>
                      <View style={{ flex: 1, marginHorizontal: 12 }}>
                        <Text style={styles.destStoreName} numberOfLines={1}>
                          {destStore?.name || 'Select Destination Store'}
                        </Text>
                        <Text style={styles.destStoreSub} numberOfLines={1}>
                          {destStore
                            ? `Transferring from: ${sourceStore?.name || 'Current Store'}`
                            : 'Tap here to choose destination store'}
                        </Text>
                      </View>
                      <View style={styles.destStoreChangePill}>
                        <Text style={styles.destStoreChangeText}>{destStore ? 'Change' : 'Select'}</Text>
                        <Ionicons name="chevron-forward" size={14} color={Palette.bluePrimary} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Section Header */}
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.sectionTitle}>Products to Transfer</Text>
                        <Badge
                          label={`${transferItems.length}`}
                          variant={transferItems.length > 0 ? 'primary' : 'neutral'}
                          size="sm"
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.addProductBtn,
                        (isLoadingProducts || sourceProducts.length === 0) && styles.btnDisabled,
                      ]}
                      activeOpacity={0.8}
                      disabled={isLoadingProducts || sourceProducts.length === 0}
                      onPress={() => setProductPickerVisible(true)}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.addProductBtnText}>Add Product</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Loading / Empty State / Items List */}
                  {isLoadingProducts ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={Palette.bluePrimary} />
                      <Text style={styles.loadingText}>Loading products from {sourceStore?.name}...</Text>
                    </View>
                  ) : transferItems.length === 0 ? (
                    <TouchableOpacity
                      style={styles.emptyAddBox}
                      onPress={() => setProductPickerVisible(true)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.emptyAddIconCircle}>
                        <Ionicons name="add" size={26} color={Palette.bluePrimary} />
                      </View>
                      <Text style={styles.emptyAddTitle}>No Products Selected</Text>
                      <Text style={styles.emptyAddSubtitle}>
                        Tap here or click '+ Add Product' to select items from '{sourceStore?.name || 'Source Store'}'.
                      </Text>
                      <View style={styles.browsePill}>
                        <Ionicons name="search" size={13} color={Palette.bluePrimary} />
                        <Text style={styles.browsePillText}>Browse Source Catalog</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.itemsList}>
                      {transferItems.map((item, index) => {
                        const available = Number(item.product.total_current_stock) || 0;
                        const entered = parseFloat(item.quantity) || 0;
                        const isOverStock = entered > available;
                        const isZeroOrLess = entered <= 0;
                        const destMatch = getDestMatch(item.product);

                        return (
                          <View key={item.product.product_id} style={styles.itemCard}>
                            {/* Item Card Header */}
                            <View style={styles.itemCardHeader}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.itemProductName}>{item.product.name}</Text>
                                <View style={styles.itemMetaRow}>
                                  <Badge label={item.product.category || 'General'} variant="neutral" size="sm" />
                                  <Text style={styles.itemMetaText}>
                                    Unit: <Text style={{ fontWeight: '700', color: Palette.navyPrimary }}>{item.product.default_unit}</Text>
                                  </Text>
                                  <Text style={styles.itemMetaText}>
                                    Stock: <Text style={{ fontWeight: '700', color: available > 0 ? Palette.emeraldDark : Palette.rose }}>
                                      {available} {item.product.default_unit}
                                    </Text>
                                  </Text>
                                </View>
                              </View>

                              <TouchableOpacity
                                onPress={() => removeItem(index)}
                                style={styles.removeItemBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="trash-outline" size={17} color={Palette.rose} />
                              </TouchableOpacity>
                            </View>

                            {/* Destination Match Banner */}
                            <View style={[styles.destMatchBanner, destMatch ? styles.matchBannerExisting : styles.matchBannerAutoCreate]}>
                              {destMatch ? (
                                <>
                                  <Ionicons name="checkmark-circle" size={14} color={Palette.emerald} />
                                  <Text style={styles.destMatchTextExisting}>
                                    Exists in destination • Stock will be added to it
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <Ionicons name="sparkles" size={14} color={Palette.purple} />
                                  <Text style={styles.destMatchTextAutoCreate}>
                                    Missing in destination • Will be auto-created on transfer!
                                  </Text>
                                </>
                              )}
                            </View>

                            {/* Quantity Controls Row */}
                            <View style={styles.quantityRow}>
                              <Text style={styles.quantityLabel}>Transfer Amount:</Text>
                              <View style={styles.stepperContainer}>
                                <TouchableOpacity
                                  style={styles.stepBtn}
                                  onPress={() => {
                                    const currentVal = parseFloat(item.quantity) || 0;
                                    const nextVal = Math.max(0, currentVal - 1);
                                    updateItemQuantity(index, String(nextVal));
                                  }}
                                >
                                  <Ionicons name="remove" size={16} color={Palette.navyPrimary} />
                                </TouchableOpacity>

                                <Input
                                  containerStyle={styles.qtyInputContainer}
                                  inputStyle={styles.qtyInput}
                                  keyboardType="numeric"
                                  value={item.quantity}
                                  onChangeText={(text) => updateItemQuantity(index, text)}
                                  placeholder="0.00"
                                />

                                <TouchableOpacity
                                  style={styles.stepBtn}
                                  onPress={() => {
                                    const currentVal = parseFloat(item.quantity) || 0;
                                    const nextVal = Math.min(available, currentVal + 1);
                                    updateItemQuantity(index, String(nextVal));
                                  }}
                                >
                                  <Ionicons name="add" size={16} color={Palette.navyPrimary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.maxBtn}
                                  onPress={() => updateItemQuantity(index, String(available))}
                                >
                                  <Text style={styles.maxBtnText}>MAX</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Validation Warnings */}
                            {isOverStock && (
                              <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={14} color={Palette.rose} />
                                <Text style={styles.errorText}>
                                  Exceeds available stock ({available} {item.product.default_unit}).
                                </Text>
                              </View>
                            )}
                            {isZeroOrLess && (
                              <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={14} color={Palette.rose} />
                                <Text style={styles.errorText}>Quantity must be greater than zero.</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Transfer Notes */}
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Transfer Reason / Notes (Optional)</Text>
                    <Input
                      placeholder="e.g. Branch replenishment, restocking high-demand items..."
                      value={transferNotes}
                      onChangeText={setTransferNotes}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>

                  {/* Summary Card & Confirmation */}
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>TRANSFER SUMMARY</Text>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Line Items:</Text>
                      <Text style={styles.summaryValue}>{totalItemsCount} product{totalItemsCount === 1 ? '' : 's'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Quantity to Move:</Text>
                      <Text style={[styles.summaryValue, { color: Palette.bluePrimary, fontWeight: '800' }]}>
                        {totalQuantity.toFixed(3)} units
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Initiated By:</Text>
                      <Text style={styles.summaryValue}>{user?.name || 'Administrator'}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.confirmTransferBtn,
                        (!canTransfer || isSubmitting) && styles.confirmBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                      disabled={!canTransfer || isSubmitting}
                      onPress={handleSubmitTransfer}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
                          <Text style={styles.confirmTransferBtnText}>
                            {canTransfer ? `Confirm & Transfer (${totalItemsCount} Items)` : 'Confirm & Transfer Stock'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )
            ) : (
              /* History & Inward/Outward Logs View */
              <View style={styles.historyContainer}>
                {/* History Filter Bar */}
                <View style={styles.historyFilterBar}>
                  {/* Active Store Scope Indicator */}
                  <View style={styles.storeScopeBanner}>
                    <Ionicons name="storefront" size={15} color={Palette.bluePrimary} />
                    <Text style={styles.storeScopeText}>
                      Store: <Text style={styles.storeScopeStoreName}>{activeStore?.name || 'Selected Store'}</Text>
                    </Text>
                  </View>

                  {/* Direction Filter Pills */}
                  <View style={styles.directionPills}>
                    {(['all', 'outward', 'inward'] as const).map((dir) => (
                      <TouchableOpacity
                        key={dir}
                        style={[
                          styles.dirPill,
                          historyDirection === dir && styles.dirPillActive,
                        ]}
                        onPress={() => setHistoryDirection(dir)}
                      >
                        <Text
                          style={[
                            styles.dirPillText,
                            historyDirection === dir && styles.dirPillActive && styles.dirPillTextActive,
                          ]}
                        >
                          {dir === 'all'
                            ? 'All Transfers'
                            : dir === 'outward'
                            ? 'Outward (Sent)'
                            : 'Inward (Received)'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Search Bar & Refresh Button */}
                  <View style={styles.historySearchRow}>
                    <View style={{ flex: 1 }}>
                      <Input
                        placeholder="Search TRF#, product or store..."
                        value={historySearch}
                        onChangeText={setHistorySearch}
                        containerStyle={{ marginBottom: 0 }}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.refreshBtn}
                      onPress={loadHistory}
                      disabled={isLoadingHistory}
                    >
                      <Ionicons name="refresh" size={18} color={Palette.bluePrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* History List */}
                {isLoadingHistory ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Palette.bluePrimary} />
                    <Text style={styles.loadingText}>Fetching transfer history...</Text>
                  </View>
                ) : transfers.length === 0 ? (
                  <View style={styles.emptyHistoryBox}>
                    <View style={styles.emptyAddIconCircle}>
                      <Ionicons name="file-tray-outline" size={32} color={Palette.textMuted} />
                    </View>
                    <Text style={styles.emptyHistoryTitle}>No Transfers Found</Text>
                    <Text style={styles.emptyHistorySubtitle}>
                      {historyDirection === 'outward'
                        ? `No outward stock sent from ${activeStore?.name || 'this store'}.`
                        : historyDirection === 'inward'
                        ? `No inward stock received into ${activeStore?.name || 'this store'}.`
                        : `No stock transfers recorded for ${activeStore?.name || 'this store'}.`}
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.historyListScroll}
                    contentContainerStyle={styles.historyListContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {transfers.map((trf) => (
                      <View key={trf.transfer_id} style={styles.transferHistoryCard}>
                        {/* Top Header */}
                        <View style={styles.trfHeaderRow}>
                          <Text style={styles.trfNumber}>{trf.transfer_number}</Text>
                          <Text style={styles.trfDate}>
                            {new Date(trf.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>

                        {/* Store Context (Inward / Outward) */}
                        {(() => {
                          const currentId = historyStoreFilter || activeStore?.store_id;
                          const isOutward = trf.source_store_id === currentId;
                          const isInward = trf.destination_store_id === currentId;

                          return (
                            <View style={styles.trfPerspectiveRow}>
                              {isOutward ? (
                                <View style={styles.outwardPerspectiveBadge}>
                                  <Ionicons name="arrow-up-circle" size={13} color={Palette.rose} />
                                  <Text style={styles.outwardPerspectiveText}>
                                    Sent Out to: <Text style={{ fontWeight: '700' }}>{trf.destination_store_name}</Text>
                                  </Text>
                                </View>
                              ) : isInward ? (
                                <View style={styles.inwardPerspectiveBadge}>
                                  <Ionicons name="arrow-down-circle" size={13} color={Palette.emerald} />
                                  <Text style={styles.inwardPerspectiveText}>
                                    Received from: <Text style={{ fontWeight: '700' }}>{trf.source_store_name}</Text>
                                  </Text>
                                </View>
                              ) : (
                                <View style={styles.neutralPerspectiveBadge}>
                                  <Ionicons name="swap-horizontal" size={13} color={Palette.bluePrimary} />
                                  <Text style={styles.neutralPerspectiveText}>
                                    {trf.source_store_name} to {trf.destination_store_name}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })()}

                        {/* Items */}
                        <View style={styles.trfItemsContainer}>
                          <Text style={styles.trfItemsSectionLabel}>Transferred Products:</Text>
                          {(trf.items || []).map((it) => (
                            <View key={it.item_id} style={styles.trfItemRow}>
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.trfItemName}>• {it.product_name}</Text>
                                {it.auto_created_product && (
                                  <Badge label="Auto-Created in Dest" variant="purple" size="sm" />
                                )}
                              </View>
                              <Text style={styles.trfItemQty}>
                                {Number(it.quantity).toFixed(2)} {it.unit}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* Footer */}
                        <View style={styles.trfFooterRow}>
                          <Text style={styles.trfAdminName}>
                            Transferred By: <Text style={{ fontWeight: '700', color: Palette.navyPrimary }}>{trf.transferred_by_name}</Text>
                          </Text>
                          <Text style={styles.trfTotalSummary}>
                            {Number(trf.total_quantity).toFixed(2)} units ({trf.total_items} items)
                          </Text>
                        </View>

                        {trf.notes ? (
                          <View style={styles.trfNotesBox}>
                            <Text style={styles.trfNotesText}>Note: "{trf.notes}"</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Searchable Product Picker Modal */}
          <SearchableProductModal
            visible={productPickerVisible}
            products={sourceProducts}
            onSelect={handleSelectProduct}
            onClose={() => setProductPickerVisible(false)}
            title={`Select Products from '${sourceStore?.name || 'Source Store'}'`}
          />

          {/* Dedicated Destination Store Picker Modal */}
          <StorePickerModal
            visible={storePickerVisible}
            title="Select Destination Store"
            subtitle="Choose the store receiving inward stock"
            stores={combinedStores.filter((s) => s.store_id !== sourceStoreId)}
            selectedStoreId={destStoreId}
            onSelect={(selectedStore) => {
              setDestStoreId(selectedStore.store_id);
              setStorePickerVisible(false);
            }}
            onClose={() => setStorePickerVisible(false)}
          />

          {/* Modern In-App Success Feedback Modal */}
          {successFeedback && (
            <SuccessModal
              visible={!!successFeedback}
              title="Stock Transferred!"
              badgeText={successFeedback.transferNumber}
              message={`${successFeedback.totalItems} product${successFeedback.totalItems > 1 ? 's' : ''} sent from '${successFeedback.sourceStoreName}' to '${successFeedback.destStoreName}'. Stock readjusted successfully.`}
              details={[
                { label: 'Transfer Ref', value: successFeedback.transferNumber },
                { label: 'Sent From', value: successFeedback.sourceStoreName },
                { label: 'Transferred To', value: successFeedback.destStoreName },
                {
                  label: 'Total Quantity',
                  value: `${successFeedback.totalItems} item(s) • ${successFeedback.totalQuantity.toFixed(2)} units`,
                },
              ]}
              secondaryButtonText="View History"
              onSecondaryAction={() => {
                setSuccessFeedback(null);
                setTransferItems([]);
                setTransferNotes('');
                setActiveTab('history');
                loadHistory();
              }}
              primaryButtonText="Done"
              onClose={() => {
                setSuccessFeedback(null);
                setTransferItems([]);
                setTransferNotes('');
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 17, 32, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  modalBodyContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
    backgroundColor: '#FFFFFF',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceMuted,
    borderRadius: 10,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabButtonActive: {
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
  insufficientStoresContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  insufficientIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  insufficientTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  insufficientDesc: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    maxWidth: 380,
  },
  bodyScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 28,
  },
  destStoreSection: {
    marginBottom: 16,
  },
  destStoreSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  destStoreTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    padding: 12,
    ...Shadows.sm,
  },
  destStoreIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destStoreName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  destStoreSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  destStoreChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  destStoreChangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    ...Shadows.sm,
  },
  addProductBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  emptyAddBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceLight,
    marginBottom: 16,
  },
  emptyAddIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyAddTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  emptyAddSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 3,
    maxWidth: 280,
    lineHeight: 16,
  },
  browsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 10,
    ...Shadows.sm,
  },
  browsePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  itemsList: {
    gap: 10,
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    padding: 12,
    ...Shadows.sm,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemProductName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  itemMetaText: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  removeItemBtn: {
    padding: 4,
  },
  destMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  matchBannerExisting: {
    backgroundColor: Palette.emeraldLight,
  },
  matchBannerAutoCreate: {
    backgroundColor: Palette.purpleLight,
  },
  destMatchTextExisting: {
    fontSize: 11,
    color: Palette.emeraldDark,
    fontWeight: '600',
  },
  destMatchTextAutoCreate: {
    fontSize: 11,
    color: Palette.purple,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.surfaceMuted,
  },
  quantityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInputContainer: {
    width: 65,
    marginBottom: 0,
  },
  qtyInput: {
    height: 32,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  maxBtn: {
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
  },
  maxBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.bluePrimary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    padding: 6,
    backgroundColor: Palette.roseLight,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 11,
    color: Palette.rose,
    fontWeight: '600',
  },
  notesSection: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 6,
  },
  summaryCard: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    padding: 14,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  summaryValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.navyPrimary,
  },
  confirmTransferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
    ...Shadows.md,
  },
  confirmBtnDisabled: {
    backgroundColor: Palette.borderDark,
    opacity: 0.6,
  },
  confirmTransferBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  historyFilterBar: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
    backgroundColor: Palette.surfaceLight,
    gap: 10,
  },
  storeScopeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Palette.blueSoft,
  },
  storeScopeText: {
    fontSize: 12,
    color: Palette.navyPrimary,
  },
  storeScopeStoreName: {
    fontWeight: '800',
    color: Palette.bluePrimary,
  },
  directionPills: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dirPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: Palette.surfaceMuted,
  },
  dirPillActive: {
    backgroundColor: Palette.bluePrimary,
  },
  dirPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  dirPillTextActive: {
    color: '#FFFFFF',
  },
  historySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyHistoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.navyPrimary,
    marginTop: 8,
  },
  emptyHistorySubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  historyListScroll: {
    flex: 1,
  },
  historyListContent: {
    padding: 14,
    gap: 10,
  },
  transferHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },
  trfHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trfNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  trfDate: {
    fontSize: 11.5,
    color: Palette.textMuted,
  },
  trfPerspectiveRow: {
    marginBottom: 8,
  },
  outwardPerspectiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  outwardPerspectiveText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.rose,
  },
  inwardPerspectiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  inwardPerspectiveText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.emerald,
  },
  neutralPerspectiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  neutralPerspectiveText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.bluePrimary,
  },
  trfItemsContainer: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceMuted,
  },
  trfItemsSectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  trfItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  trfItemName: {
    fontSize: 12.5,
    color: Palette.navyPrimary,
    fontWeight: '600',
  },
  trfItemQty: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Palette.bluePrimary,
  },
  trfFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  trfAdminName: {
    fontSize: 11.5,
    color: Palette.textSecondary,
  },
  trfTotalSummary: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.navyPrimary,
  },
  trfNotesBox: {
    marginTop: 6,
    padding: 6,
    backgroundColor: Palette.surfaceLight,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: Palette.bluePrimary,
  },
  trfNotesText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: Palette.textSecondary,
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 17, 32, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  dismissBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
    backgroundColor: '#FFFFFF',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  sub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  searchRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    padding: 14,
    gap: 8,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
  },
  storeItemActive: {
    borderColor: Palette.bluePrimary,
    backgroundColor: Palette.blueSoft,
  },
  storeItemDisabled: {
    opacity: 0.5,
    backgroundColor: Palette.surfaceLight,
  },
  itemIconPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemStoreName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.navyPrimary,
  },
  itemStoreNameActive: {
    color: Palette.bluePrimary,
    fontWeight: '800',
  },
  itemStoreSub: {
    fontSize: 10.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },
});
