import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Store, IndianState, StoreCreateRequest, StoreUpdateRequest } from '@/types/api';
import { storeApi } from '@/services/api';
import { Palette } from '@/theme/designSystem';
import { StoreCard } from '@/components/stores/StoreCard';
import { IndianStatePickerModal } from '@/components/stores/IndianStatePickerModal';
import { SignatureUploadModal } from '@/components/stores/SignatureUploadModal';
import { CreateStoreModal } from '@/components/stores/CreateStoreModal';
import { EditStoreModal } from '@/components/stores/EditStoreModal';
import { showErrorAlert, logError } from '@/utils/errorHandler';

export const StoreManagementScreen: React.FC = () => {
  const { stores, activeStore, switchStore, refreshStores, isAdmin } = useAuth();

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);

  const [selectedStoreForEdit, setSelectedStoreForEdit] = useState<Store | null>(null);
  const [targetStoreForSignature, setTargetStoreForSignature] = useState<Store | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingSig, setIsUploadingSig] = useState(false);

  // Indian States & Union Territories
  const [indianStatesList, setIndianStatesList] = useState<IndianState[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(true);
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const [statePickerTarget, setStatePickerTarget] = useState<'create' | 'edit'>('create');
  const [newState, setNewState] = useState<string>('');
  const [editState, setEditState] = useState<string>('');

  // Fetch verified states list from database API on mount
  useEffect(() => {
    let isMounted = true;
    storeApi
      .getIndianStates()
      .then((states) => {
        if (isMounted && states && Array.isArray(states)) {
          setIndianStatesList(states);
          const defaultState =
            states.find((s) => s.code === '19')?.display_name ||
            states[0]?.display_name ||
            '';
          setNewState((prev) => prev || defaultState);
        }
      })
      .catch((err: unknown) => {
        logError('StoreManagementScreen:getIndianStates', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingStates(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Switch Store
  const handleSwitchStore = async (storeId: string) => {
    try {
      await switchStore(storeId);
      Alert.alert('Store Switched', 'Terminal context is now active for this store.');
    } catch (err: unknown) {
      showErrorAlert(err, 'Switch Store Error', 'Failed to switch active store.');
    }
  };

  // Open Edit Store
  const handleOpenEdit = useCallback((store: Store) => {
    setSelectedStoreForEdit(store);
    const defaultState =
      indianStatesList.find((s) => s.code === '19')?.display_name ||
      indianStatesList[0]?.display_name ||
      '';
    setEditState(store.state || defaultState);
    setEditModalVisible(true);
  }, [indianStatesList]);

  // Open Quick Signature
  const handleOpenSignature = useCallback((store: Store) => {
    setTargetStoreForSignature(store);
    setSignatureModalVisible(true);
  }, []);

  // Create Store Submit
  const handleCreateStoreSubmit = async (payload: StoreCreateRequest) => {
    setIsCreating(true);
    try {
      await storeApi.createStore(payload);
      Alert.alert(
        'Store Created',
        `Store '${payload.name}' registered successfully with state jurisdiction: ${payload.state}.`
      );
      setCreateModalVisible(false);
      await refreshStores();
    } catch (err: unknown) {
      showErrorAlert(err, 'Store Creation Error', 'Could not create store.');
    } finally {
      setIsCreating(false);
    }
  };

  // Edit Store Submit
  const handleEditStoreSubmit = async (storeId: string, payload: StoreUpdateRequest) => {
    setIsUpdating(true);
    try {
      await storeApi.updateStore(storeId, payload);
      Alert.alert('Store Updated', 'Store details saved successfully.');
      setEditModalVisible(false);
      await refreshStores();
    } catch (err: unknown) {
      showErrorAlert(err, 'Update Error', 'Could not update store details.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Upload Signature Submit
  const handleUploadSignatureSubmit = async (storeId: string, base64: string) => {
    setIsUploadingSig(true);
    try {
      await storeApi.uploadSignature(storeId, base64);
      Alert.alert('Signature Saved', 'Store signature uploaded successfully.');
      setSignatureModalVisible(false);
      await refreshStores();
    } catch (err: unknown) {
      showErrorAlert(err, 'Upload Error', 'Could not save signature.');
    } finally {
      setIsUploadingSig(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Banner & Header */}
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Store Directory</Text>
          <Text style={styles.headerSub}>
            {stores.length} registered location{stores.length === 1 ? '' : 's'} • Multi-Tenant Architecture
          </Text>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={styles.createButton}
            activeOpacity={0.8}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Add Store</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stores List */}
      {isLoadingStates && stores.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.navyPrimary} />
          <Text style={styles.loadingText}>Loading store network...</Text>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.store_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <StoreCard
              item={item}
              isActive={item.store_id === activeStore?.store_id}
              isAdmin={isAdmin}
              onSwitchStore={handleSwitchStore}
              onEditStore={handleOpenEdit}
              onQuickSignature={handleOpenSignature}
            />
          )}
        />
      )}

      {/* Create Store Modal */}
      <CreateStoreModal
        visible={createModalVisible}
        selectedState={newState}
        isCreating={isCreating}
        onClose={() => setCreateModalVisible(false)}
        onRequestSelectState={() => {
          setStatePickerTarget('create');
          setStatePickerVisible(true);
        }}
        onSubmit={handleCreateStoreSubmit}
      />

      {/* Edit Store Modal */}
      <EditStoreModal
        visible={editModalVisible}
        store={selectedStoreForEdit}
        selectedState={editState}
        isUpdating={isUpdating}
        onClose={() => setEditModalVisible(false)}
        onRequestSelectState={() => {
          setStatePickerTarget('edit');
          setStatePickerVisible(true);
        }}
        onSubmit={handleEditStoreSubmit}
      />

      {/* Quick Signature Modal */}
      <SignatureUploadModal
        visible={signatureModalVisible}
        store={targetStoreForSignature}
        isUploading={isUploadingSig}
        onClose={() => setSignatureModalVisible(false)}
        onUpload={handleUploadSignatureSubmit}
      />

      {/* Indian States / UT Picker Modal */}
      <IndianStatePickerModal
        visible={statePickerVisible}
        statesList={indianStatesList}
        selectedState={statePickerTarget === 'create' ? newState : editState}
        onSelect={(stateDisplayName) => {
          if (statePickerTarget === 'create') {
            setNewState(stateDisplayName);
          } else {
            setEditState(stateDisplayName);
          }
          setStatePickerVisible(false);
        }}
        onClose={() => setStatePickerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.surfaceLight,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
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
});
