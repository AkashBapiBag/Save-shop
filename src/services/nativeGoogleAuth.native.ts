import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

export interface NativeSignInResult {
  success: boolean;
  idToken?: string;
  cancelled?: boolean;
  error?: string;
}

let isConfigured = false;

/**
 * Returns true since this module only runs on native (Android/iOS).
 */
export function isNativeGoogleSignInAvailable(): boolean {
  return true;
}

/**
 * Configures the Google Sign-In SDK with the backend server's Web Client ID.
 * On Android, Google Play Services uses this webClientId to mint an ID token
 * that our backend FastAPI server can verify.
 */
export function configureGoogleSignIn(webClientId: string): void {
  if (isConfigured || !webClientId) return;
  try {
    GoogleSignin.configure({
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
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type === 'success') {
      const idToken = response.data.idToken;
      if (!idToken) {
        return {
          success: false,
          error: 'Google Sign-In succeeded, but no identity token was received.',
        };
      }
      return {
        success: true,
        idToken,
      };
    } else if (response.type === 'cancelled') {
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
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, cancelled: true };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign-in is already in progress.' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
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
    await GoogleSignin.signOut();
  } catch (err) {
    console.warn('[NativeGoogleAuth] SignOut error:', err);
  }
}
