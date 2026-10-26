import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'pill' | 'card' | 'link';
  style?: any;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'pill',
  style,
}) => {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  // If already installed or not running on web, don't show
  if (Platform.OS !== 'web' || isInstalled || !canInstall) {
    return null;
  }

  const handlePress = async () => {
    if (isIOS) {
      setShowIosGuide(true);
    } else {
      await promptInstall();
    }
  };

  const renderContent = () => {
    if (variant === 'card') {
      return (
        <TouchableOpacity
          style={[styles.cardContainer, style]}
          activeOpacity={0.8}
          onPress={handlePress}
        >
          <View style={styles.cardIconBox}>
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>Install Save Shop App</Text>
            <Text style={styles.cardSubtitle}>
              Fast, fullscreen offline-capable home screen app
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={Palette.bluePrimary} />
        </TouchableOpacity>
      );
    }

    if (variant === 'link') {
      return (
        <TouchableOpacity
          style={[styles.linkContainer, style]}
          activeOpacity={0.7}
          onPress={handlePress}
        >
          <Ionicons name="phone-portrait-outline" size={15} color={Palette.bluePrimary} />
          <Text style={styles.linkText}>Install Web App on Phone</Text>
        </TouchableOpacity>
      );
    }

    // Default 'pill'
    return (
      <TouchableOpacity
        style={[styles.pillContainer, style]}
        activeOpacity={0.75}
        onPress={handlePress}
      >
        <Ionicons name="download-outline" size={14} color="#FFFFFF" />
        <Text style={styles.pillText}>Install App</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {renderContent()}

      {/* iOS Add to Home Screen Instructions Modal */}
      <Modal
        visible={showIosGuide}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIosGuide(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIosGuide(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="logo-apple" size={20} color={Palette.textPrimary} />
                <Text style={styles.modalTitle}>Install on iOS / Safari</Text>
              </View>
              <TouchableOpacity onPress={() => setShowIosGuide(false)}>
                <Ionicons name="close" size={22} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              To install Save Shop as an app on your iPhone or iPad:
            </Text>

            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Tap the Share icon</Text>
                <Text style={styles.stepDesc}>
                  In Safari's bottom toolbar, tap the square icon with an upward arrow.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Select &quot;Add to Home Screen&quot;</Text>
                <Text style={styles.stepDesc}>
                  Scroll down the share options list and tap &quot;Add to Home Screen&quot;.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Tap &quot;Add&quot;</Text>
                <Text style={styles.stepDesc}>
                  Confirm in the top-right corner. Save Shop will appear on your home screen!
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.gotItButton}
              onPress={() => setShowIosGuide(false)}
            >
              <Text style={styles.gotItButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bluePrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
    marginRight: 8,
    ...Shadows.sm,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.bluePrimary,
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTextBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  cardSubtitle: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  stepDesc: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  gotItButton: {
    backgroundColor: Palette.bluePrimary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  gotItButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
