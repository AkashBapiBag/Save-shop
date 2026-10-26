import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StoreCreateRequest } from '@/types/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  pickSquareImageFromLibrary,
  captureSquareImageFromCamera,
  pickSignatureImageFromLibrary,
  captureSignatureImageFromCamera,
} from '@/utils/imageUtils';

export interface CreateStoreModalProps {
  visible: boolean;
  selectedState: string;
  isCreating: boolean;
  onClose: () => void;
  onRequestSelectState: () => void;
  onSubmit: (payload: StoreCreateRequest) => Promise<void>;
}

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  visible,
  selectedState,
  isCreating,
  onClose,
  onRequestSelectState,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoPreviewUri, setLogoPreviewUri] = useState<string | null>(null);
  const [sigBase64, setSigBase64] = useState<string | null>(null);
  const [sigPreviewUri, setSigPreviewUri] = useState<string | null>(null);

  const handlePickLogo = async () => {
    const res = await pickSquareImageFromLibrary();
    if (res) {
      setLogoBase64(res.base64);
      setLogoPreviewUri(res.dataUri);
    }
  };

  const handleCaptureLogo = async () => {
    const res = await captureSquareImageFromCamera();
    if (res) {
      setLogoBase64(res.base64);
      setLogoPreviewUri(res.dataUri);
    }
  };

  const handlePickSignature = async () => {
    const res = await pickSignatureImageFromLibrary();
    if (res) {
      setSigBase64(res.base64);
      setSigPreviewUri(res.dataUri);
    }
  };

  const handleCaptureSignature = async () => {
    const res = await captureSignatureImageFromCamera();
    if (res) {
      setSigBase64(res.base64);
      setSigPreviewUri(res.dataUri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please provide a store name.');
      return;
    }

    await onSubmit({
      name: name.trim(),
      owner_name: ownerName.trim() || undefined,
      phone_number: phone.trim() || undefined,
      address: address.trim() || undefined,
      state: selectedState || '19-West Bengal',
      email: email.trim() || undefined,
      logo_base64: logoBase64 || undefined,
      authorized_signature_base64: sigBase64 || undefined,
    });

    setName('');
    setOwnerName('');
    setPhone('');
    setAddress('');
    setEmail('');
    setLogoBase64(null);
    setLogoPreviewUri(null);
    setSigBase64(null);
    setSigPreviewUri(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCardLarge}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <Text style={styles.modalTitle}>Create New Store</Text>
              <Text style={styles.modalSub}>
                Add a new store branch to your account
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 480 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Square Logo Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Store Logo</Text>
              <Text style={styles.sectionSub}>
                Used on your printed receipts and bills
              </Text>

              <View style={styles.imagePickerRow}>
                <View style={styles.squareLogoPreviewContainer}>
                  {logoPreviewUri ? (
                    <Image
                      source={{ uri: logoPreviewUri }}
                      style={styles.squareLogoPreviewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.squareEmptyBox}>
                      <Ionicons name="image-outline" size={30} color={Palette.textMuted} />
                      <Text style={styles.squareEmptyText}>Add Logo</Text>
                    </View>
                  )}
                </View>

                <View style={styles.imagePickerActions}>
                  <TouchableOpacity
                    style={styles.pickButton}
                    onPress={handlePickLogo}
                  >
                    <Ionicons name="images-outline" size={16} color={Palette.bluePrimary} />
                    <Text style={styles.pickButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pickButton}
                    onPress={handleCaptureLogo}
                  >
                    <Ionicons name="camera-outline" size={16} color={Palette.bluePrimary} />
                    <Text style={styles.pickButtonText}>Take Photo</Text>
                  </TouchableOpacity>

                  {logoPreviewUri && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => {
                        setLogoBase64(null);
                        setLogoPreviewUri(null);
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color={Palette.rose} />
                      <Text style={styles.removeImageText}>Remove Logo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Text Fields */}
            <Input
              label="Store Name *"
              placeholder="e.g. Save Shop Downtown Central"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Owner / Proprietor Name"
              placeholder="e.g. Jane Doe"
              value={ownerName}
              onChangeText={setOwnerName}
            />

            <Input
              label="Official Email"
              placeholder="store@saveshop.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Input
              label="Physical Address"
              placeholder="Street address, City, ZIP code"
              value={address}
              onChangeText={setAddress}
            />

            {/* Store State Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>
                Store State (GST) <Text style={{ color: Palette.rose }}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.stateSelectButton}
                onPress={onRequestSelectState}
              >
                <View style={styles.stateSelectLeft}>
                  <View style={styles.stateBadge}>
                    <Ionicons name="map" size={18} color={Palette.bluePrimary} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.stateSelectText, !selectedState && { color: Palette.textMuted }]}>
                      {selectedState || 'Select State / Jurisdiction'}
                    </Text>
                    <Text style={styles.stateSelectSub}>Official Tax Invoice Jurisdiction</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Signature Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Authorized Billing Signature</Text>
              <Text style={styles.sectionSub}>
                Will appear on official tax invoices & receipts generated by this store
              </Text>

              <View style={styles.sigPreviewBox}>
                {sigPreviewUri ? (
                  <Image
                    source={{ uri: sigPreviewUri }}
                    style={styles.sigPreviewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.sigEmptyBox}>
                    <Ionicons name="pencil-outline" size={24} color={Palette.textMuted} />
                    <Text style={styles.sigEmptyText}>No signature selected yet</Text>
                  </View>
                )}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.pickButton} onPress={handlePickSignature}>
                  <Ionicons name="images-outline" size={16} color={Palette.bluePrimary} />
                  <Text style={styles.pickButtonText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickButton} onPress={handleCaptureSignature}>
                  <Ionicons name="camera-outline" size={16} color={Palette.bluePrimary} />
                  <Text style={styles.pickButtonText}>Camera</Text>
                </TouchableOpacity>
              </View>

              {sigPreviewUri && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => {
                    setSigBase64(null);
                    setSigPreviewUri(null);
                  }}
                >
                  <Ionicons name="trash-outline" size={14} color={Palette.rose} />
                  <Text style={styles.removeImageText}>Remove Signature</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          <Button
            title="Create & Register Store"
            variant="primary"
            size="md"
            loading={isCreating}
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
  modalCardLarge: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  formSection: {
    backgroundColor: Palette.surfaceLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.navyPrimary,
  },
  sectionSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  squareLogoPreviewContainer: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  squareLogoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  squareEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareEmptyText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.textMuted,
    marginTop: 4,
  },
  imagePickerActions: {
    flex: 1,
    gap: 8,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  pickButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  removeImageText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.rose,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginBottom: 6,
  },
  stateSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stateSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stateBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateSelectText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.navyPrimary,
  },
  stateSelectSub: {
    fontSize: 10.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  sigPreviewBox: {
    height: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  sigPreviewImage: {
    width: '100%',
    height: '100%',
  },
  sigEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigEmptyText: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
