import { TurboModuleRegistry, NativeModules } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export interface NativeSignInResult {
  success: boolean;
  idToken?: string;
  user?: {
    id?: string;
    name?: string | null;
    email?: string;
    photo?: string | null;
    familyName?: string | null;
    givenName?: string | null;
  };
  cancelled?: boolean;
  error?: string;
}

let isConfigured = false;

/**
 * Safely resolves the @react-native-google-signin module without throwing
 * an unhandled TurboModuleRegistry Invariant Violation when running in
 * Expo Go or environments where RNGoogleSignin is not compiled into the native binary.
 */
function getGoogleSigninModule(): any {
  try {
    if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@react-native-google-signin/google-signin');
    }

    // Expo Go does not contain custom native code
    if (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ) {
      return null;
    }

    // Verify native binary registration before requiring to prevent TurboModuleRegistry crash
    const hasTurboModule = !!TurboModuleRegistry?.get?.('RNGoogleSignin');
    const hasBridgeModule = !!NativeModules?.RNGoogleSignin;
    if (!hasTurboModule && !hasBridgeModule) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
}

/**
 * Returns true if running in a standalone or development build where the
 * native @react-native-google-signin module is properly linked.
 * Returns false inside Expo Go where native modules are not linked.
 */
export function isNativeGoogleSignInAvailable(): boolean {
  try {
    const mod = getGoogleSigninModule();
    return Boolean(mod?.GoogleSignin && typeof mod.GoogleSignin.configure === 'function');
  } catch {
    return false;
  }
}

/**
 * Configures the Google Sign-In SDK with the backend server's Web Client ID.
 * On Android, Google Play Services uses this webClientId to mint an ID token
 * that our backend FastAPI server can verify.
 */
export function configureGoogleSignIn(webClientId: string): void {
  if (isConfigured || !webClientId) return;
  try {
    const mod = getGoogleSigninModule();
    if (!mod?.GoogleSignin) return;
    mod.GoogleSignin.configure({
      webClientId,
      scopes: ['profile', 'email'],
      offlineAccess: false,
    });
    isConfigured = true;
  } catch (err) {
    console.warn('[NativeGoogleAuth] Configure failed:', err);
  }
}

/**
 * Triggers the native Android/iOS Google Play Services account picker / bottom sheet dialog.
 * Returns the verified idToken without launching any browser tab or web page.
 */
export async function signInWithNativeGoogle(): Promise<NativeSignInResult> {
  const mod = getGoogleSigninModule();
  if (!mod?.GoogleSignin) {
    return {
      success: false,
      error: 'Native Google Sign-In is not supported in Expo Go. Please use the development build or browser sign-in.',
    };
  }

  const { GoogleSignin, statusCodes } = mod;

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response?.type === 'success') {
      const idToken = response.data?.idToken;
      if (!idToken) {
        return {
          success: false,
          error: 'Google Sign-In succeeded, but no identity token was received.',
        };
      }
      return {
        success: true,
        idToken,
        user: response.data?.user
          ? {
              id: response.data.user.id,
              name: response.data.user.name,
              email: response.data.user.email,
              photo: response.data.user.photo,
              familyName: response.data.user.familyName,
              givenName: response.data.user.givenName,
            }
          : undefined,
      };
    } else if (response?.type === 'cancelled') {
      return {
        success: false,
        cancelled: true,
      };
    }

    return {
      success: false,
      error: 'Google Sign-In response was empty.',
    };
  } catch (error: any) {
    if (error?.code === statusCodes?.SIGN_IN_CANCELLED || error?.code === 'SIGN_IN_CANCELLED') {
      return { success: false, cancelled: true };
    } else if (error?.code === statusCodes?.IN_PROGRESS || error?.code === 'IN_PROGRESS') {
      return { success: false, error: 'Sign-in is already in progress.' };
    } else if (
      error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE ||
      error?.code === 'PLAY_SERVICES_NOT_AVAILABLE'
    ) {
      return {
        success: false,
        error: 'Google Play Services is not available or outdated on this device.',
      };
    }
    return {
      success: false,
      error: error?.message || 'Native Google Sign-In failed.',
    };
  }
}

/**
 * Signs out from the native Google client so future sign-in prompts allow account selection.
 */
export async function signOutNativeGoogle(): Promise<void> {
  try {
    const mod = getGoogleSigninModule();
    if (mod?.GoogleSignin) {
      await mod.GoogleSignin.signOut();
    }
  } catch (err) {
    console.warn('[NativeGoogleAuth] SignOut error:', err);
  }
}
