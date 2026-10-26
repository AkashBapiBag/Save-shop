import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '@/context/AuthContext';
import {
  configureGoogleSignIn,
  isNativeGoogleSignInAvailable,
  signInWithNativeGoogle,
} from '@/services/nativeGoogleAuth';
import { Palette, Typography, Shadows } from '@/theme/designSystem';
import { Card } from '@/components/ui/Card';
import { PWAInstallButton } from '@/components/ui/PWAInstallModal';

// Complete pending auth sessions for browser redirect flows
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const res = WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
    if (res?.type === 'success' || !!window.opener) {
      try {
        window.close();
      } catch {}
      setTimeout(() => {
        try {
          window.close();
        } catch {}
      }, 100);
    }
  } catch {}
} else {
  WebBrowser.maybeCompleteAuthSession();
}

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Client IDs from environment
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

  const isGoogleConfigured = !!(webClientId || androidClientId || iosClientId);

  // Configure native Google Sign-In SDK on mobile platforms (Android/iOS)
  useEffect(() => {
    if (Platform.OS !== 'web' && webClientId) {
      configureGoogleSignIn(webClientId);
    }
  }, [webClientId]);

  // Select the appropriate platform Client ID
  const platformClientId =
    Platform.OS === 'android' && androidClientId
      ? androidClientId
      : Platform.OS === 'ios' && iosClientId
      ? iosClientId
      : webClientId || 'placeholder-google-client-id.apps.googleusercontent.com';

  const redirectUri =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : AuthSession.makeRedirectUri({
          scheme: 'saveshop',
          native: 'com.saveshop.app:/oauthredirect',
        });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: platformClientId,
    webClientId: webClientId || undefined,
    androidClientId: androidClientId || undefined,
    iosClientId: iosClientId || undefined,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  });

  const handleTokenExchange = useCallback(
    async (token: string, idToken?: string, accessToken?: string) => {
      setError(null);
      try {
        await login({
          google_token: token,
          id_token: idToken,
          access_token: accessToken,
        });
      } catch (err: any) {
        const msg = err?.message || 'Unable to sign in. Please try again.';
        setError(msg);
        if (Platform.OS === 'web') {
          console.error('[SaveShop] Sign In Failed:', msg, err);
        } else {
          Alert.alert('Sign In Failed', msg);
        }
      }
    },
    [login]
  );

  // On Web, check if the current window received OAuth tokens in its hash (e.g. from redirect)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && (hash.includes('access_token=') || hash.includes('id_token='))) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token') || undefined;
        const idToken = hashParams.get('id_token') || undefined;
        const token = idToken || accessToken;
        if (token) {
          try {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch {}
          handleTokenExchange(token, idToken, accessToken);
        }
      }
    }
  }, [handleTokenExchange]);

  // Handle Google Auth response
  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const { id_token, access_token } = response.params || {};
      const authObj = (response as any).authentication;
      const token =
        id_token ||
        authObj?.idToken ||
        access_token ||
        authObj?.accessToken;

      if (token) {
        queueMicrotask(() => {
          handleTokenExchange(token, id_token || authObj?.idToken, access_token || authObj?.accessToken);
        });
      } else {
        queueMicrotask(() => {
          setError('Sign in succeeded, but no identity token was received.');
        });
      }
    } else if (response.type === 'error') {
      const errorMsg = response.error?.message || 'Google Sign-In could not be completed.';
      queueMicrotask(() => {
        setError(errorMsg);
      });
    }
  }, [response, handleTokenExchange]);

  const handleGoogleSignIn = async () => {
    setError(null);

    if (!isGoogleConfigured) {
      Alert.alert(
        'Sign In Unavailable',
        'Google sign-in is not configured yet. Please contact your store administrator.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Native mobile Google Play Services popup account picker flow (Android / iOS)
    if (Platform.OS !== 'web' && isNativeGoogleSignInAvailable()) {
      try {
        const nativeResult = await signInWithNativeGoogle();
        if (nativeResult.success && nativeResult.idToken) {
          await handleTokenExchange(nativeResult.idToken, nativeResult.idToken);
          return;
        }
        if (nativeResult.cancelled) {
          // User tapped outside or dismissed the bottom sheet
          return;
        }
        if (nativeResult.error) {
          console.warn('[SaveShop] Native Google Sign-In error:', nativeResult.error);
          // If browser auth is unavailable, show the error directly
          if (!request) {
            setError(nativeResult.error);
            return;
          }
        }
      } catch (err: any) {
        console.warn('[SaveShop] Native Google Sign-In exception:', err);
      }
    }

    // Web browser or fallback OAuth session flow
    try {
      const res = await promptAsync();

      if (res?.type === 'success') {
        const { id_token, access_token } = res.params || {};
        const authObj = (res as any).authentication;
        const token =
          id_token ||
          authObj?.idToken ||
          access_token ||
          authObj?.accessToken;

        if (token) {
          await handleTokenExchange(
            token,
            id_token || authObj?.idToken,
            access_token || authObj?.accessToken
          );
          return;
        }
      }

      if (res?.type === 'dismiss' || res?.type === 'cancel') {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const handle = window.localStorage.getItem('ExpoWebBrowserRedirectHandle');
          if (handle) {
            const originUrl = window.localStorage.getItem(`ExpoWebBrowser_OriginUrl_${handle}`);
            if (originUrl && (originUrl.includes('access_token=') || originUrl.includes('id_token='))) {
              try {
                const urlObj = new URL(originUrl, window.location.href);
                const hashParams = new URLSearchParams(urlObj.hash.replace(/^#/, ''));
                const accessToken = hashParams.get('access_token') || undefined;
                const idToken = hashParams.get('id_token') || undefined;
                const token = idToken || accessToken;
                if (token) {
                  window.localStorage.removeItem('ExpoWebBrowserRedirectHandle');
                  window.localStorage.removeItem(`ExpoWebBrowser_OriginUrl_${handle}`);
                  window.localStorage.removeItem(`ExpoWebBrowser_RedirectUrl_${handle}`);
                  await handleTokenExchange(token, idToken, accessToken);
                  return;
                }
              } catch {}
            }
          }
        }
        return;
      }

      if (res?.type === 'error') {
        setError(res.error?.message || 'Google Sign-In failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to open Google Sign-In.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="storefront" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>SAVE SHOP</Text>
            <Text style={styles.brandTagline}>
              Multi-Store Inventory & Retail Billing
            </Text>
          </View>

          {/* Login Card */}
          <Card style={styles.loginCard} variant="elevated">
            <Text style={styles.cardHeader}>Terminal Sign In</Text>
            <Text style={styles.cardSub}>
              Sign in with your Google account to access your store
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Palette.rose} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Google Sign-in Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                isLoading && styles.googleButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
              disabled={isLoading || (Platform.OS === 'web' && !request && isGoogleConfigured)}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Palette.navyPrimary} />
              ) : (
                <>
                  <View style={styles.googleIconWrapper}>
                    <Ionicons name="logo-google" size={20} color="#EA4335" />
                  </View>
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" size={12} color={Palette.textMuted} />
              {'  '}Fast & secure sign-in with your Google account
            </Text>

            {/* PWA Install Option */}
            <PWAInstallButton variant="card" />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.surfaceLight,
    ...(Platform.OS === 'web'
      ? {
          height: '100%' as any,
          minHeight: '100vh' as any,
          alignItems: 'center',
          justifyContent: 'center',
        }
      : {}),
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: Palette.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...Shadows.md,
  },
  brandTitle: {
    ...Typography.h1,
    color: Palette.navyPrimary,
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 20,
    ...(Platform.OS === 'web'
      ? {
          borderWidth: 1,
          borderColor: Palette.borderLight,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.12)',
        }
      : {}),
  },
  cardHeader: {
    ...Typography.h2,
    fontSize: 20,
  },
  cardSub: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.roseLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: Palette.rose,
    marginLeft: 8,
    flex: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.borderLight,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 52,
    ...Shadows.sm,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIconWrapper: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  securityNote: {
    fontSize: 11,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});
