import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Palette } from '@/theme/designSystem';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatImageUri } from '@/utils/imageUtils';

export const AppHeader: React.FC = () => {
  const { user, activeStore, stores, switchStore, logout, isAdmin } = useAuth();
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 12);

  return (
    <>
      <View style={[styles.headerContainer, { paddingTop: safeTopPadding }]}>
        {/* Store Selector Pill */}
        <TouchableOpacity
          style={styles.storePill}
          activeOpacity={0.7}
          onPress={() => setStoreModalVisible(true)}
        >
          {activeStore?.logo_base64 || activeStore?.logo_url ? (
            <Image
              source={{ uri: formatImageUri(activeStore.logo_base64 || activeStore.logo_url)! }}
              style={styles.headerLogoThumb}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="storefront-outline" size={16} color={Palette.bluePrimary} />
          )}
          <Text style={styles.storeName} numberOfLines={1}>
            {activeStore?.name || 'Select Store'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Palette.textSecondary} />
        </TouchableOpacity>

        {/* Right Actions: Profile Avatar */}
        <View style={styles.rightGroup}>
          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.7}
            onPress={() => setProfileModalVisible(true)}
          >
            <Text style={styles.avatarText}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Store Switcher Modal */}
      <Modal
        visible={storeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStoreModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStoreModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Switch Store</Text>
                <Text style={styles.modalSubtitle}>
                  {isAdmin ? 'All active network stores' : 'Your authorized stores'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStoreModalVisible(false)}>
                <Ionicons name="close" size={22} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={stores}
              keyExtractor={(item) => item.store_id}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => {
                const isSelected = item.store_id === activeStore?.store_id;
                return (
                  <TouchableOpacity
                    style={[styles.storeItem, isSelected && styles.storeItemActive]}
                    activeOpacity={0.7}
                    onPress={async () => {
                      await switchStore(item.store_id);
                      setStoreModalVisible(false);
                    }}
                  >
                    <View style={styles.storeIconContainer}>
                      {item.logo_base64 || item.logo_url ? (
                        <Image
                          source={{ uri: formatImageUri(item.logo_base64 || item.logo_url)! }}
                          style={styles.modalLogoThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="business"
                          size={18}
                          color={isSelected ? Palette.bluePrimary : Palette.textSecondary}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.storeRowName, isSelected && styles.storeRowNameActive]}>
                        {item.name}
                      </Text>
                      {item.owner_name ? (
                        <Text style={styles.storeRowOwner} numberOfLines={1}>
                          Owner: {item.owner_name}
                        </Text>
                      ) : null}
                      {item.address ? (
                        <Text style={styles.storeRowAddress} numberOfLines={1}>
                          {item.address}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={Palette.bluePrimary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile & Operator Info Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Session</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Ionicons name="close" size={22} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileDetails}>
              <View style={styles.largeAvatar}>
                <Text style={styles.largeAvatarText}>
                  {(user?.name || user?.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileName}>{user?.name || 'Operator'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={{ marginTop: 8 }}>
                <Badge
                  label={isAdmin ? 'ADMINISTRATOR' : 'STANDARD OPERATOR'}
                  variant={isAdmin ? 'purple' : 'primary'}
                />
              </View>
            </View>

            <View style={styles.profileMeta}>
              <Text style={styles.metaLabel}>Current Store</Text>
              <Text style={styles.metaValue}>{activeStore?.name || 'None'}</Text>
            </View>

            <Button
              title="Sign Out"
              variant="danger"
              size="md"
              onPress={async () => {
                setProfileModalVisible(false);
                await logout();
              }}
              style={{ marginTop: 16 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    maxWidth: '55%',
  },
  storeName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginHorizontal: 6,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  storeItemActive: {
    backgroundColor: Palette.blueSoft,
    borderColor: Palette.bluePrimary,
  },
  storeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  storeRowNameActive: {
    color: Palette.bluePrimary,
  },
  storeRowAddress: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
  storeRowOwner: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  headerLogoThumb: {
    width: 20,
    height: 20,
    borderRadius: 5,
    marginRight: 6,
  },
  modalLogoThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  profileDetails: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  largeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  largeAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  profileMeta: {
    backgroundColor: Palette.surfaceLight,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  metaLabel: {
    fontSize: 11,
    color: Palette.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginTop: 2,
  },
});
