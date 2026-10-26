import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';
import { Badge } from '@/components/ui/Badge';

export interface SuccessModalDetail {
  label: string;
  value: string;
}

export interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  badgeText?: string;
  variant?: 'success' | 'info';
  details?: SuccessModalDetail[];
  primaryButtonText?: string;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title,
  message,
  badgeText,
  variant = 'success',
  details = [],
  primaryButtonText = 'Done',
  onClose,
}) => {
  const isSuccess = variant === 'success';
  const primaryColor = isSuccess ? Palette.emerald : Palette.bluePrimary;
  const outerCircleColor = isSuccess ? '#DCFCE7' : Palette.blueSoft;
  const innerCircleColor = isSuccess ? '#059669' : Palette.bluePrimary;
  const iconName = isSuccess ? 'checkmark' : 'information';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top Decorative Graphic */}
          <View style={styles.iconContainer}>
            <View style={[styles.outerCircle, { backgroundColor: outerCircleColor }]}>
              <View style={[styles.innerCircle, { backgroundColor: innerCircleColor }]}>
                <Ionicons name={iconName} size={30} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Badge */}
          {badgeText ? (
            <View style={styles.badgeRow}>
              <Badge
                label={badgeText}
                variant={isSuccess ? 'success' : 'primary'}
                size="sm"
              />
            </View>
          ) : null}

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Details Box */}
          {details && details.length > 0 && (
            <View style={styles.detailsBox}>
              {details.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.detailRow,
                    index < details.length - 1 ? styles.detailRowBorder : null,
                  ]}
                >
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: primaryColor }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(4px)' } as any) : {}),
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    ...Shadows.lg,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  badgeRow: {
    marginBottom: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: Palette.navyPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 6,
    marginBottom: 18,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: Palette.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
  },
  detailLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12.5,
    color: Palette.navyPrimary,
    fontWeight: '700',
    maxWidth: '65%',
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
