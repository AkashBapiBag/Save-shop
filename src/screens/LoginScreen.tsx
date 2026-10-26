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
import { Palette, Typography, Shadows } from '@/theme/designSystem';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { getApiBaseUrl, setApiBaseUrl, resetApiBaseUrl, resolveDefaultHost } from '@/services/api';

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
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client IDs from environment
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

  const isGoogleConfigured = !!(webClientId || androidClientId || iosClientId);

  // Directly select the appropriate platform Client ID
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
        const msg = err?.message || 'Authentication with Save Shop backend failed.';
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

  useEffect(() => {
    getApiBaseUrl().then(setCustomServerUrl);
  }, []);

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
          setError('Google sign-in succeeded but no identity token was received.');
        });
      }
    } else if (response.type === 'error') {
      const errorMsg = response.error?.message || 'Google Sign-In failed.';
      queueMicrotask(() => {
        setError(errorMsg);
      });
    }
  }, [response, handleTokenExchange]);

  const handleGoogleSignIn = async () => {
    setError(null);

    if (!isGoogleConfigured) {
      Alert.alert(
        'Google Client ID Required',
        'Google SSO requires your Google OAuth Client ID.\n\n' +
          'Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your Save-shop/.env file.\n\n' +
          'Tap "Setup Steps" below to see full instructions.',
        [
          { text: 'View Setup Guide', onPress: () => setShowSetupGuide(true) },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

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
        // Fallback for Web COOP: check if the popup successfully stored the redirect URL
        // in localStorage before the browser closed or severed the opener
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
              Multi-Store Inventory & Retail Billing System
            </Text>
          </View>

          {/* Login Card */}
          <Card style={styles.loginCard} variant="elevated">
            <Text style={styles.cardHeader}>Terminal Sign In</Text>
            <Text style={styles.cardSub}>
              Single Sign-On (SSO) with your verified Google account
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Palette.rose} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {!isGoogleConfigured && (
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={18} color="#D97706" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.warningTitle}>Google SSO Setup Required</Text>
                  <Text style={styles.warningText}>
                    Google OAuth Client ID is not configured yet in .env.
                  </Text>
                </View>
              </View>
            )}

            {/* Google SSO Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                isLoading && styles.googleButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
              disabled={isLoading || (!request && isGoogleConfigured)}
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
              {'  '}Secure, federated authentication managed via Google Identity Services
            </Text>

            {/* Setup Guide Link */}
            <TouchableOpacity
              style={styles.guideToggle}
              activeOpacity={0.7}
              onPress={() => setShowSetupGuide(!showSetupGuide)}
            >
              <Ionicons
                name={showSetupGuide ? 'help-circle' : 'help-circle-outline'}
                size={14}
                color={Palette.bluePrimary}
              />
              <Text style={styles.guideToggleText}>
                {showSetupGuide ? 'Hide Google SSO Setup Steps' : 'Need help? View Google SSO Setup Steps'}
              </Text>
            </TouchableOpacity>

            {showSetupGuide && (
              <View style={styles.guideBox}>
                <Text style={styles.guideHeading}>How to configure Google SSO:</Text>
                <Text style={styles.guideStep}>
                  1. Visit Google Cloud Console &rarr; APIs & Services &rarr; Credentials.
                </Text>
                <Text style={styles.guideStep}>
                  2. Create an &quot;OAuth 2.0 Client ID&quot; (Web application).
                </Text>
                <Text style={styles.guideStep}>
                  3. Add your client ID in <Text style={{ fontWeight: '700' }}>Save-shop/.env</Text>:
                </Text>
                <View style={styles.codeSnippet}>
                  <Text style={styles.codeSnippetText}>
                    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-id.apps.googleusercontent.com
                  </Text>
                </View>
                <Text style={styles.guideStep}>
                  4. Add the same client ID to <Text style={{ fontWeight: '700' }}>Save-shop-backend/.env</Text>:
                </Text>
                <View style={styles.codeSnippet}>
                  <Text style={styles.codeSnippetText}>
                    GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
                  </Text>
                </View>
              </View>
            )}

            {/* Target Server Switcher */}
            <TouchableOpacity
              style={styles.serverPill}
              activeOpacity={0.7}
              onPress={() => setShowServerConfig(!showServerConfig)}
            >
              <Ionicons name="link-outline" size={14} color={Palette.bluePrimary} />
              <Text style={styles.serverPillText} numberOfLines={1}>
                Target: {customServerUrl || 'Auto-detecting...'}
              </Text>
              <Ionicons
                name={showServerConfig ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={Palette.textMuted}
              />
            </TouchableOpacity>

            {showServerConfig && (
              <View style={styles.serverBox}>
                <Input
                  label="Backend API Host URL"
                  value={customServerUrl}
                  onChangeText={(val) => {
                    setCustomServerUrl(val);
                    if (val.trim()) {
                      setApiBaseUrl(val.trim());
                    } else {
                      resetApiBaseUrl().then(setCustomServerUrl);
                    }
                  }}
                  placeholder={resolveDefaultHost()}
                  autoCapitalize="none"
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: Palette.textSecondary, flex: 1 }}>
                    Default source: EXPO_PUBLIC_API_URL in .env
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const def = await resetApiBaseUrl();
                      setCustomServerUrl(def);
                    }}
                  >
                    <Text style={{ fontSize: 11, color: Palette.bluePrimary, fontWeight: '600', marginLeft: 8 }}>
                      Reset to .env
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    maxWidth: 440,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  warningText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
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
    marginTop: 14,
    lineHeight: 16,
  },
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 6,
  },
  guideToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.bluePrimary,
  },
  guideBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  guideHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 6,
  },
  guideStep: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  codeSnippet: {
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  codeSnippetText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: '#38BDF8',
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceLight,
    borderWidth: 1,
    borderColor: Palette.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 20,
    gap: 6,
  },
  serverPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.navyPrimary,
    maxWidth: 240,
  },
  serverBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: Palette.surfaceLight,
    borderRadius: 10,
  },
});
