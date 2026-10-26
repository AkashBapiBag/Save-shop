import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Button } from '@/components/ui/Button';
import {
  pickSignatureImageFromLibrary,
  captureSignatureImageFromCamera,
} from '@/utils/imageUtils';

export interface SignatureUploadModalProps {
  visible: boolean;
  store: Store | null;
  isUploading: boolean;
  onClose: () => void;
  onUpload: (storeId: string, base64: string) => Promise<void>;
}

export const SignatureUploadModal: React.FC<SignatureUploadModalProps> = ({
  visible,
  store,
  isUploading,
  onClose,
  onUpload,
}) => {
  const [sigBase64, setSigBase64] = useState<string | null>(null);
  const [sigPreviewUri, setSigPreviewUri] = useState<string | null>(null);

  const handlePick = async () => {
    const res = await pickSignatureImageFromLibrary();
    if (res) {
      setSigBase64(res.base64);
      setSigPreviewUri(res.dataUri);
    }
  };

  const handleCapture = async () => {
    const res = await captureSignatureImageFromCamera();
    if (res) {
      setSigBase64(res.base64);
      setSigPreviewUri(res.dataUri);
    }
  };

  const handleSave = async () => {
    if (!store || !sigBase64) return;
    await onUpload(store.store_id, sigBase64);
    setSigBase64(null);
    setSigPreviewUri(null);
  };

  if (!store) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Authorized Signature</Text>
              <Text style={styles.modalSub}>{store.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.contentBox}>
            <View style={styles.sigPreviewContainer}>
              {sigPreviewUri ? (
                <Image
                  source={{ uri: sigPreviewUri }}
                  style={styles.sigPreviewImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.sigEmptyBox}>
                  <Ionicons name="pencil-outline" size={28} color={Palette.textMuted} />
                  <Text style={styles.sigEmptyText}>
                    Sign on white paper, photograph with camera or choose from gallery
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.pickButton} onPress={handlePick}>
                <Ionicons name="images-outline" size={16} color={Palette.bluePrimary} />
                <Text style={styles.pickButtonText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickButton} onPress={handleCapture}>
                <Ionicons name="camera-outline" size={16} color={Palette.bluePrimary} />
                <Text style={styles.pickButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>

            {sigPreviewUri && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => {
                  setSigBase64(null);
                  setSigPreviewUri(null);
                }}
              >
                <Ionicons name="trash-outline" size={14} color={Palette.rose} />
                <Text style={styles.removeBtnText}>Remove Image</Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            title="Save Signature"
            variant="primary"
            size="md"
            loading={isUploading}
            disabled={!sigBase64 || isUploading}
            onPress={handleSave}
            style={{ marginTop: 14 }}
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
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
  contentBox: {
    paddingVertical: 4,
  },
  sigPreviewContainer: {
    height: 120,
    backgroundColor: Palette.surfaceLight,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sigPreviewImage: {
    width: '100%',
    height: '100%',
  },
  sigEmptyBox: {
    padding: 16,
    alignItems: 'center',
  },
  sigEmptyText: {
    fontSize: 12,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: Palette.blueSoft,
    borderRadius: 10,
  },
  pickButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.rose,
  },
});
