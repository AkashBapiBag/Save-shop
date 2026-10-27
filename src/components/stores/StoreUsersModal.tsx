import React, { useState, useEffect, useCallback, useContext } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store, StoreOperator, StoreInvitation } from '@/types/api';
import { storeApi } from '@/services/api';
import { Palette, Shadows } from '@/theme/designSystem';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AuthContext } from '@/context/AuthContext';
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
  const auth = useContext(AuthContext);
  const user = auth?.user || null;
  const [emailInput, setEmailInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [operators, setOperators] = useState<StoreOperator[]>([]);
  const [invitations, setInvitations] = useState<StoreInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'operator' | 'invitation';
    id: string;
    email: string;
    name?: string;
    role?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<{
    visible: boolean;
    title: string;
    message: string;
    badgeText: string;
    details: { label: string; value: string }[];
  } | null>(null);

  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const cardHeight = Math.min(Math.round(screenHeight * 0.88), 660);
  const cardWidth = Math.min(Math.round(screenWidth - 32), 520);

  const loadData = useCallback(async () => {
    if (!store?.store_id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await storeApi.getStoreOperators(store.store_id);
      setOperators(data.operators || data.members || []);
      setInvitations(data.invitations || []);
    } catch (err: unknown) {
      logError('StoreUsersModal:loadData', err);
      setLoadError('Could not load operators. Check your connection or store access.');
    } finally {
      setIsLoading(false);
    }
  }, [store?.store_id]);

  useEffect(() => {
    if (visible && store) {
      setEmailInput('');
      setDeleteConfirmation(null);
      setSuccessFeedback(null);
      setLoadError(null);
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
      });
      setEmailInput('');
      await loadData();
      if (onUpdated) onUpdated();

      const title = res.status === 'assigned' ? 'Operator Added!' : 'Invitation Saved!';
      const badgeText = res.status === 'assigned' ? 'ACTIVE ACCESS' : 'PENDING SIGN-IN';
      const assignedRole = res.operator?.role || res.invitation?.role || 'user';
      const assignedRoleLabel = assignedRole === 'admin' ? 'Store Administrator' : 'Staff / Cashier';

      if (Platform.OS === 'web') {
        setSuccessFeedback({
          visible: true,
          title,
          message: res.message,
          badgeText,
          details: [
            { label: 'Store', value: store.name },
            { label: 'Operator Email', value: trimmed },
            {
              label: 'Assigned Role',
              value: assignedRoleLabel,
            },
            {
              label: 'Access Mode',
              value: res.status === 'assigned' ? 'Instant Access' : 'Auto-assign on login',
            },
          ],
        });

        Alert.alert(
          res.status === 'assigned' ? 'Staff Added' : 'Invitation Saved',
          res.message
        );
      }
    } catch (err: unknown) {
      showErrorAlert(err, 'Failed to Add Staff', 'Could not assign or invite staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveOperator = (op: StoreOperator) => {
    setDeleteConfirmation({
      type: 'operator',
      id: op.user_id,
      email: op.email,
      name: op.name,
      role: op.role,
    });
  };

  const handleRevokeInvitation = (inv: StoreInvitation) => {
    setDeleteConfirmation({
      type: 'invitation',
      id: inv.invitation_id,
      email: inv.email,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation || !store?.store_id) return;
    setIsDeleting(true);
    try {
      if (deleteConfirmation.type === 'operator') {
        await storeApi.removeStoreOperator(store.store_id, deleteConfirmation.id);
        await loadData();
        if (onUpdated) onUpdated();
        if (Platform.OS === 'web') {
          setSuccessFeedback({
            visible: true,
            title: deleteConfirmation.role === 'admin' ? 'Administrator Removed' : 'Staff Member Removed',
            message: `Access for ${deleteConfirmation.email} has been removed from ${store.name}.`,
            badgeText: 'ACCESS REMOVED',
            details: [
              { label: 'Store', value: store.name },
              { label: 'Email', value: deleteConfirmation.email },
              {
                label: 'Role Removed',
                value: deleteConfirmation.role === 'admin' ? 'Store Administrator' : 'Staff / Cashier',
              },
            ],
          });
        }
      } else {
        await storeApi.revokeStoreInvitation(store.store_id, deleteConfirmation.id);
        await loadData();
        if (onUpdated) onUpdated();
        if (Platform.OS === 'web') {
          setSuccessFeedback({
            visible: true,
            title: 'Invitation Cancelled',
            message: `Pending invitation for ${deleteConfirmation.email} was removed.`,
            badgeText: 'CANCELLED',
            details: [
              { label: 'Store', value: store.name },
              { label: 'Invited Email', value: deleteConfirmation.email },
            ],
          });
        }
      }
      setDeleteConfirmation(null);
    } catch (err: unknown) {
      showErrorAlert(
        err,
        deleteConfirmation.type === 'operator' ? 'Removal Failed' : 'Cancel Failed',
        deleteConfirmation.type === 'operator' ? 'Could not remove operator.' : 'Could not cancel invitation.'
      );
    } finally {
      setIsDeleting(false);
    }
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
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Dismiss dialog"
        />
        <View style={[styles.modalCard, { width: cardWidth, height: cardHeight }]}>
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
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* Add User by Email Section */}
            <View style={styles.addCard}>
              <View style={styles.addCardHeader}>
                <View style={styles.addIconCircle}>
                  <Ionicons name="person-add" size={15} color={Palette.bluePrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Add Staff / Operator by Email</Text>
                  <Text style={styles.sectionSubtitle}>
                    Role (Admin or Staff) is automatically determined from database
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

              {/* Informational Hint: Role is DB-driven, 1 owner constraint */}
              <View style={styles.roleHintBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={Palette.bluePrimary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.roleHintText}>
                  User role (Admin or Staff) is automatically determined from their database account. A shop has 1 Owner and can have multiple Admins.
                </Text>
              </View>
            </View>

            {loadError ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={26} color={Palette.rose} />
                <Text style={styles.errorCardText}>{loadError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadData} activeOpacity={0.7}>
                  <Ionicons name="refresh" size={14} color={Palette.bluePrimary} />
                  <Text style={styles.retryButtonText}>Retry Loading</Text>
                </TouchableOpacity>
              </View>
            ) : isLoading ? (
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
                  ) : (() => {
                    // STRICT 1-OWNER RULE: Exactly 1 owner user ID for the entire store
                    const resolvedOwnerId =
                      store?.owner_id ||
                      operators.find((o) => o.is_owner)?.user_id ||
                      (!store?.owner_id && store?.email
                        ? operators.find((o) => o.email?.trim().toLowerCase() === store.email?.trim().toLowerCase())?.user_id
                        : null) ||
                      (!store?.owner_id && store?.owner_name
                        ? operators.find((o) => o.name?.trim().toLowerCase() === store.owner_name?.trim().toLowerCase())?.user_id
                        : null);

                    // STRICT RULE: Store Owner is ALWAYS the 1st item in the list
                    const sortedOperators = [...operators].sort((a, b) => {
                      const aIsOwner = Boolean(
                        a.user_id &&
                        resolvedOwnerId &&
                        String(a.user_id).trim().toLowerCase() === String(resolvedOwnerId).trim().toLowerCase()
                      );
                      const bIsOwner = Boolean(
                        b.user_id &&
                        resolvedOwnerId &&
                        String(b.user_id).trim().toLowerCase() === String(resolvedOwnerId).trim().toLowerCase()
                      );
                      if (aIsOwner && !bIsOwner) return -1;
                      if (!aIsOwner && bIsOwner) return 1;
                      return 0;
                    });

                    return sortedOperators.map((op) => {
                      const isCurrentUser = Boolean(
                        (user?.user_id &&
                          op.user_id &&
                          String(op.user_id).trim().toLowerCase() ===
                            String(user.user_id).trim().toLowerCase()) ||
                        (user?.email &&
                          op.email &&
                          op.email.trim().toLowerCase() === user.email.trim().toLowerCase())
                      );
                      // Exactly 1 owner can ever be true in the entire store
                      const isStoreOwner = Boolean(
                        op.user_id &&
                        resolvedOwnerId &&
                        String(op.user_id).trim().toLowerCase() === String(resolvedOwnerId).trim().toLowerCase()
                      );
                      const canDelete = !isStoreOwner && !isCurrentUser;

                      return (
                        <View key={op.user_id} style={styles.memberCard}>
                          <UserAvatar
                            uri={op.picture_url}
                            name={op.name}
                            email={op.email}
                            size={38}
                            style={{ marginRight: 12 }}
                            backgroundColor="#EEF2FF"
                            textStyle={{ color: '#4F46E5' }}
                          />
                          <View style={styles.memberInfo}>
                            <View style={styles.nameRow}>
                              <Text style={styles.memberName} numberOfLines={1}>
                                {op.name || 'Operator'}
                              </Text>
                              {isCurrentUser && (
                                <View style={styles.youBadge}>
                                  <Text style={styles.youBadgeText}>You</Text>
                                </View>
                              )}
                            </View>
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

                          {/* Store Owner gets the Owner shield badge (NEVER deletable) */}
                          {isStoreOwner ? (
                            <View style={styles.ownerShieldBadge}>
                              <Ionicons name="shield-checkmark" size={13} color={Palette.emerald} />
                              <Text style={styles.ownerShieldText}>Owner</Text>
                            </View>
                          ) : canDelete ? (
                            <TouchableOpacity
                              style={styles.removeActionBtn}
                              onPress={() => handleRemoveOperator(op)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityLabel={`Remove ${op.name || op.email}`}
                              testID={`remove-operator-${op.user_id}`}
                            >
                              <Ionicons name="trash-outline" size={17} color={Palette.rose} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      );
                    });
                  })()}
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
                              label={inv.role === 'admin' ? 'Admin Pending' : 'Awaiting Login'}
                              variant={inv.role === 'admin' ? 'purple' : 'warning'}
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
                          accessibilityLabel={`Cancel invitation for ${inv.email}`}
                          testID={`cancel-invitation-${inv.invitation_id}`}
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

          {/* In-Modal Confirmation Dialog for Removing Staff or Revoking Invitation */}
          {deleteConfirmation && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <View style={styles.confirmIconCircle}>
                  <Ionicons name="trash-outline" size={26} color={Palette.rose} />
                </View>

                <Text style={styles.confirmTitle}>
                  {deleteConfirmation.type === 'operator'
                    ? deleteConfirmation.role === 'admin'
                      ? 'Remove Administrator?'
                      : 'Remove Staff Access?'
                    : 'Cancel Invitation?'}
                </Text>

                <Text style={styles.confirmMessage}>
                  {deleteConfirmation.type === 'operator'
                    ? `Are you sure you want to remove ${
                        deleteConfirmation.role === 'admin' ? 'administrator access' : 'access'
                      } for ${
                        deleteConfirmation.name
                          ? `${deleteConfirmation.name} (${deleteConfirmation.email})`
                          : deleteConfirmation.email
                      } from '${store?.name || 'Store'}'?`
                    : `Are you sure you want to cancel the pending invitation for '${deleteConfirmation.email}'?`}
                </Text>

                <View style={styles.confirmNoteBox}>
                  <Ionicons name="information-circle-outline" size={15} color="#B45309" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmNoteText}>
                    {deleteConfirmation.type === 'operator'
                      ? 'They will immediately lose access to this store.'
                      : 'They will no longer be assigned to this store when they sign in.'}
                  </Text>
                </View>

                <View style={styles.confirmButtonRow}>
                  <TouchableOpacity
                    style={styles.confirmCancelButton}
                    onPress={() => setDeleteConfirmation(null)}
                    disabled={isDeleting}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmCancelButtonText}>Keep</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmDeleteButton, isDeleting && styles.confirmDeleteButtonDisabled]}
                    onPress={handleConfirmDelete}
                    disabled={isDeleting}
                    activeOpacity={0.8}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.confirmDeleteInner}>
                        <Ionicons name="trash" size={15} color="#FFFFFF" />
                        <Text style={styles.confirmDeleteButtonText}>
                          {deleteConfirmation.type === 'operator' ? 'Remove Access' : 'Cancel Invite'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          {/* In-Modal Success Feedback Overlay (Desktop Web only) */}
          {Platform.OS === 'web' && successFeedback && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <View style={[styles.confirmIconCircle, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                  <Ionicons name="checkmark-circle" size={28} color={Palette.emerald} />
                </View>

                {successFeedback.badgeText ? (
                  <View style={{ marginBottom: 8 }}>
                    <Badge label={successFeedback.badgeText} variant="success" size="sm" />
                  </View>
                ) : null}

                <Text style={styles.confirmTitle}>{successFeedback.title}</Text>
                <Text style={styles.confirmMessage}>{successFeedback.message}</Text>

                {successFeedback.details && successFeedback.details.length > 0 && (
                  <View style={styles.successDetailsBox}>
                    {successFeedback.details.map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.successDetailRow,
                          idx < successFeedback.details.length - 1 ? styles.successDetailRowBorder : null,
                        ]}
                      >
                        <Text style={styles.successDetailLabel}>{item.label}</Text>
                        <Text style={styles.successDetailValue} numberOfLines={1}>
                          {item.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.successDoneButton}
                  onPress={() => setSuccessFeedback(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.successDoneButtonText}>Great, Got It</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
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
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
    flexGrow: 1,
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
  roleHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.blueSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  roleHintText: {
    flex: 1,
    fontSize: 11.5,
    color: Palette.navyPrimary,
    lineHeight: 16,
    fontWeight: '500',
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
  avatarThumbImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 15,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  youBadge: {
    backgroundColor: Palette.blueSoft,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  ownerShieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  ownerShieldText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.emerald,
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
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    ...Shadows.lg,
  },
  confirmIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.navyPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmMessage: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  confirmNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
    width: '100%',
  },
  confirmNoteText: {
    flex: 1,
    fontSize: 11.5,
    color: '#92400E',
    lineHeight: 16,
  },
  confirmButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  confirmDeleteButton: {
    flex: 1.3,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.rose,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  confirmDeleteButtonDisabled: {
    opacity: 0.6,
  },
  confirmDeleteInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmDeleteButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorCard: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  errorCardText: {
    fontSize: 12.5,
    color: Palette.rose,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 10,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  successDetailsBox: {
    width: '100%',
    backgroundColor: Palette.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  successDetailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  successDetailLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  successDetailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.navyPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  successDoneButton: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  successDoneButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
