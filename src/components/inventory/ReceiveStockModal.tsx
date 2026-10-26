import React, { useState, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, ConsignmentItem, BatchReceiveSingleRequest, BatchReceiveBulkRequest } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  SearchableProductModal,
  ProductSelectTrigger,
} from '@/components/SearchableProductSelect';
import { CalendarModal } from '@/components/ui/CalendarModal';
import {
  getFutureDate,
  generateUniqueBatchLotId,
  generateUniqueConsignmentBatchId,
} from '@/utils/batchIdUtils';

export interface ReceiveStockModalProps {
  visible: boolean;
  products: Product[];
  storeName?: string | null;
  storeId?: string;
  isSubmittingSingle: boolean;
  isSubmittingBulk: boolean;
  onClose: () => void;
  onSubmitSingle: (payload: BatchReceiveSingleRequest) => Promise<void>;
  onSubmitBulk: (payload: BatchReceiveBulkRequest) => Promise<void>;
}

export const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
  visible,
  products,
  storeName,
  storeId,
  isSubmittingSingle,
  isSubmittingBulk,
  onClose,
  onSubmitSingle,
  onSubmitBulk,
}) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const modalHeight = Math.min(Math.round(screenHeight * 0.86), 660);
  const modalWidth = Math.min(Math.round(screenWidth - 32), 480);

  const [receiveMode, setReceiveMode] = useState<'single' | 'bulk'>('single');

  // Single Mode State
  const [singleSelectedProduct, setSingleSelectedProduct] = useState<Product | null>(
    products.length > 0 ? products[0] : null
  );
  const [singleBatchId, setSingleBatchId] = useState(() =>
    generateUniqueBatchLotId(storeName, products[0]?.name)
  );
  const [singleQuantity, setSingleQuantity] = useState('');
  const [singleCostPrice, setSingleCostPrice] = useState('');
  const [singleExpiryDate, setSingleExpiryDate] = useState(() => getFutureDate(90));

  // Bulk Mode State
  const [bulkBatchId, setBulkBatchId] = useState(() =>
    generateUniqueConsignmentBatchId(storeName)
  );
  const [consignmentItems, setConsignmentItems] = useState<ConsignmentItem[]>([]);
  const [isAddingConsignmentItem, setIsAddingConsignmentItem] = useState(false);

  // Adding consignment item form state
  const [tempConsignProduct, setTempConsignProduct] = useState<Product | null>(
    products.length > 0 ? products[0] : null
  );
  const [tempConsignQuantity, setTempConsignQuantity] = useState('');
  const [tempConsignCostPrice, setTempConsignCostPrice] = useState('');
  const [tempConsignExpiryDate, setTempConsignExpiryDate] = useState(() => getFutureDate(90));

  // Dropdown Pickers
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [productPickerTarget, setProductPickerTarget] = useState<'single' | 'consignment'>('single');
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'single' | 'consignment'>('single');

  const startAddConsignmentItem = () => {
    if (products.length === 0) {
      Alert.alert('No Products', 'Please create products in your catalog first.');
      return;
    }
    const defaultProd = tempConsignProduct || products[0];
    setTempConsignProduct(defaultProd);
    setTempConsignQuantity('');
    setTempConsignCostPrice(defaultProd.cost_price ? String(defaultProd.cost_price) : '');
    setTempConsignExpiryDate(getFutureDate(90));
    setIsAddingConsignmentItem(true);
  };

  const handleAddConsignmentItem = () => {
    if (!tempConsignProduct) {
      Alert.alert('Product Required', 'Please choose a product for this delivery item.');
      return;
    }

    const qty = Number(tempConsignQuantity);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a received quantity greater than 0.');
      return;
    }

    const activeBatchId = bulkBatchId.trim() || generateUniqueConsignmentBatchId(storeName);
    if (!bulkBatchId.trim()) {
      setBulkBatchId(activeBatchId);
    }

    if (!tempConsignExpiryDate.trim()) {
      Alert.alert('Expiry Date Required', 'Please select an expiration date.');
      return;
    }

    const newItem: ConsignmentItem = {
      id: `${Date.now()}-${Math.random()}`,
      product: tempConsignProduct,
      batch_identifier: activeBatchId,
      quantity: qty,
      purchase_price: Number(tempConsignCostPrice) || Number(tempConsignProduct.cost_price) || 0,
      expiry_date: tempConsignExpiryDate.trim(),
    };

    setConsignmentItems((prev) => [...prev, newItem]);
    setIsAddingConsignmentItem(false);
  };

  const removeConsignmentItem = (id: string) => {
    setConsignmentItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSingleSubmit = async () => {
    if (!singleSelectedProduct) {
      Alert.alert('Product Required', 'Please select a product to receive stock.');
      return;
    }

    const qty = Number(singleQuantity);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a received quantity greater than 0.');
      return;
    }

    if (!singleBatchId.trim()) {
      Alert.alert('Batch ID Required', 'Please enter or auto-generate a batch identifier.');
      return;
    }

    if (!singleExpiryDate.trim()) {
      Alert.alert('Expiry Date Required', 'Please select an expiration date.');
      return;
    }

    await onSubmitSingle({
      store_id: storeId,
      product_id: singleSelectedProduct.product_id,
      batch_identifier: singleBatchId.trim(),
      quantity: qty,
      purchase_price: Number(singleCostPrice) || Number(singleSelectedProduct.cost_price) || 0,
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_date: singleExpiryDate.trim(),
    });

    setSingleQuantity('');
    setSingleBatchId(generateUniqueBatchLotId(storeName, singleSelectedProduct.name));
  };

  const handleBulkSubmit = async () => {
    if (consignmentItems.length === 0) {
      Alert.alert('Shipment Empty', 'Please add at least one product to the consignment delivery.');
      return;
    }

    const activeBatchId = bulkBatchId.trim() || generateUniqueConsignmentBatchId(storeName);
    const today = new Date().toISOString().split('T')[0];

    await onSubmitBulk({
      store_id: storeId,
      batches: consignmentItems.map((item) => ({
        product_id: item.product.product_id,
        batch_identifier: activeBatchId,
        quantity: Number(item.quantity),
        purchase_price: Number(item.purchase_price) || 0,
        purchase_date: today,
        expiry_date: item.expiry_date.trim(),
      })),
    });

    setConsignmentItems([]);
    setBulkBatchId(generateUniqueConsignmentBatchId(storeName));
    setIsAddingConsignmentItem(false);
  };

  const consignmentTotalUnits = useMemo(
    () => consignmentItems.reduce((sum, item) => sum + item.quantity, 0),
    [consignmentItems]
  );
  const consignmentTotalCost = useMemo(
    () => consignmentItems.reduce((sum, item) => sum + item.quantity * item.purchase_price, 0),
    [consignmentItems]
  );

  const isBulkManifestVisible = receiveMode === 'bulk' && !isAddingConsignmentItem;
  const isBulkAddVisible = receiveMode === 'bulk' && isAddingConsignmentItem;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.receiveModalCard, { width: modalWidth, height: modalHeight }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Receive Stock</Text>
                <Text style={styles.modalSub}>
                  {storeName || 'Active Store'} • Add Stock
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={styles.receiveModeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, receiveMode === 'single' && styles.modeTabActive]}
                onPress={() => {
                  setReceiveMode('single');
                  setIsAddingConsignmentItem(false);
                }}
              >
                <Ionicons
                  name="cube-outline"
                  size={15}
                  color={receiveMode === 'single' ? Palette.bluePrimary : Palette.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.modeTabText, receiveMode === 'single' && styles.modeTabTextActive]}>
                  Single Item
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, receiveMode === 'bulk' && styles.modeTabActive]}
                onPress={() => {
                  setReceiveMode('bulk');
                  if (!bulkBatchId) {
                    setBulkBatchId(generateUniqueConsignmentBatchId(storeName));
                  }
                  setIsAddingConsignmentItem(false);
                }}
              >
                <Ionicons
                  name="layers-outline"
                  size={15}
                  color={receiveMode === 'bulk' ? Palette.bluePrimary : Palette.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.modeTabText, receiveMode === 'bulk' && styles.modeTabTextActive]}>
                  Bulk Delivery ({consignmentItems.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Content Body */}
            <View style={styles.modalBodyContainer}>
              {/* MODE 1: SINGLE PRODUCT INWARD */}
              {receiveMode === 'single' && (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <ProductSelectTrigger
                    label="Product *"
                    product={singleSelectedProduct}
                    onPress={() => {
                      setProductPickerTarget('single');
                      setProductPickerVisible(true);
                    }}
                  />

                  {/* Batch Lot Identifier */}
                  <View style={{ marginBottom: 12 }}>
                    <View style={styles.labelWithActionRow}>
                      <Text style={styles.inputLabel}>Batch Number *</Text>
                      <TouchableOpacity
                        style={styles.autoGenPill}
                        onPress={() => {
                          setSingleBatchId(
                            generateUniqueBatchLotId(storeName, singleSelectedProduct?.name)
                          );
                        }}
                      >
                        <Ionicons name="sparkles-outline" size={12} color={Palette.bluePrimary} />
                        <Text style={styles.autoGenText}>Generate Batch ID</Text>
                      </TouchableOpacity>
                    </View>
                    <Input
                      placeholder="e.g. SAVESHOP-SODA-20261025-023015"
                      value={singleBatchId}
                      onChangeText={setSingleBatchId}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>

                  {/* Quantity and Price */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Input
                      label={`Quantity (${singleSelectedProduct?.default_unit || 'Units'}) *`}
                      placeholder="e.g. 50"
                      value={singleQuantity}
                      onChangeText={setSingleQuantity}
                      keyboardType="numeric"
                      containerStyle={{ flex: 1 }}
                    />
                    <Input
                      label="Purchase Price (₹)"
                      placeholder="0.00"
                      value={singleCostPrice}
                      onChangeText={setSingleCostPrice}
                      keyboardType="numeric"
                      containerStyle={{ flex: 1 }}
                    />
                  </View>

                  {/* Expiry Date with Calendar & Presets */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={styles.labelWithActionRow}>
                      <Text style={styles.inputLabel}>Expiration Date (FEFO) *</Text>
                      <TouchableOpacity
                        style={styles.openCalendarBtn}
                        onPress={() => {
                          setCalendarTarget('single');
                          setCalendarModalVisible(true);
                        }}
                      >
                        <Ionicons name="calendar" size={14} color={Palette.bluePrimary} />
                        <Text style={styles.openCalendarBtnText}>Open Calendar</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.helperText}>First-Expiring-First-Out stock depletion rule</Text>

                    <View style={styles.datePresetsRow}>
                      {[
                        { label: '+30d', days: 30 },
                        { label: '+60d', days: 60 },
                        { label: '+90d', days: 90 },
                        { label: '+6m', days: 180 },
                        { label: '+1y', days: 365 },
                      ].map((preset) => (
                        <TouchableOpacity
                          key={preset.label}
                          style={styles.presetChip}
                          onPress={() => setSingleExpiryDate(getFutureDate(preset.days))}
                        >
                          <Text style={styles.presetChipText}>{preset.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={styles.dateDisplayCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        setCalendarTarget('single');
                        setCalendarModalVisible(true);
                      }}
                    >
                      <View style={styles.dateIconCircle}>
                        <Ionicons name="calendar-outline" size={20} color={Palette.bluePrimary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.dateDisplayTitle}>{singleExpiryDate || 'Select Expiration Date'}</Text>
                        <Text style={styles.dateDisplaySub}>Tap to open visual calendar picker</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={Palette.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Button
                    title="Confirm Single Stock Inward"
                    variant="primary"
                    size="md"
                    loading={isSubmittingSingle}
                    onPress={handleSingleSubmit}
                  />
                </ScrollView>
              )}

              {/* MODE 2: BULK DELIVERY SHIPMENT (MANIFEST VIEW) */}
              {isBulkManifestVisible && (
                <View style={{ flex: 1 }}>
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 12 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.consignmentListHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.consignmentListTitle}>Shipment Delivery Manifest</Text>
                        <Text style={styles.consignmentListSub}>
                          {consignmentItems.length} products arriving in this order
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.addItemBtn} onPress={startAddConsignmentItem}>
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={styles.addItemBtnText}>Add Product</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Shared Consignment Batch Identifier Card */}
                    <View style={styles.sharedBatchCard}>
                      <View style={styles.sharedBatchHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sharedBatchLabel}>Shipment / Delivery Batch # *</Text>
                          <Text style={styles.sharedBatchSub}>
                            Associated with all products in this delivery order
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.autoGenPill}
                          onPress={() => {
                            setBulkBatchId(generateUniqueConsignmentBatchId(storeName));
                          }}
                        >
                          <Ionicons name="sparkles-outline" size={12} color={Palette.bluePrimary} />
                          <Text style={styles.autoGenText}>Auto-Gen</Text>
                        </TouchableOpacity>
                      </View>
                      <Input
                        placeholder="e.g. SAVESHOP-BULK-20261025-023015"
                        value={bulkBatchId}
                        onChangeText={setBulkBatchId}
                        containerStyle={{ marginBottom: 0 }}
                      />
                    </View>

                    {consignmentItems.length === 0 ? (
                      <View style={styles.emptyConsignmentBox}>
                        <View style={styles.emptyIconCircle}>
                          <Ionicons name="cube-outline" size={26} color={Palette.bluePrimary} />
                        </View>
                        <Text style={styles.emptyConsignmentTitle}>No Products in Shipment Yet</Text>
                        <Text style={styles.emptyConsignmentSub}>
                          Delivery batch is set above. Tap &apos;+ Add Product&apos; to start building this delivery manifest.
                        </Text>
                        <TouchableOpacity
                          style={[styles.addItemBtn, { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 }]}
                          onPress={startAddConsignmentItem}
                        >
                          <Ionicons name="add" size={18} color="#FFFFFF" />
                          <Text style={[styles.addItemBtnText, { fontSize: 13 }]}>+ Add First Product</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        {consignmentItems.map((item) => (
                          <View key={item.id} style={styles.consignmentItemCard}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                <Text style={styles.consignItemName}>{item.product.name}</Text>
                                <Badge label={item.product.category} variant="neutral" size="sm" style={{ marginLeft: 8 }} />
                              </View>
                              <Text style={styles.consignItemMeta}>
                                Quantity:{' '}
                                <Text style={{ fontWeight: '800', color: Palette.navyPrimary }}>
                                  {item.quantity} {item.product.default_unit}
                                </Text>
                                {'  '}•{'  '}
                                Cost: ₹{item.purchase_price.toFixed(2)}/unit
                              </Text>
                              <Text style={styles.consignItemMetaSub}>
                                Line Total: ₹{(item.quantity * item.purchase_price).toFixed(2)} • Exp: {item.expiry_date}
                              </Text>
                            </View>

                            <TouchableOpacity
                              onPress={() => removeConsignmentItem(item.id)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              style={styles.deleteLineBtn}
                            >
                              <Ionicons name="trash-outline" size={16} color={Palette.rose} />
                            </TouchableOpacity>
                          </View>
                        ))}

                        <TouchableOpacity
                          style={styles.addMoreBtn}
                          activeOpacity={0.8}
                          onPress={startAddConsignmentItem}
                        >
                          <Ionicons name="add-circle-outline" size={17} color={Palette.bluePrimary} />
                          <Text style={styles.addMoreBtnText}>+ Add Another Product to Delivery</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </ScrollView>

                  {consignmentItems.length > 0 && (
                    <View style={styles.consignmentCardFooter}>
                      <View style={styles.consignmentSummaryBar}>
                        <View>
                          <Text style={styles.summaryLabel}>Total Delivery Items</Text>
                          <Text style={styles.summaryValue}>
                            {consignmentItems.length} Products • {consignmentTotalUnits} Units
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.summaryLabel}>Total Value</Text>
                          <Text style={[styles.summaryValue, { color: Palette.emerald }]}>
                            ₹{consignmentTotalCost.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <Button
                        title={`Receive All (${consignmentItems.length} Products Inward)`}
                        variant="primary"
                        size="md"
                        loading={isSubmittingBulk}
                        onPress={handleBulkSubmit}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* MODE 2: BULK DELIVERY SHIPMENT (ADD PRODUCT VIEW) */}
              {isBulkAddVisible && (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {consignmentItems.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => setIsAddingConsignmentItem(false)}
                      >
                        <Ionicons name="arrow-back" size={16} color={Palette.navyPrimary} />
                        <Text style={styles.backBtnText}>View Manifest ({consignmentItems.length} items)</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.cardHeaderTitle}>
                      {consignmentItems.length === 0
                        ? 'Bulk Delivery (Add First Item)'
                        : `Add Item #${consignmentItems.length + 1} to Delivery`}
                    </Text>
                    <Text style={styles.cardHeaderSub}>
                      Specify product details for this shipment delivery item
                    </Text>
                  </View>

                  <ProductSelectTrigger
                    label="Product *"
                    product={tempConsignProduct}
                    onPress={() => {
                      setProductPickerTarget('consignment');
                      setProductPickerVisible(true);
                    }}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Input
                      label={`Quantity (${tempConsignProduct?.default_unit || 'Units'}) *`}
                      placeholder="e.g. 50"
                      value={tempConsignQuantity}
                      onChangeText={setTempConsignQuantity}
                      keyboardType="numeric"
                      containerStyle={{ flex: 1 }}
                    />
                    <Input
                      label="Purchase Price (₹)"
                      placeholder="0.00"
                      value={tempConsignCostPrice}
                      onChangeText={setTempConsignCostPrice}
                      keyboardType="numeric"
                      containerStyle={{ flex: 1 }}
                    />
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <View style={styles.labelWithActionRow}>
                      <Text style={styles.inputLabel}>Expiration Date (FEFO) *</Text>
                      <TouchableOpacity
                        style={styles.openCalendarBtn}
                        onPress={() => {
                          setCalendarTarget('consignment');
                          setCalendarModalVisible(true);
                        }}
                      >
                        <Ionicons name="calendar" size={14} color={Palette.bluePrimary} />
                        <Text style={styles.openCalendarBtnText}>Open Calendar</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.datePresetsRow}>
                      {[
                        { label: '+30d', days: 30 },
                        { label: '+60d', days: 60 },
                        { label: '+90d', days: 90 },
                        { label: '+6m', days: 180 },
                        { label: '+1y', days: 365 },
                      ].map((preset) => (
                        <TouchableOpacity
                          key={preset.label}
                          style={styles.presetChip}
                          onPress={() => setTempConsignExpiryDate(getFutureDate(preset.days))}
                        >
                          <Text style={styles.presetChipText}>{preset.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={styles.dateDisplayCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        setCalendarTarget('consignment');
                        setCalendarModalVisible(true);
                      }}
                    >
                      <View style={styles.dateIconCircle}>
                        <Ionicons name="calendar-outline" size={20} color={Palette.bluePrimary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.dateDisplayTitle}>{tempConsignExpiryDate || 'Select Expiration Date'}</Text>
                        <Text style={styles.dateDisplaySub}>Tap to open visual calendar picker</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={Palette.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ gap: 8 }}>
                    <Button
                      title="+ Add to Delivery Manifest"
                      variant="primary"
                      size="md"
                      onPress={handleAddConsignmentItem}
                    />
                    {consignmentItems.length > 0 && (
                      <Button
                        title="Cancel"
                        variant="secondary"
                        size="sm"
                        onPress={() => setIsAddingConsignmentItem(false)}
                      />
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Searchable Product Dropdown Modal */}
      <SearchableProductModal
        visible={productPickerVisible}
        products={products}
        selectedProductId={
          productPickerTarget === 'single'
            ? singleSelectedProduct?.product_id
            : tempConsignProduct?.product_id
        }
        onSelect={(p) => {
          if (productPickerTarget === 'single') {
            setSingleSelectedProduct(p);
            setSingleCostPrice(p.cost_price ? String(p.cost_price) : '');
            setSingleBatchId(generateUniqueBatchLotId(storeName, p.name));
          } else {
            setTempConsignProduct(p);
            setTempConsignCostPrice(p.cost_price ? String(p.cost_price) : '');
          }
          setProductPickerVisible(false);
        }}
        onClose={() => setProductPickerVisible(false)}
      />

      {/* Calendar Modal */}
      <CalendarModal
        visible={calendarModalVisible}
        selectedDate={calendarTarget === 'single' ? singleExpiryDate : tempConsignExpiryDate}
        onSelectDate={(d) => {
          if (calendarTarget === 'single') {
            setSingleExpiryDate(d);
          } else {
            setTempConsignExpiryDate(d);
          }
          setCalendarModalVisible(false);
        }}
        onClose={() => setCalendarModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 17, 32, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  receiveModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  receiveModeTabs: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceLight,
    padding: 4,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  modeTabTextActive: {
    color: Palette.bluePrimary,
    fontWeight: '700',
  },
  modalBodyContainer: {
    flex: 1,
  },
  labelWithActionRow: {
    flexWrap: 'wrap',
    gap: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  autoGenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  autoGenText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
    marginLeft: 3,
  },
  openCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  openCalendarBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginBottom: 8,
  },
  datePresetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  dateDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 12,
    padding: 12,
  },
  dateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  dateDisplaySub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  consignmentListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  consignmentListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  consignmentListSub: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addItemBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  sharedBatchCard: {
    backgroundColor: Palette.surfaceLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  sharedBatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sharedBatchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  sharedBatchSub: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  emptyConsignmentBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: Palette.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyConsignmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.navyPrimary,
  },
  emptyConsignmentSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  consignmentItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  consignItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  consignItemMeta: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  consignItemMetaSub: {
    fontSize: 10.5,
    color: Palette.textMuted,
    marginTop: 1,
  },
  deleteLineBtn: {
    padding: 6,
    marginLeft: 8,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Palette.blueSoft,
    borderRadius: 10,
    marginTop: 6,
  },
  addMoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
    marginLeft: 6,
  },
  consignmentCardFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
  },
  consignmentSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.navyPrimary,
    marginLeft: 4,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 1,
  },
});
