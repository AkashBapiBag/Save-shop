import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Typography, Shadows } from '@/theme/designSystem';
import { useNetworkStatus } from '@/context/NetworkContext';

export interface OfflineScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => Promise<void> | void;
  compact?: boolean;
  showDismiss?: boolean;
  onDismiss?: () => void;
}

export const OfflineScreen: React.FC<OfflineScreenProps> = ({
  title = 'Device is Offline',
  message = 'SaveShop requires an active internet connection to securely process transactions, inspect product batches, and synchronize inventory.',
  onRetry,
  compact = false,
  showDismiss = false,
  onDismiss,
}) => {
  const { checkConnection, isChecking: contextChecking } = useNetworkStatus();
  const [localChecking, setLocalChecking] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Animation values
  const pulseScale1 = useRef(new Animated.Value(1)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.6)).current;
  const pulseScale2 = useRef(new Animated.Value(1)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0.4)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Start smooth radar ripple and float animations
  useEffect(() => {
    // Radar ring 1
    const radarAnimation1 = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale1, {
          toValue: 1.7,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity1, {
          toValue: 0,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Radar ring 2 (delayed offset)
    const radarAnimation2 = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.parallel([
          Animated.timing(pulseScale2, {
            toValue: 1.9,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity2, {
            toValue: 0,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Floating breathing badge
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    radarAnimation1.start();
    radarAnimation2.start();
    floatAnimation.start();

    return () => {
      radarAnimation1.stop();
      radarAnimation2.stop();
      floatAnimation.stop();
    };
  }, [pulseScale1, pulseOpacity1, pulseScale2, pulseOpacity2, floatAnim]);

  // Trigger tactile shake animation when a retry fails
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -10, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const isChecking = localChecking || contextChecking;

  const handleRetry = async () => {
    if (isChecking) return;
    setLocalChecking(true);
    setFeedbackMessage(null);

    try {
      if (onRetry) {
        await onRetry();
      }
      const isOnline = await checkConnection();
      if (!isOnline) {
        triggerShake();
        setFeedbackMessage('Still offline. Please verify Wi-Fi or mobile data.');
      } else {
        setFeedbackMessage(null);
      }
    } catch {
      triggerShake();
      setFeedbackMessage('Connection attempt failed. Please check network.');
    } finally {
      setLocalChecking(false);
    }
  };

  const content = (
    <View style={[styles.innerContainer, compact && styles.compactInner]}>
      {/* Animated Radar Pulse & Floating Offline Icon */}
      <View style={[styles.illustrationContainer, compact && styles.compactIllustration]}>
        {/* Animated Expanding Ripple 2 */}
        <Animated.View
          style={[
            styles.radarWave,
            styles.radarWaveOuter,
            {
              transform: [{ scale: pulseScale2 }],
              opacity: pulseOpacity2,
            },
          ]}
        />
        {/* Animated Expanding Ripple 1 */}
        <Animated.View
          style={[
            styles.radarWave,
            styles.radarWaveInner,
            {
              transform: [{ scale: pulseScale1 }],
              opacity: pulseOpacity1,
            },
          ]}
        />

        {/* Central Floating Badge with Offline Device Icon */}
        <Animated.View
          style={[
            styles.iconBadge,
            compact && styles.compactIconBadge,
            {
              transform: [{ translateY: floatAnim }, { translateX: shakeAnim }],
            },
          ]}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={compact ? 36 : 48}
            color={Palette.rose}
          />
          <View style={styles.badgeWarningPill}>
            <Ionicons name="alert" size={12} color="#FFFFFF" />
          </View>
        </Animated.View>
      </View>

      {/* Meaningful Status & Messages */}
      <View style={styles.textContainer}>
        <View style={styles.statusPill}>
          <View style={styles.pulsingDot} />
          <Text style={styles.statusPillText}>DISCONNECTED</Text>
        </View>

        <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
        <Text style={[styles.message, compact && styles.compactMessage]}>{message}</Text>
      </View>

      {/* Feedback Alert if Retry Fails */}
      {feedbackMessage ? (
        <View style={styles.feedbackAlert}>
          <Ionicons name="information-circle-outline" size={16} color={Palette.rose} />
          <Text style={styles.feedbackText}>{feedbackMessage}</Text>
        </View>
      ) : null}

      {/* Helpful Troubleshooting Checklist (Shown in Full Screen mode) */}
      {!compact && (
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Troubleshooting Checklist</Text>
          <View style={styles.tipRow}>
            <View style={styles.tipIconBox}>
              <Ionicons name="wifi-outline" size={16} color={Palette.bluePrimary} />
            </View>
            <Text style={styles.tipText}>Check if your Wi-Fi or Cellular Data is enabled</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={styles.tipIconBox}>
              <Ionicons name="airplane-outline" size={16} color={Palette.amber} />
            </View>
            <Text style={styles.tipText}>Verify that Airplane Mode is turned off</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={styles.tipIconBox}>
              <Ionicons name="server-outline" size={16} color={Palette.emerald} />
            </View>
            <Text style={styles.tipText}>Ensure your local store router has active internet</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.retryButton, isChecking && styles.retryButtonDisabled]}
          onPress={handleRetry}
          activeOpacity={0.8}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="reload-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.retryButtonText}>
            {isChecking ? 'Checking Connection...' : 'Try Again'}
          </Text>
        </TouchableOpacity>

        {showDismiss && onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (compact) {
    return <View style={styles.compactWrapper}>{content}</View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {content}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  compactWrapper: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  innerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 440,
  },
  compactInner: {
    maxWidth: 360,
  },
  illustrationContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  compactIllustration: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  radarWave: {
    position: 'absolute',
    borderRadius: 9999,
  },
  radarWaveInner: {
    width: 96,
    height: 96,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  radarWaveOuter: {
    width: 110,
    height: 110,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.md,
  },
  compactIconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  badgeWarningPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Palette.rose,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Palette.rose,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.rose,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Palette.navyPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  compactTitle: {
    fontSize: 18,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 380,
  },
  compactMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    maxWidth: 360,
  },
  feedbackText: {
    fontSize: 13,
    color: Palette.rose,
    marginLeft: 6,
    fontWeight: '500',
  },
  tipsCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    padding: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.navyPrimary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  tipText: {
    fontSize: 13,
    color: Palette.textSecondary,
    flex: 1,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.navyPrimary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    ...Shadows.md,
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dismissButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissButtonText: {
    color: Palette.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
