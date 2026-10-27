import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Store, IndianState, StoreCreateRequest, StoreUpdateRequest } from '@/types/api';
import { storeApi } from '@/services/api';
import { Palette } from '@/theme/designSystem';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { StoreCard } from '@/components/stores/StoreCard';
import { IndianStatePickerModal } from '@/components/stores/IndianStatePickerModal';
import { SignatureUploadModal } from '@/components/stores/SignatureUploadModal';
import { CreateStoreModal } from '@/components/stores/CreateStoreModal';
import { EditStoreModal } from '@/components/stores/EditStoreModal';
import { StoreUsersModal } from '@/components/stores/StoreUsersModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { StoreManagementSkeleton } from '@/components/ui/Skeleton';
import { useNetworkStatus } from '@/context/NetworkContext';
import { showErrorAlert, logError } from '@/utils/errorHandler';

export const StoreManagementScreen: React.FC = () => {
  const { stores, activeStore, switchStore, refreshStores, refreshUser, user, isAdmin, isLoading: isAuthLoading } = useAuth();
  const { isOffline } = useNetworkStatus();

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [usersModalVisible, setUsersModalVisible] = useState(false);

  const [selectedStoreForEdit, setSelectedStoreForEdit] = useState<Store | null>(null);
  const [targetStoreForSignature, setTargetStoreForSignature] = useState<Store | null>(null);
  const [selectedStoreForUsers, setSelectedStoreForUsers] = useState<Store | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingSig, setIsUploadingSig] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<{
    visible: boolean;
    title: string;
    message: string;
    badgeText?: string;
    details?: { label: string; value: string }[];
  } | null>(null);

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

  // Auto-reload stores when connection is restored
  useEffect(() => {
    if (!isOffline && stores.length === 0) {
      void refreshStores();
    }
  }, [isOffline]);

  // Switch Store
  const handleSwitchStore = async (storeId: string) => {
    try {
      await switchStore(storeId);
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

  // Open Store Users / Operators
  const handleOpenUsers = useCallback((store: Store) => {
    setSelectedStoreForUsers(store);
    setUsersModalVisible(true);
  }, []);

  // Create Store Submit
  const handleCreateStoreSubmit = async (payload: StoreCreateRequest) => {
    setIsCreating(true);
    try {
      await storeApi.createStore(payload);
      setCreateModalVisible(false);
      await refreshStores();
      if (Platform.OS === 'web') {
        setSuccessFeedback({
          visible: true,
          title: 'Store Registered!',
          badgeText: 'STORE ACTIVE',
          message: `Store '${payload.name}' has been created successfully in ${payload.state}.`,
          details: [
            { label: 'Store Name', value: payload.name },
            { label: 'State', value: payload.state || '19-West Bengal' },
            { label: 'Owner', value: payload.owner_name || 'Store Admin' },
          ],
        });
      }
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
      setEditModalVisible(false);
      await refreshStores();
      if (Platform.OS === 'web') {
        setSuccessFeedback({
          visible: true,
          title: 'Store Details Saved!',
          badgeText: 'UPDATED',
          message: 'Your store profile and tax configurations have been updated successfully.',
          details: [
            { label: 'Store Name', value: payload.name || 'Store' },
            { label: 'Jurisdiction', value: payload.state || 'Unchanged' },
          ],
        });
      }
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
      setSignatureModalVisible(false);
      await refreshStores();
      if (Platform.OS === 'web') {
        setSuccessFeedback({
          visible: true,
          title: 'Signature Saved!',
          badgeText: 'READY FOR POS',
          message: 'Authorized signature uploaded successfully. It will now automatically appear on print and digital tax invoices.',
        });
      }
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
            {stores.length} store location{stores.length === 1 ? '' : 's'}
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

      {/* Active User Google Profile Banner */}
      <View style={styles.userProfileBanner}>
        <UserAvatar
          uri={user?.picture_url}
          name={user?.name}
          email={user?.email}
          size={38}
          showGoogleBadge={false}
        />
        <View style={{ flex: 1, minWidth: 0, marginHorizontal: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.userBannerName} numberOfLines={1}>
              {user?.name || 'Staff User'}
            </Text>
            <Ionicons name="logo-google" size={13} color="#4285F4" />
          </View>
          <Text style={styles.userBannerEmail} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
        <Badge
          label={isAdmin ? 'ADMINISTRATOR' : 'STORE OPERATOR'}
          variant={isAdmin ? 'purple' : 'primary'}
          size="sm"
        />
      </View>

      {/* Stores List */}
      {(isAuthLoading || isLoadingStates) && stores.length === 0 ? (
        <StoreManagementSkeleton storeCount={3} />
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
              onManageOperators={handleOpenUsers}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="business-outline" size={36} color={Palette.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>
                {isAdmin ? 'No Stores Created Yet' : 'No Store Assigned Yet'}
              </Text>
              <Text style={styles.emptySub}>
                {isAdmin
                  ? 'Get started by creating your first store branch using the Add Store button above.'
                  : `You are logged in as ${user?.email || 'Staff'}, but you haven't been assigned to any stores yet.\n\nPlease ask your store administrator to add your email address to their store. Once added, tap Refresh below.`}
              </Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={async () => {
                  await refreshStores();
                  await refreshUser();
                }}
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.refreshBtnText}>Check / Refresh Access</Text>
              </TouchableOpacity>
            </View>
          }
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

      {/* Store Users & Operators Modal */}
      <StoreUsersModal
        visible={usersModalVisible}
        store={selectedStoreForUsers}
        onClose={() => setUsersModalVisible(false)}
        onUpdated={refreshStores}
      />

      {/* Modern In-App Success Feedback Modal (Desktop Web only) */}
      {Platform.OS === 'web' && successFeedback && (
        <SuccessModal
          visible={successFeedback.visible}
          title={successFeedback.title}
          message={successFeedback.message}
          badgeText={successFeedback.badgeText}
          details={successFeedback.details}
          primaryButtonText="Done"
          onClose={() => setSuccessFeedback(null)}
        />
      )}
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
  userProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  userBannerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  userBannerAvatarImg: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
  userBannerAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  userBannerName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  userBannerEmail: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 1,
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
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.navyPrimary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 18,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
});
