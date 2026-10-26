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
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Palette } from '@/theme/designSystem';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatImageUri } from '@/utils/imageUtils';
import { PWAInstallButton } from '@/components/ui/PWAInstallModal';
import { UserAvatar } from '@/components/ui/UserAvatar';

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
            <Ionicons name="storefront-outline" size={16} color={Palette.bluePrimary} style={{ flexShrink: 0 }} />
          )}
          <Text style={styles.storeName} numberOfLines={1}>
            {activeStore?.name || 'Select Store'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Palette.textSecondary} style={{ flexShrink: 0 }} />
        </TouchableOpacity>

        {/* Right Actions: PWA Install + Profile Avatar */}
        <View style={styles.rightGroup}>
          <PWAInstallButton variant="pill" />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setProfileModalVisible(true)}
            accessibilityLabel="User profile and account settings"
          >
            <UserAvatar
              uri={user?.picture_url}
              name={user?.name}
              email={user?.email}
              size={34}
              showGoogleBadge={true}
            />
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
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.modalTitle}>Switch Store</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {isAdmin ? 'All available stores' : 'Stores you have access to'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStoreModalVisible(false)} style={{ flexShrink: 0 }}>
                <Ionicons name="close" size={22} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={stores}
              keyExtractor={(item) => item.store_id}
              contentContainerStyle={{ paddingVertical: 8 }}
              ListEmptyComponent={
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Ionicons name="storefront-outline" size={36} color={Palette.textMuted} />
                  <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '700', color: Palette.navyPrimary }}>
                    No Accessible Stores
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: Palette.textSecondary, textAlign: 'center', paddingHorizontal: 16 }}>
                    {isAdmin
                      ? 'No stores have been created yet.'
                      : 'Ask your store administrator to add your email address to their store.'}
                  </Text>
                </View>
              }
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
                    <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                      <Text style={[styles.storeRowName, isSelected && styles.storeRowNameActive]} numberOfLines={1}>
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
                      <Ionicons name="checkmark-circle" size={20} color={Palette.bluePrimary} style={{ flexShrink: 0, marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile & Account Info Modal */}
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
              <View>
                <Text style={styles.modalTitle}>User Session</Text>
                <Text style={styles.modalSubtitle}>Google Profile & Account</Text>
              </View>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Ionicons name="close" size={22} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.profileDetails}>
                <View style={styles.largeAvatarContainer}>
                  <UserAvatar
                    uri={user?.picture_url}
                    name={user?.name}
                    email={user?.email}
                    size={72}
                    fontSize={28}
                    showGoogleBadge={true}
                    googleBadgeSize={22}
                    borderColor={Palette.bluePrimary}
                    borderWidth={2}
                  />
                </View>

                <Text style={styles.profileName} numberOfLines={1}>
                  {user?.name || 'Store Staff'}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user?.email}
                </Text>

                {/* Google Connected Badge */}
                <View style={styles.googleConnectedBadge}>
                  <Ionicons name="shield-checkmark" size={13} color={Palette.emerald} />
                  <Text style={styles.googleConnectedText}>Signed in with Google</Text>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Badge
                    label={isAdmin ? 'ADMINISTRATOR' : 'STORE OPERATOR'}
                    variant={isAdmin ? 'purple' : 'primary'}
                  />
                </View>
              </View>

              {/* Current Store Context */}
              <View style={styles.profileMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="storefront-outline" size={13} color={Palette.bluePrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.metaLabel}>Current Store Context</Text>
                </View>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {activeStore?.name || 'None Selected'}
                </Text>
                {activeStore?.address ? (
                  <Text style={styles.metaSubValue} numberOfLines={1}>
                    {activeStore.address}
                  </Text>
                ) : null}
              </View>

              {/* PWA Install Option */}
              <PWAInstallButton variant="card" />

              <Button
                title="Sign Out"
                variant="danger"
                size="md"
                onPress={async () => {
                  setProfileModalVisible(false);
                  await logout();
                }}
                style={{ marginTop: 14 }}
              />
            </ScrollView>
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
    maxWidth: '65%',
  },
  storeName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginHorizontal: 6,
    flexShrink: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  headerAvatarImage: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
  },
  googleIndicatorBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
    flexShrink: 0,
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
    flexShrink: 0,
  },
  modalLogoThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    flexShrink: 0,
  },
  profileDetails: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  largeAvatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  largeAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Palette.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  largeAvatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: Palette.bluePrimary,
  },
  largeGoogleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  largeAvatarText: {
    fontSize: 26,
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
  googleConnectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
    gap: 5,
  },
  googleConnectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.emerald,
  },
  profileMeta: {
    backgroundColor: Palette.surfaceLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  metaLabel: {
    fontSize: 11,
    color: Palette.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  metaSubValue: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
});
