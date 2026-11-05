import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, ProductUpdateRequest } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  CategorySelectTrigger,
  SearchableCategoryModal,
  CategoryStat,
} from '@/components/SearchableCategorySelect';

export interface EditProductModalProps {
  visible: boolean;
  product: Product | null;
  existingCategoryStats: CategoryStat[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (productId: string, payload: ProductUpdateRequest) => Promise<void>;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  visible,
  product,
  existingCategoryStats,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isCategoryNew, setIsCategoryNew] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [minThreshold, setMinThreshold] = useState('10');
  const [discountValue, setDiscountValue] = useState('0');
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage');
  const [cashbackValue, setCashbackValue] = useState('0');
  const [cashbackType, setCashbackType] = useState<'amount' | 'percentage'>('percentage');

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategory(product.category || 'General');
      setIsCategoryNew(false);
      setMinThreshold(String(product.min_stock_alert_threshold ?? '10'));
      setDiscountValue(String(product.discount_value ?? '0'));
      setDiscountType(product.discount_type === 'amount' ? 'amount' : 'percentage');
      setCashbackValue(String(product.cashback_value ?? '0'));
      setCashbackType(product.cashback_type === 'amount' ? 'amount' : 'percentage');
    }
  }, [product]);

  if (!product) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Product name cannot be empty.');
      return;
    }

    const finalCategory = category.trim();
    if (!finalCategory) {
      Alert.alert('Category Required', 'Please select or provide a category.');
      return;
    }

    const thresholdNum = Number(minThreshold);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      Alert.alert('Invalid Value', 'Low stock count must be a non-negative number.');
      return;
    }

    const discountNum = Number(discountValue);
    if (isNaN(discountNum) || discountNum < 0) {
      Alert.alert('Invalid Value', 'Discount value must be a non-negative number.');
      return;
    }

    const cashbackNum = Number(cashbackValue);
    if (isNaN(cashbackNum) || cashbackNum < 0) {
      Alert.alert('Invalid Value', 'Cashback value must be a non-negative number.');
      return;
    }

    await onSubmit(product.product_id, {
      name: name.trim(),
      category: finalCategory,
      min_stock_alert_threshold: thresholdNum,
      discount_value: discountNum,
      discount_type: discountType,
      cashback_value: cashbackNum,
      cashback_type: cashbackType,
    });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Inventory Item</Text>
                <Text style={styles.modalSub}>Edit product name, category, low stock & discount</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1, maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {/* 1. Product Name (Editable) */}
              <Input
                label="Product Name *"
                placeholder="Product title"
                value={name}
                onChangeText={setName}
              />

              {/* 2. Category (Editable) */}
              <CategorySelectTrigger
                label="Category *"
                category={category}
                isNew={isCategoryNew}
                onPress={() => setCategoryPickerVisible(true)}
              />

              {/* 3. Low Stock Count / Threshold (Editable) */}
              <Input
                label="Low Stock Alert Level *"
                placeholder="10"
                value={minThreshold}
                onChangeText={setMinThreshold}
                keyboardType="numeric"
              />

              {/* 4. Discount Value (Editable with % / ₹ toggle) */}
              <View style={styles.discountSection}>
                <View style={styles.discountLabelRow}>
                  <Text style={styles.inputLabel}>Product Discount *</Text>
                  <View style={styles.toggleButtonGroup}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, discountType === 'percentage' && styles.toggleBtnActive]}
                      onPress={() => setDiscountType('percentage')}
                    >
                      <Text style={[styles.toggleBtnText, discountType === 'percentage' && styles.toggleBtnTextActive]}>
                        %
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, discountType === 'amount' && styles.toggleBtnActive]}
                      onPress={() => setDiscountType('amount')}
                    >
                      <Text style={[styles.toggleBtnText, discountType === 'amount' && styles.toggleBtnTextActive]}>
                        ₹
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Input
                  placeholder={discountType === 'percentage' ? 'e.g. 10 (10% off)' : 'e.g. 25 (₹25 off)'}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                />
              </View>

              {/* 5. S.I. Point Value (Editable with % / ₹ toggle) */}
              <View style={styles.discountSection}>
                <View style={styles.discountLabelRow}>
                  <Text style={styles.inputLabel}>Product S.I. Point</Text>
                  <View style={styles.toggleButtonGroup}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, cashbackType === 'percentage' && styles.toggleBtnActive]}
                      onPress={() => setCashbackType('percentage')}
                    >
                      <Text style={[styles.toggleBtnText, cashbackType === 'percentage' && styles.toggleBtnTextActive]}>
                        %
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, cashbackType === 'amount' && styles.toggleBtnActive]}
                      onPress={() => setCashbackType('amount')}
                    >
                      <Text style={[styles.toggleBtnText, cashbackType === 'amount' && styles.toggleBtnTextActive]}>
                        ₹
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Input
                  placeholder={cashbackType === 'percentage' ? 'e.g. 5 (5% S.I. Point)' : 'e.g. 10 (₹10 S.I. Point)'}
                  value={cashbackValue}
                  onChangeText={setCashbackValue}
                  keyboardType="numeric"
                />
              </View>

              {/* Non-editable Attributes Banner */}
              <View style={styles.lockedFieldsBox}>
                <View style={styles.lockedHeaderRow}>
                  <Ionicons name="lock-closed-outline" size={14} color={Palette.textMuted} />
                  <Text style={styles.lockedHeaderText}>Non-Editable Parameters</Text>
                </View>
                <View style={styles.lockedDetailsGrid}>
                  <Text style={styles.lockedItemText}>
                    • Selling Price: <Text style={styles.lockedItemVal}>₹ {Number(product.selling_price).toFixed(2)}</Text>
                  </Text>
                  <Text style={styles.lockedItemText}>
                    • Default Unit: <Text style={styles.lockedItemVal}>{product.default_unit}</Text>
                  </Text>
                  <Text style={styles.lockedItemText}>
                    • Current Stock: <Text style={styles.lockedItemVal}>{product.total_current_stock} {product.default_unit}</Text>
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={onClose}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Changes"
                variant="primary"
                size="md"
                loading={isSubmitting}
                onPress={handleSave}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Picker Modal */}
      <SearchableCategoryModal
        visible={categoryPickerVisible}
        categories={existingCategoryStats}
        selectedCategory={category}
        onSelect={(catName, isNew) => {
          setCategory(catName);
          setIsCategoryNew(isNew);
          setCategoryPickerVisible(false);
        }}
        onClose={() => setCategoryPickerVisible(false)}
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
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginBottom: 6,
  },
  discountSection: {
    marginTop: 6,
    marginBottom: 4,
  },
  discountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceLight,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: Palette.bluePrimary,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  lockedFieldsBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: Palette.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  lockedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  lockedHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textMuted,
    textTransform: 'uppercase',
  },
  lockedDetailsGrid: {
    gap: 4,
  },
  lockedItemText: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  lockedItemVal: {
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
    marginTop: 8,
  },
});
