import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';
import { useNetworkStatus } from '@/context/NetworkContext';

export interface OfflineBannerProps {
  hideOfflineBanner?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  hideOfflineBanner = false,
}) => {
  const { isOffline, checkConnection, isChecking } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, Platform.OS === 'android' ? 24 : 10);

  const [visible, setVisible] = useState<boolean>(false);
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wasOffline = useRef<boolean>(false);
  const useNativeDriver = Platform.OS !== 'web';

  // Pulsing animation for the warning dot
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (isOffline && !hideOfflineBanner) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver,
          }),
        ])
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      pulseLoop?.stop();
    };
  }, [isOffline, pulseAnim, useNativeDriver, hideOfflineBanner]);

  // Slide banner in/out based on offline status
  useEffect(() => {
    if (isOffline) {
      wasOffline.current = true;
      setJustReconnected(false);
      if (!hideOfflineBanner) {
        setVisible(true);
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver,
          bounciness: 4,
        }).start();
      } else {
        setVisible(false);
      }
    } else if (wasOffline.current) {
      // Just reconnected
      wasOffline.current = false;
      setJustReconnected(true);
      setVisible(true);

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver,
        bounciness: 4,
      }).start();

      const hideTimer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 350,
          useNativeDriver,
        }).start(() => {
          setVisible(false);
          setJustReconnected(false);
        });
      }, 2500);

      return () => clearTimeout(hideTimer);
    }
  }, [isOffline, translateY, useNativeDriver, hideOfflineBanner]);

  if (!visible) return null;

  const isReconnected = justReconnected && !isOffline;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        { top: safeTop, transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bannerContent,
          isReconnected ? styles.bannerReconnected : styles.bannerOffline,
        ]}
      >
        <View style={styles.leftSection}>
          {isReconnected ? (
            <Ionicons name="checkmark-circle" size={18} color={Palette.emerald} style={{ marginRight: 8 }} />
          ) : (
            <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
          )}

          <Text style={[styles.bannerText, isReconnected && styles.bannerTextSuccess]}>
            {isReconnected ? 'Back Online! Connection restored.' : 'No Internet • Device Offline'}
          </Text>
        </View>

        {!isReconnected && (
          <TouchableOpacity
            style={styles.retryChip}
            onPress={() => void checkConnection()}
            disabled={isChecking}
            activeOpacity={0.7}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color={Palette.rose} />
            ) : (
              <>
                <Ionicons name="reload-outline" size={13} color={Palette.rose} style={{ marginRight: 4 }} />
                <Text style={styles.retryChipText}>Retry</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    ...Shadows.md,
  },
  bannerOffline: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  bannerReconnected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.rose,
    marginRight: 8,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.rose,
    flexShrink: 1,
  },
  bannerTextSuccess: {
    color: Palette.emeraldDark,
  },
  retryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginLeft: 8,
  },
  retryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.rose,
  },
});
