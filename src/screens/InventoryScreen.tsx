import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import {
  Product,
  Batch,
  ProductCreateRequest,
  BatchReceiveSingleRequest,
  BatchReceiveBulkRequest,
} from '@/types/api';
import { inventoryApi } from '@/services/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { useInventoryCatalog } from '@/hooks/inventory/useInventoryCatalog';
import { InventoryProductCard } from '@/components/inventory/InventoryProductCard';
import { CreateProductModal } from '@/components/inventory/CreateProductModal';
import { ReceiveStockModal } from '@/components/inventory/ReceiveStockModal';
import { BatchInspectionModal } from '@/components/inventory/BatchInspectionModal';
import { InventorySkeleton } from '@/components/ui/Skeleton';
import { useNetworkStatus } from '@/context/NetworkContext';
import { showErrorAlert, logError } from '@/utils/errorHandler';

export const InventoryScreen: React.FC = () => {
  const { activeStore } = useAuth();
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;

  const {
    products,
    search,
    setSearch,
    isLoading,
    existingCategoryStats,
    filteredProducts,
    loadCatalog,
  } = useInventoryCatalog();

  // Auto-reload inventory when connection is restored
  useEffect(() => {
    if (!isOffline && products.length === 0 && !isLoading) {
      void loadCatalog(false);
    }
  }, [isOffline]);

  // Modals
  const [createProductModalVisible, setCreateProductModalVisible] = useState(false);
  const [receiveStockModalVisible, setReceiveStockModalVisible] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Product Batches Inspection
  const [selectedProductForBatches, setSelectedProductForBatches] = useState<Product | null>(null);
  const [productBatches, setProductBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  // Create Product Submit Handler
  const handleCreateProduct = async (payload: ProductCreateRequest) => {
    setIsSubmittingProduct(true);
    try {
      await inventoryApi.createProduct({
        ...payload,
        store_id: activeStore?.store_id,
      });

      setCreateProductModalVisible(false);
      void loadCatalog(false);
    } catch (err: unknown) {
      showErrorAlert(err, 'Product Error', 'Failed to add product.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Receive Single Stock Submit Handler
  const handleReceiveSingleStock = async (payload: BatchReceiveSingleRequest) => {
    setIsSubmittingSingle(true);
    try {
      await inventoryApi.receiveSingleBatch({
        ...payload,
        store_id: activeStore?.store_id,
      });

      setReceiveStockModalVisible(false);
      void loadCatalog(false);
    } catch (err: unknown) {
      showErrorAlert(err, 'Stock Error', 'Failed to add stock.');
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // Receive Bulk Consignment Submit Handler
  const handleReceiveBulkConsignment = async (payload: BatchReceiveBulkRequest) => {
    setIsSubmittingBulk(true);
    try {
      await inventoryApi.receiveBulkBatches({
        ...payload,
        store_id: activeStore?.store_id,
      });

      setReceiveStockModalVisible(false);
      void loadCatalog(false);
    } catch (err: unknown) {
      showErrorAlert(err, 'Stock Error', 'Failed to add stock items.');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Inspect Product Batches
  const viewProductBatches = useCallback(async (product: Product) => {
    setSelectedProductForBatches(product);
    setIsLoadingBatches(true);
    try {
      const batches = await inventoryApi.listBatches({
        productId: product.product_id,
        onlyActive: false,
      });
      setProductBatches(batches);
    } catch (err: unknown) {
      logError('InventoryScreen:viewProductBatches', err);
    } finally {
      setIsLoadingBatches(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Top Header Actions Bar */}
      <View style={styles.topHeaderBar}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.screenHeaderTitle}>Inventory</Text>
          <Text style={styles.screenHeaderSub} numberOfLines={1}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.receiveBtn}
            activeOpacity={0.8}
            onPress={() => setReceiveStockModalVisible(true)}
          >
            <Ionicons name="archive-outline" size={15} color="#FFFFFF" />
            <Text style={styles.receiveBtnText}>Receive Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.8}
            onPress={() => setCreateProductModalVisible(true)}
          >
            <Ionicons name="add" size={17} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Full-width Responsive Search Bar */}
      <View style={styles.searchBarSection}>
        <View style={styles.searchInputBox}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Palette.textSecondary}
            style={{ marginRight: 8, flexShrink: 0 }}
          />
          <TextInput
            placeholder="Search products or category..."
            placeholderTextColor={Palette.textMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchTextInput}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ flexShrink: 0 }}
            >
              <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Catalog List */}
      {isLoading ? (
        <InventorySkeleton itemCount={6} />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cube-outline" size={48} color={Palette.textMuted} />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>
            {search ? 'No products match your search.' : 'Tap "Add" above to create your first product.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.product_id}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <InventoryProductCard
              item={item}
              onPress={viewProductBatches}
            />
          )}
        />
      )}

      {/* Product Batches Detail Drawer */}
      <BatchInspectionModal
        product={selectedProductForBatches}
        batches={productBatches}
        isLoading={isLoadingBatches}
        safeTop={safeTop}
        onClose={() => setSelectedProductForBatches(null)}
      />

      {/* Register New Product Modal */}
      <CreateProductModal
        visible={createProductModalVisible}
        existingCategoryStats={existingCategoryStats}
        isSubmitting={isSubmittingProduct}
        onClose={() => setCreateProductModalVisible(false)}
        onSubmit={handleCreateProduct}
      />

      {/* Receive Stock Inward Modal */}
      <ReceiveStockModal
        visible={receiveStockModalVisible}
        products={products}
        storeName={activeStore?.name}
        storeId={activeStore?.store_id}
        isSubmittingSingle={isSubmittingSingle}
        isSubmittingBulk={isSubmittingBulk}
        onClose={() => setReceiveStockModalVisible(false)}
        onSubmitSingle={handleReceiveSingleStock}
        onSubmitBulk={handleReceiveBulkConsignment}
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
  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
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
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  receiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.emerald,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  receiveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  searchBarSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    overflow: 'hidden',
  },
  searchTextInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: Palette.textPrimary,
    paddingVertical: 0,
    height: '100%',
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
    fontWeight: '700',
    color: Palette.navyPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
});
