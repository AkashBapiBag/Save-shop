import React, { useState } from 'react';
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
import { UnitEnum, ProductCreateRequest } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  CategorySelectTrigger,
  SearchableCategoryModal,
  CategoryStat,
} from '@/components/SearchableCategorySelect';

export const UNITS: UnitEnum[] = [
  'PIECE',
  'KG',
  'GRAM',
  'LITER',
  'ML',
  'PACKET',
  'BOX',
  'BOTTLE',
  'DOZEN',
  'CAN',
  'METER',
];

export interface CreateProductModalProps {
  visible: boolean;
  existingCategoryStats: CategoryStat[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ProductCreateRequest) => Promise<void>;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  visible,
  existingCategoryStats,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(
    existingCategoryStats.length > 0 ? existingCategoryStats[0].name : ''
  );
  const [isCategoryNew, setIsCategoryNew] = useState(existingCategoryStats.length === 0);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [unit, setUnit] = useState<UnitEnum>('PIECE');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [minThreshold, setMinThreshold] = useState('10');

  const handleResetForm = () => {
    setName('');
    const defaultCat = existingCategoryStats.length > 0 ? existingCategoryStats[0].name : '';
    setCategory(defaultCat);
    setIsCategoryNew(existingCategoryStats.length === 0);
    setUnit('PIECE');
    setSellingPrice('');
    setCostPrice('');
    setMinThreshold('10');
  };

  const handleSave = async () => {
    if (!name.trim() || !sellingPrice.trim()) {
      Alert.alert('Required Fields', 'Please specify product name and selling price.');
      return;
    }

    const finalCategory = category.trim();
    if (!finalCategory) {
      Alert.alert('Category Required', 'Please select or create a category name.');
      return;
    }

    await onSubmit({
      name: name.trim(),
      category: finalCategory,
      default_unit: unit,
      selling_price: Number(sellingPrice),
      cost_price: Number(costPrice) || 0,
      min_stock_alert_threshold: Number(minThreshold) || 10,
    });

    handleResetForm();
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
                <Text style={styles.modalTitle}>Register New Product</Text>
                <Text style={styles.modalSub}>Add an item to your store</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <Input
                label="Product Name *"
                placeholder="e.g. Organic Almond Milk"
                value={name}
                onChangeText={setName}
              />

              {/* Searchable Category Selector */}
              <CategorySelectTrigger
                label="Category *"
                category={category}
                isNew={isCategoryNew}
                onPress={() => setCategoryPickerVisible(true)}
              />

              {/* Measurement Unit */}
              <Text style={styles.inputLabel}>Unit *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, unit === u && styles.unitChipActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Prices */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Input
                  label="Selling Price (₹) *"
                  placeholder="0.00"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
                <Input
                  label="Cost Price (₹)"
                  placeholder="0.00"
                  value={costPrice}
                  onChangeText={setCostPrice}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <Input
                label="Low Stock Alert Level"
                placeholder="10"
                value={minThreshold}
                onChangeText={setMinThreshold}
                keyboardType="numeric"
              />
            </ScrollView>

            <Button
              title="Save Product to Catalog"
              variant="primary"
              size="md"
              loading={isSubmitting}
              onPress={handleSave}
              style={{ marginTop: 14 }}
            />
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
  unitChip: {
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginRight: 6,
  },
  unitChipActive: {
    backgroundColor: Palette.bluePrimary,
    borderColor: Palette.bluePrimary,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  unitChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
