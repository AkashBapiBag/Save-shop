export interface NativeSignInResult {
  success: boolean;
  idToken?: string;
  cancelled?: boolean;
  error?: string;
}

/**
 * Returns false on Web, signaling the UI to use the web OAuth / redirect flow.
 */
export function isNativeGoogleSignInAvailable(): boolean {
  return false;
}

export function configureGoogleSignIn(_webClientId: string): void {
  // Web uses standard browser OAuth session
}

export async function signInWithNativeGoogle(): Promise<NativeSignInResult> {
  return {
    success: false,
    error: 'Native Google Sign-In is not available on web.',
  };
}

export async function signOutNativeGoogle(): Promise<void> {
  // No-op on web
}
