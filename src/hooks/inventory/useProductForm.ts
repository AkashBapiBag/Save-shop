import { useState } from 'react';
import { Alert } from 'react-native';
import { UnitEnum } from '@/types/api';
import { inventoryApi } from '@/services/api';
import { CategoryStat } from '@/components/SearchableCategorySelect';

interface UseProductFormParams {
  existingCategoryStats: CategoryStat[];
  activeStore?: { store_id?: string; name?: string } | null;
  onProductCreated?: () => void;
}

export function useProductForm({
  existingCategoryStats,
  activeStore,
  onProductCreated,
}: UseProductFormParams) {
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isCategoryNew, setIsCategoryNew] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [newUnit, setNewUnit] = useState<UnitEnum>('PIECE');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newMinThreshold, setNewMinThreshold] = useState('10');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [createProductModalVisible, setCreateProductModalVisible] = useState(false);

  const resetProductForm = () => {
    setNewName('');
    const defaultCat = existingCategoryStats.length > 0 ? existingCategoryStats[0].name : '';
    setNewCategory(defaultCat);
    setIsCategoryNew(existingCategoryStats.length === 0);
    setNewUnit('PIECE');
    setNewSellingPrice('');
    setNewCostPrice('');
    setNewMinThreshold('10');
  };

  const openCreateProductModal = () => {
    resetProductForm();
    setCreateProductModalVisible(true);
  };

  const handleCreateProduct = async () => {
    if (!newName.trim() || !newSellingPrice.trim()) {
      Alert.alert('Required Fields', 'Please specify product name and selling price.');
      return;
    }

    const finalCategory = newCategory.trim();

    if (!finalCategory) {
      Alert.alert('Category Required', 'Please select or create a category name.');
      return;
    }

    setIsSubmittingProduct(true);
    try {
      await inventoryApi.createProduct({
        store_id: activeStore?.store_id,
        name: newName.trim(),
        category: finalCategory,
        default_unit: newUnit,
        selling_price: Number(newSellingPrice),
        cost_price: Number(newCostPrice) || 0,
        min_stock_alert_threshold: Number(newMinThreshold) || 10,
      });

      Alert.alert('Success', `Product '${newName.trim()}' in category '${finalCategory}' registered successfully.`);
      setCreateProductModalVisible(false);
      resetProductForm();
      onProductCreated?.();
    } catch (err: any) {
      Alert.alert('Registration Error', err?.message || 'Failed to create product.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  return {
    newName,
    setNewName,
    newCategory,
    setNewCategory,
    isCategoryNew,
    setIsCategoryNew,
    categoryPickerVisible,
    setCategoryPickerVisible,
    newUnit,
    setNewUnit,
    newSellingPrice,
    setNewSellingPrice,
    newCostPrice,
    setNewCostPrice,
    newMinThreshold,
    setNewMinThreshold,
    isSubmittingProduct,
    createProductModalVisible,
    setCreateProductModalVisible,
    handleCreateProduct,
    resetProductForm,
    openCreateProductModal,
  };
}
