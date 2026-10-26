import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatImageUri } from '@/utils/imageUtils';

export interface StoreCardProps {
  item: Store;
  isActive: boolean;
  isAdmin: boolean;
  onSwitchStore: (storeId: string) => void;
  onEditStore: (store: Store) => void;
  onQuickSignature: (store: Store) => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  item,
  isActive,
  isAdmin,
  onSwitchStore,
  onEditStore,
  onQuickSignature,
}) => {
  const logoUri = formatImageUri(item.logo_base64 || item.logo_url);

  return (
    <Card style={[styles.storeCard, isActive && styles.storeCardActive]}>
      {/* Top Header Row */}
      <View style={styles.storeCardHeader}>
        <View style={styles.storeHeaderLeft}>
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              style={styles.storeLogoThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.storeLogoPlaceholder}>
              <Ionicons name="storefront" size={24} color={Palette.bluePrimary} />
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.nameRow}>
              <Text style={styles.storeName}>{item.name}</Text>
              {isActive && (
                <Badge
                  label="ACTIVE STORE"
                  variant="primary"
                  size="sm"
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
            <Text style={styles.storeOwner}>
              {item.owner_name ? `Owner: ${item.owner_name}` : 'Multi-Store Operator'}
            </Text>
          </View>
        </View>

        {!isActive && (
          <Button
            title="Switch"
            variant="secondary"
            size="sm"
            onPress={() => onSwitchStore(item.store_id)}
          />
        )}
      </View>

      {/* Store Metadata */}
      <View style={styles.storeDetailsSection}>
        {item.phone_number ? (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color={Palette.textSecondary} />
            <Text style={styles.detailText}>{item.phone_number}</Text>
          </View>
        ) : null}

        {item.email ? (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={14} color={Palette.textSecondary} />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
        ) : null}

        {item.address ? (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={Palette.textSecondary} />
            <Text style={styles.detailText} numberOfLines={2}>
              {item.address}
            </Text>
          </View>
        ) : null}

        <View style={styles.detailRow}>
          <Ionicons name="map-outline" size={14} color={Palette.textSecondary} />
          <Text style={styles.detailText}>
            GST Jurisdiction:{' '}
            <Text style={{ fontWeight: '700', color: Palette.navyPrimary }}>
              {item.state || '19-West Bengal'}
            </Text>
          </Text>
        </View>
      </View>

      {/* Asset Status Badges */}
      <View style={styles.badgeRow}>
        <View style={styles.badgeItem}>
          <Ionicons
            name={item.has_logo || item.logo_base64 || item.logo_url ? 'checkmark-circle' : 'close-circle-outline'}
            size={14}
            color={item.has_logo || item.logo_base64 || item.logo_url ? Palette.emerald : Palette.textMuted}
          />
          <Text style={styles.badgeItemText}>
            {item.has_logo || item.logo_base64 || item.logo_url ? 'Square Logo Added' : 'No Logo'}
          </Text>
        </View>

        <View style={styles.badgeItem}>
          <Ionicons
            name={item.has_signature ? 'checkmark-circle' : 'alert-circle-outline'}
            size={14}
            color={item.has_signature ? Palette.emerald : Palette.amber}
          />
          <Text style={styles.badgeItemText}>
            {item.has_signature ? 'Signature Configured' : 'Signature Pending'}
          </Text>
        </View>
      </View>

      {/* Bottom Actions Row (Admin Only) */}
      {isAdmin && (
        <View style={styles.storeCardBottom}>
          <TouchableOpacity
            style={styles.actionLinkButton}
            onPress={() => onEditStore(item)}
          >
            <Ionicons name="create-outline" size={14} color={Palette.bluePrimary} />
            <Text style={styles.actionLinkText}>Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionLinkButton}
            onPress={() => onQuickSignature(item)}
          >
            <Ionicons name="pencil-outline" size={14} color={Palette.navyPrimary} />
            <Text style={[styles.actionLinkText, { color: Palette.navyPrimary }]}>
              {item.has_signature ? 'Change Signature' : 'Upload Signature'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  storeCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    ...Shadows.sm,
  },
  storeCardActive: {
    borderColor: Palette.bluePrimary,
    backgroundColor: '#FFFFFF',
  },
  storeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeLogoThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  storeLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  storeOwner: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  storeDetailsSection: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: Palette.textSecondary,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 4,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  storeCardBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Palette.surfaceMuted,
    paddingTop: 10,
    marginTop: 6,
  },
  actionLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
});
