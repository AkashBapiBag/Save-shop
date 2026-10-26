import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface SearchableProductModalProps {
  visible: boolean;
  products: Product[];
  selectedProductId?: string | null;
  onSelect: (product: Product) => void;
  onClose: () => void;
  title?: string;
  embedded?: boolean;
}

export const SearchableProductModal: React.FC<SearchableProductModalProps> = ({
  visible,
  products = [],
  selectedProductId,
  onSelect,
  onClose,
  title = 'Select Target Product',
  embedded = false,
}) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const cardHeight = Math.min(Math.round(screenHeight * 0.78), 580);
  const cardWidth = Math.min(Math.round(screenWidth - 32), 440);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Reset search and filter whenever modal opens
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setQuery('');
      setSelectedCategory('ALL');
    }
  }

  // Compute unique categories safely
  const categories = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => {
      if (p?.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filter products by search query and category safely
  const filteredProducts = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    const list = Array.isArray(products) ? products : [];
    return list.filter((p) => {
      if (!p) return false;
      const cat = (p.category || 'General').toLowerCase();
      const matchCat =
        selectedCategory === 'ALL' || cat === selectedCategory.toLowerCase();
      if (!matchCat) return false;

      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      return name.includes(q) || cat.includes(q);
    });
  }, [products, query, selectedCategory]);

  if (!visible) return null;

  const innerContent = (
    <>
      {/* Header */}
      <View style={styles.modalHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSub}>
            {(products || []).length} products available • Instant search
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={Palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <Input
        placeholder="Search by product name or category..."
        value={query}
        onChangeText={setQuery}
        containerStyle={{ marginBottom: 8 }}
        icon={<Ionicons name="search-outline" size={18} color={Palette.textSecondary} />}
        rightElement={
          query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Category Filter Chips */}
      {categories.length > 1 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isCatSelected = selectedCategory === item;
              return (
                <TouchableOpacity
                  style={[styles.catChip, isCatSelected && styles.catChipActive]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      isCatSelected && styles.catChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Product Items List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.product_id}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={7}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 4, flexGrow: filteredProducts.length === 0 ? 1 : undefined }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={40} color={Palette.textMuted} />
            <Text style={styles.emptyText}>
              {!products || products.length === 0
                ? 'No products in catalog yet'
                : 'No matching products found'}
            </Text>
            <Text style={styles.emptySubText}>
              {!products || products.length === 0
                ? 'Register a product first from the Inventory catalog screen.'
                : 'Try searching for another keyword or change category filter.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = item.product_id === selectedProductId;
          const stockNum = Number(item.total_current_stock) || 0;
          const isLowStock = stockNum <= Number(item.min_stock_alert_threshold);

          return (
            <TouchableOpacity
              style={[styles.productRow, isSelected && styles.productRowActive]}
              activeOpacity={0.7}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <View style={styles.productRowMain}>
                <Text style={[styles.productName, isSelected && styles.productNameActive]}>
                  {item.name}
                </Text>
                <View style={styles.productMetaRow}>
                  <Badge label={item.category || 'General'} variant="neutral" size="sm" />
                  <Text style={styles.unitText}>{item.default_unit}</Text>
                  {item.cost_price !== undefined && item.cost_price !== null && item.cost_price !== '' ? (
                    <Text style={styles.costText}>
                      Cost: ${Number(item.cost_price).toFixed(2)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.productRowRight}>
                <View style={styles.stockBadge}>
                  <Text
                    style={[
                      styles.stockNum,
                      stockNum === 0
                        ? { color: Palette.rose }
                        : isLowStock
                        ? { color: Palette.amber }
                        : { color: Palette.emerald },
                    ]}
                  >
                    {stockNum}
                  </Text>
                  <Text style={styles.stockLabel}>in stock</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={Palette.bluePrimary} style={{ marginLeft: 8 }} />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </>
  );

  if (embedded) {
    return (
      <View style={styles.embeddedOverlay}>
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.embeddedCard, { width: cardWidth, height: cardHeight }]}>
          {innerContent}
        </View>
      </View>
    );
  }

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
        <View style={[styles.modalCard, { width: cardWidth, height: cardHeight }]}>
          {innerContent}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface ProductSelectTriggerProps {
  product: Product | null | undefined;
  onPress: () => void;
  label?: string;
  error?: string;
}

export const ProductSelectTrigger: React.FC<ProductSelectTriggerProps> = ({
  product,
  onPress,
  label = 'Select Product *',
  error,
}) => {
  return (
    <View style={styles.triggerWrapper}>
      {label ? <Text style={styles.triggerLabel}>{label}</Text> : null}
      <TouchableOpacity
        style={[
          styles.triggerBox,
          product ? styles.triggerBoxSelected : null,
          error ? styles.triggerBoxError : null,
        ]}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <View style={styles.triggerLeft}>
          <View style={[styles.triggerIconContainer, product && { backgroundColor: Palette.blueSoft }]}>
            <Ionicons
              name={product ? 'cube' : 'cube-outline'}
              size={20}
              color={product ? Palette.bluePrimary : Palette.textMuted}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            {product ? (
              <>
                <Text style={styles.selectedProductName} numberOfLines={1}>
                  {product.name}
                </Text>
                <View style={styles.selectedProductMeta}>
                  <Text style={styles.selectedProductMetaText}>
                    {product.category} • {product.default_unit} • Current Stock: {Number(product.total_current_stock || 0)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.triggerPlaceholder}>
                Tap to search and select product...
              </Text>
            )}
          </View>
        </View>

        <View style={styles.triggerRight}>
          <Text style={styles.changeText}>{product ? 'Change' : 'Browse'}</Text>
          <Ionicons name="chevron-down" size={16} color={Palette.bluePrimary} style={{ marginLeft: 4 }} />
        </View>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  embeddedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 24,
    zIndex: 100,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  embeddedCard: {
    width: '100%',
    maxWidth: 420,
    height: '88%',
    maxHeight: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...Shadows.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...Shadows.lg,
    overflow: 'hidden',
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
  categoriesContainer: {
    marginBottom: 10,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Palette.surfaceMuted,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  catChipActive: {
    backgroundColor: Palette.blueSoft,
    borderColor: Palette.bluePrimary,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  catChipTextActive: {
    color: Palette.bluePrimary,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  productRowActive: {
    backgroundColor: Palette.blueSoft,
    borderColor: Palette.bluePrimary,
  },
  productRowMain: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  productNameActive: {
    color: Palette.bluePrimary,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  unitText: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  costText: {
    fontSize: 11,
    color: Palette.textMuted,
  },
  productRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockBadge: {
    alignItems: 'flex-end',
  },
  stockNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  stockLabel: {
    fontSize: 10,
    color: Palette.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 12,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  triggerWrapper: {
    marginBottom: 12,
  },
  triggerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginBottom: 6,
  },
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    backgroundColor: '#FFFFFF',
  },
  triggerBoxSelected: {
    borderColor: Palette.bluePrimary,
    backgroundColor: '#F8FAFC',
  },
  triggerBoxError: {
    borderColor: Palette.rose,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  triggerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerPlaceholder: {
    fontSize: 13,
    color: Palette.textMuted,
  },
  selectedProductName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  selectedProductMeta: {
    marginTop: 2,
  },
  selectedProductMetaText: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  errorText: {
    fontSize: 11,
    color: Palette.rose,
    marginTop: 4,
  },
});
