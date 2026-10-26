import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store, StoreOperator, StoreInvitation } from '@/types/api';
import { storeApi } from '@/services/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { showErrorAlert, logError } from '@/utils/errorHandler';

export interface StoreUsersModalProps {
  visible: boolean;
  store: Store | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const StoreUsersModal: React.FC<StoreUsersModalProps> = ({
  visible,
  store,
  onClose,
  onUpdated,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [operators, setOperators] = useState<StoreOperator[]>([]);
  const [invitations, setInvitations] = useState<StoreInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<{
    visible: boolean;
    title: string;
    message: string;
    badgeText: string;
    details: { label: string; value: string }[];
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!store?.store_id) return;
    setIsLoading(true);
    try {
      const data = await storeApi.getStoreOperators(store.store_id);
      setOperators(data.operators || data.members || []);
      setInvitations(data.invitations || []);
    } catch (err: unknown) {
      logError('StoreUsersModal:loadData', err);
    } finally {
      setIsLoading(false);
    }
  }, [store?.store_id]);

  useEffect(() => {
    if (visible && store) {
      setEmailInput('');
      loadData();
    }
  }, [visible, store, loadData]);

  const handleAddOperator = async () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Required Field', 'Please enter a valid user email address.');
      return;
    }
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address format.');
      return;
    }
    if (!store?.store_id) return;

    setIsSubmitting(true);
    try {
      const res = await storeApi.addStoreOperator(store.store_id, {
        email: trimmed,
        role: 'user',
      });
      setEmailInput('');
      await loadData();
      if (onUpdated) onUpdated();

      const title = res.status === 'assigned' ? 'Operator Added!' : 'Invitation Saved!';
      const badgeText = res.status === 'assigned' ? 'ACTIVE ACCESS' : 'PENDING SIGN-IN';

      setSuccessFeedback({
        visible: true,
        title,
        message: res.message,
        badgeText,
        details: [
          { label: 'Store', value: store.name },
          { label: 'Operator Email', value: trimmed },
          {
            label: 'Access Mode',
            value: res.status === 'assigned' ? 'Instant Operator Access' : 'Auto-assign on login',
          },
        ],
      });

      Alert.alert(
        res.status === 'assigned' ? 'Staff Added' : 'Invitation Saved',
        res.message
      );
    } catch (err: unknown) {
      showErrorAlert(err, 'Failed to Add Staff', 'Could not assign or invite staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveOperator = (op: StoreOperator) => {
    if (!store?.store_id) return;
    Alert.alert(
      'Remove Staff Member',
      `Remove access to '${store.name}' for ${op.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await storeApi.removeStoreOperator(store.store_id, op.user_id);
              await loadData();
              if (onUpdated) onUpdated();
              Alert.alert('Access Removed', `Operator ${op.email} has been removed from this store.`);
            } catch (err: unknown) {
              showErrorAlert(err, 'Removal Failed', 'Could not remove operator.');
            }
          },
        },
      ]
    );
  };

  const handleRevokeInvitation = (inv: StoreInvitation) => {
    if (!store?.store_id) return;
    Alert.alert(
      'Cancel Invitation',
      `Cancel pending invitation for ${inv.email}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Invite',
          style: 'destructive',
          onPress: async () => {
            try {
              await storeApi.revokeStoreInvitation(store.store_id, inv.invitation_id);
              await loadData();
              if (onUpdated) onUpdated();
              Alert.alert('Cancelled', `Pending invitation for ${inv.email} was removed.`);
            } catch (err: unknown) {
              showErrorAlert(err, 'Revoke Failed', 'Could not cancel invitation.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.storeIconCircle}>
                <Ionicons name="storefront" size={18} color={Palette.bluePrimary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.title}>Store Staff</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {store?.name || 'Store'} • Staff & Cashier Access
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={Palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Add User by Email Section */}
            <View style={styles.addCard}>
              <View style={styles.addCardHeader}>
                <View style={styles.addIconCircle}>
                  <Ionicons name="person-add" size={15} color={Palette.bluePrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Add Staff by Email</Text>
                  <Text style={styles.sectionSubtitle}>
                    Grant store access to a staff member or cashier
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <View style={[styles.inputWrapper, isInputFocused && styles.inputWrapperFocused]}>
                  <Ionicons
                    name="mail-outline"
                    size={17}
                    color={isInputFocused ? Palette.bluePrimary : Palette.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="cashier@example.com"
                    placeholderTextColor={Palette.textMuted}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleAddOperator}
                    returnKeyType="done"
                  />
                  {emailInput.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setEmailInput('')}
                      style={styles.clearBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color={Palette.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.addButton,
                    !emailInput.trim() ? styles.addButtonDisabled : styles.addButtonActive,
                  ]}
                  onPress={handleAddOperator}
                  disabled={isSubmitting || !emailInput.trim()}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={styles.addButtonInner}>
                      <Ionicons
                        name="add"
                        size={18}
                        color={!emailInput.trim() ? Palette.textMuted : '#FFFFFF'}
                      />
                      <Text
                        style={[
                          styles.addButtonText,
                          !emailInput.trim()
                            ? styles.addButtonTextDisabled
                            : styles.addButtonTextActive,
                        ]}
                      >
                        Add
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.tipBox}>
                <Ionicons
                  name="flash-outline"
                  size={13}
                  color={Palette.bluePrimary}
                  style={{ marginRight: 6, marginTop: 1 }}
                />
                <Text style={styles.tipText}>
                  Registered users get instant access. Unregistered users are auto-assigned as soon as they sign in.
                </Text>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={Palette.bluePrimary} />
                <Text style={styles.loadingText}>Loading store operators...</Text>
              </View>
            ) : (
              <>
                {/* Active Operators List */}
                <View style={styles.listSection}>
                  <View style={styles.listSectionHeader}>
                    <Text style={styles.listSectionTitle}>Active Operators</Text>
                    <View style={styles.counterBadge}>
                      <Text style={styles.counterText}>{operators.length}</Text>
                    </View>
                  </View>

                  {operators.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="people-outline" size={26} color={Palette.textMuted} />
                      <Text style={styles.emptyText}>No assigned operators for this store yet.</Text>
                    </View>
                  ) : (
                    operators.map((op) => (
                      <View key={op.user_id} style={styles.memberCard}>
                        <View style={styles.avatarThumb}>
                          <Text style={styles.avatarText}>
                            {(op.name || op.email || 'U')[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {op.name || 'Operator'}
                          </Text>
                          <Text style={styles.memberEmail} numberOfLines={1}>
                            {op.email}
                          </Text>
                          <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                            <Badge
                              label={op.role?.toUpperCase() || 'OPERATOR'}
                              variant={op.role === 'admin' ? 'purple' : 'primary'}
                              size="sm"
                            />
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.removeActionBtn}
                          onPress={() => handleRemoveOperator(op)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={17} color={Palette.rose} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

                {/* Pending Invitations List */}
                <View style={styles.listSection}>
                  <View style={styles.listSectionHeader}>
                    <Text style={styles.listSectionTitle}>Pending Invitations</Text>
                    <View style={[styles.counterBadge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.counterText, { color: '#B45309' }]}>
                        {invitations.length}
                      </Text>
                    </View>
                  </View>

                  {invitations.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="mail-unread-outline" size={26} color={Palette.textMuted} />
                      <Text style={styles.emptyText}>No pending email invitations.</Text>
                    </View>
                  ) : (
                    invitations.map((inv) => (
                      <View key={inv.invitation_id} style={styles.inviteCard}>
                        <View style={styles.inviteIcon}>
                          <Ionicons name="time-outline" size={18} color="#D97706" />
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {inv.email}
                          </Text>
                          <View style={styles.inviteMetaRow}>
                            <Badge
                              label="Awaiting Login"
                              variant="warning"
                              size="sm"
                            />
                            <Text style={styles.inviteNote}>
                              Auto-assigns on sign in
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.removeActionBtn}
                          onPress={() => handleRevokeInvitation(inv)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle-outline" size={20} color={Palette.rose} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Done"
              variant="secondary"
              size="md"
              onPress={onClose}
              style={{ width: '100%', borderRadius: 12 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modern In-App Success Feedback Modal */}
      {successFeedback && (
        <SuccessModal
          visible={successFeedback.visible}
          title={successFeedback.title}
          message={successFeedback.message}
          badgeText={successFeedback.badgeText}
          details={successFeedback.details}
          primaryButtonText="Great, Got It"
          onClose={() => setSuccessFeedback(null)}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  storeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 16,
  },
  addCard: {
    backgroundColor: Palette.surfaceLight,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    marginBottom: 20,
  },
  addCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Palette.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.navyPrimary,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: Palette.bluePrimary,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontSize: 13.5,
    color: Palette.textPrimary,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  clearBtn: {
    padding: 4,
  },
  addButton: {
    height: 46,
    minWidth: 84,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonActive: {
    backgroundColor: Palette.bluePrimary,
    ...Shadows.sm,
  },
  addButtonDisabled: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  addButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  addButtonTextActive: {
    color: '#FFFFFF',
  },
  addButtonTextDisabled: {
    color: Palette.textMuted,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Palette.blueSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 11.5,
    color: Palette.bluePrimary,
    lineHeight: 16,
    fontWeight: '500',
  },
  centerLoading: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: Palette.textSecondary,
  },
  listSection: {
    marginBottom: 20,
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  listSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.navyPrimary,
  },
  counterBadge: {
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.borderLight,
  },
  emptyText: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 6,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...Shadows.sm,
  },
  avatarThumb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 15,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  memberEmail: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  removeActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#FEF08A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  inviteIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  inviteNote: {
    fontSize: 11,
    color: '#92400E',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: Palette.borderLight,
    backgroundColor: '#FFFFFF',
  },
});
