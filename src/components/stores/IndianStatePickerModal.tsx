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
import { IndianState } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';

export interface IndianStatePickerModalProps {
  visible: boolean;
  statesList: IndianState[];
  selectedState: string;
  onSelect: (stateDisplayName: string) => void;
  onClose: () => void;
}

export const IndianStatePickerModal: React.FC<IndianStatePickerModalProps> = ({
  visible,
  statesList,
  selectedState,
  onSelect,
  onClose,
}) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const cardHeight = Math.min(Math.round(screenHeight * 0.8), 600);
  const cardWidth = Math.min(Math.round(screenWidth - 32), 440);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STATE' | 'UT'>('ALL');

  const stateCount = useMemo(
    () => statesList.filter((s) => s.state_type.toUpperCase() === 'STATE').length,
    [statesList]
  );
  const utCount = useMemo(
    () => statesList.filter((s) => s.state_type.toUpperCase() === 'UT').length,
    [statesList]
  );

  const filteredStates = useMemo(() => {
    return statesList.filter((s) => {
      const matchesType =
        typeFilter === 'ALL' || s.state_type.toUpperCase() === typeFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.display_name.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [statesList, typeFilter, search]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalCard, { width: cardWidth, height: cardHeight }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Select State / Jurisdiction</Text>
              <Text style={styles.modalSub}>
                36 States & UTs • Standard GST Codes
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Palette.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color={Palette.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search by state name or GST code..."
              placeholderTextColor={Palette.textMuted}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={Palette.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Pills: ALL / 28 STATES / 8 UTs */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, typeFilter === 'ALL' && styles.filterPillActive]}
              onPress={() => setTypeFilter('ALL')}
            >
              <Text style={[styles.filterPillText, typeFilter === 'ALL' && styles.filterPillTextActive]}>
                All ({statesList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, typeFilter === 'STATE' && styles.filterPillActive]}
              onPress={() => setTypeFilter('STATE')}
            >
              <Text style={[styles.filterPillText, typeFilter === 'STATE' && styles.filterPillTextActive]}>
                States ({stateCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, typeFilter === 'UT' && styles.filterPillActive]}
              onPress={() => setTypeFilter('UT')}
            >
              <Text style={[styles.filterPillText, typeFilter === 'UT' && styles.filterPillTextActive]}>
                Union Territories ({utCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* State List */}
          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingVertical: 4 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedState === item.display_name;
              const isState = item.state_type.toUpperCase() === 'STATE';

              return (
                <TouchableOpacity
                  style={[styles.stateItemRow, isSelected && styles.stateItemRowActive]}
                  activeOpacity={0.7}
                  onPress={() => onSelect(item.display_name)}
                >
                  <View style={[styles.codeBadge, isSelected && styles.codeBadgeActive]}>
                    <Text style={[styles.codeBadgeText, isSelected && styles.codeBadgeTextActive]}>
                      {item.code}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.stateName, isSelected && styles.stateNameActive]}>
                      {item.name}
                    </Text>
                    <Text style={styles.stateType}>
                      {isState ? 'State' : 'Union Territory'} • Code: {item.code}
                    </Text>
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={Palette.bluePrimary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  modalSub: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.textPrimary,
    paddingVertical: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  filterPillActive: {
    backgroundColor: Palette.bluePrimary,
    borderColor: Palette.bluePrimary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stateItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  stateItemRowActive: {
    backgroundColor: Palette.blueSoft,
  },
  codeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBadgeActive: {
    backgroundColor: Palette.bluePrimary,
    borderColor: Palette.bluePrimary,
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  codeBadgeTextActive: {
    color: '#FFFFFF',
  },
  stateName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  stateNameActive: {
    color: Palette.bluePrimary,
  },
  stateType: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 1,
  },
});
