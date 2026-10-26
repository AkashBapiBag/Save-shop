import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, Batch } from '@/types/api';
import { Palette } from '@/theme/designSystem';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface BatchInspectionModalProps {
  product: Product | null;
  batches: Batch[];
  isLoading: boolean;
  safeTop: number;
  onClose: () => void;
}

export const BatchInspectionModal: React.FC<BatchInspectionModalProps> = ({
  product,
  batches,
  isLoading,
  safeTop,
  onClose,
}) => {
  if (!product) return null;

  return (
    <Modal
      visible={!!product}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.drawerContainer}>
        <View style={[styles.drawerHeader, { paddingTop: safeTop + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.drawerTitle}>{product.name}</Text>
            <Text style={styles.drawerSubtitle}>
              Category: {product.category} • Total Stock: {product.total_current_stock}{' '}
              {product.default_unit}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-circle" size={26} color={Palette.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.sectionHeader}>FEFO Batches (Earliest Expiry Depleted First)</Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={Palette.navyPrimary} style={{ marginVertical: 20 }} />
          ) : batches.length === 0 ? (
            <View style={styles.emptyBatchBox}>
              <Text style={styles.emptyBatchText}>No batches recorded for this product yet.</Text>
            </View>
          ) : (
            batches.map((batch) => {
              const isDepleted = Number(batch.current_quantity) <= 0;
              const isCritical = batch.days_to_expiry <= 30;

              return (
                <Card key={batch.batch_id} style={styles.batchCard}>
                  <View style={styles.batchHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="layers-outline" size={16} color={Palette.bluePrimary} />
                      <Text style={styles.batchIdentifier}>{batch.batch_identifier}</Text>
                    </View>
                    <Badge
                      label={
                        isDepleted
                          ? 'DEPLETED'
                          : batch.is_expired
                          ? 'EXPIRED'
                          : isCritical
                          ? `${batch.days_to_expiry}d left`
                          : `${batch.days_to_expiry}d safe`
                      }
                      variant={
                        isDepleted
                          ? 'neutral'
                          : batch.is_expired
                          ? 'danger'
                          : isCritical
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    />
                  </View>

                  <View style={styles.batchMetaRow}>
                    <Text style={styles.batchMetaLabel}>Remaining Stock:</Text>
                    <Text style={styles.batchMetaVal}>
                      {batch.current_quantity} / {batch.initial_quantity} {product.default_unit}
                    </Text>
                  </View>
                  <View style={styles.batchMetaRow}>
                    <Text style={styles.batchMetaLabel}>Purchase Price:</Text>
                    <Text style={styles.batchMetaVal}>₹ {Number(batch.purchase_price).toFixed(2)}</Text>
                  </View>
                  <View style={styles.batchMetaRow}>
                    <Text style={styles.batchMetaLabel}>Expires On:</Text>
                    <Text style={styles.batchMetaVal}>{batch.expiry_date}</Text>
                  </View>
                  <View style={styles.batchMetaRow}>
                    <Text style={styles.batchMetaLabel}>Acquired On:</Text>
                    <Text style={styles.batchMetaVal}>{batch.purchase_date}</Text>
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  drawerSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.navyPrimary,
    marginBottom: 12,
  },
  emptyBatchBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyBatchText: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  batchCard: {
    marginBottom: 10,
    padding: 12,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchIdentifier: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginLeft: 6,
  },
  batchMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  batchMetaLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  batchMetaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
});
