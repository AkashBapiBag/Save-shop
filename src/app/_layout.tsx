import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NetworkProvider, useNetworkStatus } from '@/context/NetworkContext';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { OfflineScreen } from '@/components/ui/OfflineScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoginScreen } from '@/screens/LoginScreen';
import { MainNavigator } from '@/components/MainNavigator';
import { Palette } from '@/theme/designSystem';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Complete pending auth sessions as early as possible on all platforms (Android, iOS, Web)
WebBrowser.maybeCompleteAuthSession();

// Complete pending auth sessions as early as possible on Web
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const isPopup = !!window.opener;
    const hasAuthData =
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('id_token=') ||
      window.location.search.includes('code=');

    if (isPopup || hasAuthData) {
      const res = WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
      if (res?.type === 'success' || isPopup) {
        try {
          window.close();
        } catch {}
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 100);
      }
    }
  } catch {
    // Ignore COOP or window context access restrictions
  }
}

// Inject native desktop application styling and referrer policy on Web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  if (!document.title) {
    document.title = 'My Save Shop';
  }

  // Prevent Google CDN 429/403 hotlinking rate-limiting by omitting localhost/tunnel referrer
  const existingMeta = document.querySelector('meta[name="referrer"]');
  if (!existingMeta) {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
  }

  const styleId = 'save-shop-native-app-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html, body, #root {
        height: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-font-smoothing: antialiased !important;
        background-color: #F8FAFC !important;
        overscroll-behavior: none !important;
      }
      /* Clean native terminal scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: #CBD5E1;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #94A3B8;
      }
      /* Allow text inputs to be selectable and disable browser black focus ring */
      input, textarea, [contenteditable], [data-focusable='true'] {
        user-select: text !important;
        -webkit-user-select: text !important;
        outline: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      input:focus, textarea:focus, [contenteditable]:focus, [data-focusable='true']:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      button, a {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);
  }
}

function RootContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isOffline, checkConnection } = useNetworkStatus();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // If this window is a popup completing Google SSO, render closing indicator instead of full app
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.opener &&
    (window.location.hash.includes('access_token=') ||
      window.location.hash.includes('id_token=') ||
      window.location.search.includes('code='))
  ) {
    return (
      <View style={styles.splashLoading}>
        <ActivityIndicator size="large" color={Palette.navyPrimary} />
        <Text style={{ marginTop: 12, fontSize: 13, color: Palette.textSecondary }}>
          Completing Google sign in...
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.splashLoading}>
        <ActivityIndicator size="large" color={Palette.navyPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      {!isAuthenticated ? <LoginScreen /> : <MainNavigator />}

      {/* Global Full-Screen Offline View:
          When offline, covers the entire screen with one clean, beautiful page
          with proper instructions and retry capability.
          When reconnected, smoothly dismisses without losing active tab or state! */}
      {isOffline && (
        <View style={styles.globalOfflineOverlay}>
          <OfflineScreen
            title="Device is Offline"
            message="My Save Shop requires an active internet connection to securely process transactions, inspect product batches, and synchronize inventory."
            onRetry={async () => {
              await checkConnection();
            }}
          />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <NetworkProvider>
          <AuthProvider>
            <OfflineBanner hideOfflineBanner />
            <RootContent />
          </AuthProvider>
        </NetworkProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  globalOfflineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: '#FFFFFF',
  },
  splashLoading: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
