import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export interface CategoryStat {
  name: string;
  count: number;
}

interface SearchableCategoryModalProps {
  visible: boolean;
  categories: CategoryStat[];
  selectedCategory?: string;
  onSelect: (categoryName: string, isNew: boolean) => void;
  onClose: () => void;
  title?: string;
}

const POPULAR_SUGGESTIONS = [
  'Dairy',
  'Beverages',
  'Snacks',
  'Groceries',
  'Bakery',
  'Personal Care',
  'Household',
  'Produce',
];

export const SearchableCategoryModal: React.FC<SearchableCategoryModalProps> = ({
  visible,
  categories = [],
  selectedCategory,
  onSelect,
  onClose,
  title = 'Select Category',
}) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const maxModalHeight = Math.min(Math.round(screenHeight * 0.65), 440);
  const cardWidth = Math.min(Math.round(screenWidth - 32), 400);

  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [newCatName, setNewCatName] = useState<string>('');

  // Whenever modal opens: reset query and mode based on whether categories exist
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setQuery('');
      setNewCatName('');
      setIsCreateMode(categories.length === 0);
    }
  }

  // Filter existing categories
  const filteredCategories = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  // Check if query in search is a new category name
  const trimmedQuery = query.trim();
  const exactMatchExists = useMemo(() => {
    if (!trimmedQuery) return false;
    return categories.some((c) => c.name.toLowerCase() === trimmedQuery.toLowerCase());
  }, [categories, trimmedQuery]);

  const canCreateFromQuery = trimmedQuery.length > 0 && !exactMatchExists;

  // Filter quick suggestions to exclude those already existing in store
  const availableSuggestions = useMemo(() => {
    return POPULAR_SUGGESTIONS.filter(
      (sugg) => !categories.some((c) => c.name.toLowerCase() === sugg.toLowerCase())
    );
  }, [categories]);

  const handleConfirmCreate = (nameToUse?: string) => {
    const target = (nameToUse ?? newCatName).trim();
    if (!target) return;
    const existing = categories.find((c) => c.name.toLowerCase() === target.toLowerCase());
    onSelect(existing ? existing.name : target, !existing);
    onClose();
  };

  if (!visible) return null;

  const content = isCreateMode ? (
    /* =========================================================================
       CREATE MODE: Dedicated, crystal-clear creation view
       ========================================================================= */
    <View style={styles.createContainer}>
      {/* Top Header */}
      <View style={styles.createHeader}>
        {categories.length > 0 ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setIsCreateMode(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={18} color={Palette.bluePrimary} />
            <Text style={styles.backButtonText}>View List</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.firstCatBadge}>
            <Ionicons name="sparkles" size={12} color={Palette.bluePrimary} style={{ marginRight: 4 }} />
            <Text style={styles.firstCatBadgeText}>First Category</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={20} color={Palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Main Title & Subtitle */}
      <Text style={styles.createTitle}>
        {categories.length === 0 ? 'Create First Category' : 'Create New Category'}
      </Text>
      <Text style={styles.createSubtitle}>
        {categories.length === 0
          ? 'Your store catalog is currently empty. Name your first category to get started.'
          : 'Enter a name below or choose a suggestion to create a new category.'}
      </Text>

      {/* Category Name Input Box */}
      <View style={styles.inputSection}>
        <Text style={styles.fieldLabel}>Category Name *</Text>
        <View style={styles.textInputBox}>
          <Ionicons name="folder-outline" size={18} color={Palette.bluePrimary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="e.g. Dairy, Beverages, Snacks..."
            placeholderTextColor={Palette.textMuted}
            value={newCatName}
            onChangeText={setNewCatName}
            autoFocus={true}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => handleConfirmCreate()}
            style={styles.textInputField}
          />
          {newCatName.length > 0 && (
            <TouchableOpacity
              onPress={() => setNewCatName('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Suggestions Chips */}
      {availableSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Quick suggestions:</Text>
          <View style={styles.suggestionsRow}>
            {availableSuggestions.slice(0, 5).map((sugg) => {
              const isSelected = newCatName.trim().toLowerCase() === sugg.toLowerCase();
              return (
                <TouchableOpacity
                  key={sugg}
                  style={[styles.suggestionChip, isSelected && styles.suggestionChipSelected]}
                  onPress={() => setNewCatName(sugg)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.suggestionChipText, isSelected && styles.suggestionChipTextSelected]}>
                    + {sugg}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Primary Submit Button */}
      <TouchableOpacity
        style={[
          styles.createSubmitBtn,
          !newCatName.trim() && styles.createSubmitBtnDisabled,
        ]}
        disabled={!newCatName.trim()}
        onPress={() => handleConfirmCreate()}
        activeOpacity={0.8}
      >
        <Ionicons
          name={newCatName.trim() ? 'checkmark-circle' : 'add-circle-outline'}
          size={18}
          color="#FFFFFF"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.createSubmitBtnText}>
          {newCatName.trim() ? `Use "${newCatName.trim()}"` : 'Enter Category Name'}
        </Text>
      </TouchableOpacity>
    </View>
  ) : (
    /* =========================================================================
       SELECT MODE: Search list with prominent "+ New" options
       ========================================================================= */
    <View style={styles.selectContainer}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSub}>
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} in store
          </Text>
        </View>

        {/* "+ New" Header Action */}
        <TouchableOpacity
          style={styles.headerNewPill}
          onPress={() => {
            setNewCatName(query.trim());
            setIsCreateMode(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color={Palette.bluePrimary} />
          <Text style={styles.headerNewPillText}>New Category</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={20} color={Palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <Input
        placeholder="Search categories..."
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

      {/* If search query is not yet in categories: prominent Create banner */}
      {canCreateFromQuery && (
        <TouchableOpacity
          style={styles.createFromQueryBanner}
          activeOpacity={0.8}
          onPress={() => handleConfirmCreate(trimmedQuery)}
        >
          <View style={styles.createFromQueryIcon}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.createFromQueryTitle} numberOfLines={1}>
              Create &ldquo;{trimmedQuery}&rdquo;
            </Text>
            <Text style={styles.createFromQuerySub}>Add as a new category</Text>
          </View>
          <Badge label="+ Create" variant="primary" size="sm" />
        </TouchableOpacity>
      )}

      {/* Categories List */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.name}
        initialNumToRender={10}
        maxToRenderPerBatch={15}
        windowSize={5}
        style={styles.listStyle}
        contentContainerStyle={styles.listContentStyle}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={32} color={Palette.textMuted} />
            <Text style={styles.emptyText}>No matching categories found</Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => {
                setNewCatName(query.trim());
                setIsCreateMode(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCreateBtnText}>
                {query.trim() ? `Create "${query.trim()}"` : 'Create New Category'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          filteredCategories.length > 0 ? (
            <TouchableOpacity
              style={styles.bottomAddLink}
              onPress={() => {
                setNewCatName('');
                setIsCreateMode(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={16} color={Palette.bluePrimary} style={{ marginRight: 4 }} />
              <Text style={styles.bottomAddLinkText}>+ Add another category</Text>
            </TouchableOpacity>
          ) : undefined
        }
        renderItem={({ item }) => {
          const isSelected = selectedCategory?.toLowerCase() === item.name.toLowerCase();

          return (
            <TouchableOpacity
              style={[styles.categoryRow, isSelected && styles.categoryRowActive]}
              activeOpacity={0.7}
              onPress={() => {
                onSelect(item.name, false);
                onClose();
              }}
            >
              <View style={styles.categoryRowLeft}>
                <View style={[styles.categoryIconCircle, isSelected && { backgroundColor: Palette.blueSoft }]}>
                  <Ionicons
                    name="folder-outline"
                    size={16}
                    color={isSelected ? Palette.bluePrimary : Palette.navyPrimary}
                  />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.categoryName, isSelected && styles.categoryNameActive]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {item.count} {item.count === 1 ? 'product' : 'products'}
                  </Text>
                </View>
              </View>

              {isSelected && (
                <Ionicons name="checkmark-circle" size={18} color={Palette.bluePrimary} />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

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
        <View style={[styles.modalCard, { width: cardWidth, maxHeight: maxModalHeight }]}>
          {content}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* =========================================================================
   TRIGGER COMPONENT: Form Field Trigger
   ========================================================================= */
interface CategorySelectTriggerProps {
  category: string;
  isNew?: boolean;
  onPress: () => void;
  label?: string;
  error?: string;
}

export const CategorySelectTrigger: React.FC<CategorySelectTriggerProps> = ({
  category,
  isNew = false,
  onPress,
  label = 'Category *',
  error,
}) => {
  return (
    <View style={styles.triggerWrapper}>
      {label ? <Text style={styles.triggerLabel}>{label}</Text> : null}

      <TouchableOpacity
        style={[
          styles.triggerBox,
          category ? styles.triggerBoxSelected : null,
          error ? styles.triggerBoxError : null,
        ]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <Ionicons
          name={category ? (isNew ? 'add-circle-outline' : 'folder') : 'folder-outline'}
          size={18}
          color={category ? Palette.bluePrimary : Palette.textMuted}
          style={styles.triggerIcon}
        />

        <Text
          style={[
            styles.selectedCategoryName,
            !category && styles.triggerPlaceholder,
          ]}
          numberOfLines={1}
        >
          {category || 'Select or create category...'}
        </Text>

        <View style={styles.triggerRight}>
          {category && isNew ? (
            <View style={styles.newBadgeInline}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-down" size={16} color={Palette.textSecondary} />
        </View>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

/* =========================================================================
   STYLES
   ========================================================================= */
const styles = StyleSheet.create({
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
    borderRadius: 18,
    padding: 16,
    ...Shadows.lg,
    overflow: 'hidden',
  },

  // ---------------------------------------------------------------------------
  // CREATE MODE STYLES
  // ---------------------------------------------------------------------------
  createContainer: {
    paddingVertical: 2,
  },
  createHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: Palette.blueSoft,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
    marginLeft: 4,
  },
  firstCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Palette.blueSoft,
  },
  firstCatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  createTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  createSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  inputSection: {
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginBottom: 5,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.bluePrimary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  textInputField: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
    height: '100%',
  },
  suggestionsContainer: {
    marginTop: 10,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 6,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Palette.surfaceMuted,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  suggestionChipSelected: {
    backgroundColor: Palette.blueSoft,
    borderColor: Palette.bluePrimary,
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  suggestionChipTextSelected: {
    color: Palette.bluePrimary,
    fontWeight: '700',
  },
  createSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bluePrimary,
    height: 44,
    borderRadius: 10,
    marginTop: 14,
    ...Shadows.sm,
  },
  createSubmitBtnDisabled: {
    backgroundColor: Palette.borderDark,
    opacity: 0.6,
  },
  createSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ---------------------------------------------------------------------------
  // SELECT MODE STYLES
  // ---------------------------------------------------------------------------
  selectContainer: {
    paddingVertical: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  headerNewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Palette.blueSoft,
    marginRight: 8,
  },
  headerNewPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
    marginLeft: 2,
  },
  closeButton: {
    padding: 4,
  },
  createFromQueryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Palette.blueSoft,
    borderWidth: 1.5,
    borderColor: Palette.bluePrimary,
    marginBottom: 8,
  },
  createFromQueryIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createFromQueryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.navyPrimary,
  },
  createFromQuerySub: {
    fontSize: 10,
    color: Palette.textSecondary,
  },
  listStyle: {
    maxHeight: 210,
  },
  listContentStyle: {
    paddingVertical: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  categoryRowActive: {
    backgroundColor: Palette.blueSoft,
    borderColor: Palette.bluePrimary,
  },
  categoryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  categoryNameActive: {
    color: Palette.bluePrimary,
    fontWeight: '700',
  },
  categoryCount: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 6,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyCreateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomAddLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  bottomAddLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },

  // ---------------------------------------------------------------------------
  // TRIGGER BOX STYLES
  // ---------------------------------------------------------------------------
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  triggerBoxSelected: {
    borderColor: Palette.bluePrimary,
    backgroundColor: '#FAFCFF',
  },
  triggerBoxError: {
    borderColor: Palette.rose,
  },
  triggerIcon: {
    marginRight: 8,
  },
  selectedCategoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  triggerPlaceholder: {
    fontWeight: '400',
    color: Palette.textMuted,
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  newBadgeInline: {
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  errorText: {
    fontSize: 11,
    color: Palette.rose,
    marginTop: 4,
    fontWeight: '500',
  },
});
