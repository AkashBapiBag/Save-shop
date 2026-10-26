import { Platform } from 'react-native';

export interface NativeSignInResult {
  success: boolean;
  idToken?: string;
  cancelled?: boolean;
  error?: string;
}

/**
 * Universal fallback interface for native Google Sign-In.
 */
export function isNativeGoogleSignInAvailable(): boolean {
  return Platform.OS !== 'web';
}

export function configureGoogleSignIn(_webClientId: string): void {}

export async function signInWithNativeGoogle(): Promise<NativeSignInResult> {
  return {
    success: false,
    error: 'Native Google Sign-In is not supported in this environment.',
  };
}

export async function signOutNativeGoogle(): Promise<void> {}
