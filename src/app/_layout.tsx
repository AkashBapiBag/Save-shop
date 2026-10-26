import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/screens/LoginScreen';
import { MainNavigator } from '@/components/MainNavigator';
import { Palette } from '@/theme/designSystem';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

// Inject native desktop application styling on Web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
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

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainNavigator />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  splashLoading: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
