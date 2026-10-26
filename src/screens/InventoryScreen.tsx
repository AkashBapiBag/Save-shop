import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { Palette } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { useInventoryCatalog } from '@/hooks/inventory/useInventoryCatalog';
import { InventoryProductCard } from '@/components/inventory/InventoryProductCard';
import { CreateProductModal } from '@/components/inventory/CreateProductModal';
import { ReceiveStockModal } from '@/components/inventory/ReceiveStockModal';
import { BatchInspectionModal } from '@/components/inventory/BatchInspectionModal';
import { showErrorAlert, logError } from '@/utils/errorHandler';

export const InventoryScreen: React.FC = () => {
  const { activeStore } = useAuth();
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

      Alert.alert(
        'Success',
        `Product '${payload.name}' in category '${payload.category}' registered successfully.`
      );
      setCreateProductModalVisible(false);
      void loadCatalog(false);
    } catch (err: unknown) {
      showErrorAlert(err, 'Registration Error', 'Failed to create product.');
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

      Alert.alert(
        'Stock Inward Confirmed',
        `Added ${payload.quantity} units to lot '${payload.batch_identifier}'.`
      );
      setReceiveStockModalVisible(false);
      void loadCatalog(false);
    } catch (err: unknown) {
      showErrorAlert(err, 'Receiving Error', 'Failed to receive stock.');
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

      const totalQty = payload.batches.reduce((acc, curr) => acc + Number(curr.quantity), 0);
      Alert.alert(
        'Consignment Received Successfully',
        `Ingested ${payload.batches.length} products (${totalQty} total units) into active inventory.`
      );

      setReceiveStockModalVisible(false);
      void loadCatalog(false);
    } catch (err: unknown) {
      showErrorAlert(err, 'Bulk Inward Error', 'Failed to process bulk stock ingestion.');
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
      {/* Top Header Actions */}
      <View style={styles.topActionsBar}>
        <Input
          placeholder="Filter catalog by name or category..."
          value={search}
          onChangeText={setSearch}
          containerStyle={{ flex: 1, marginBottom: 0, marginRight: 10 }}
          icon={<Ionicons name="search-outline" size={18} color={Palette.textSecondary} />}
          rightElement={
            search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
              </TouchableOpacity>
            ) : null
          }
        />

        <TouchableOpacity
          style={styles.receiveBtn}
          activeOpacity={0.8}
          onPress={() => setReceiveStockModalVisible(true)}
        >
          <Ionicons name="archive-outline" size={17} color="#FFFFFF" />
          <Text style={styles.receiveBtnText}>Receive Stock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.8}
          onPress={() => setCreateProductModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Catalog List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Palette.navyPrimary} />
          <Text style={styles.loadingText}>Fetching inventory catalog...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cube-outline" size={48} color={Palette.textMuted} />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>
            {search ? 'No products match your filter search.' : 'Tap "+" above to register your first product.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.product_id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
  topActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  receiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.emerald,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  receiveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
