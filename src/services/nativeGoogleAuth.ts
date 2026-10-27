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

/**
 * Universal fallback interface for native Google Sign-In.
 */
export function isNativeGoogleSignInAvailable(): boolean {
  return false;
}

export function configureGoogleSignIn(_webClientId: string): void {}

export async function signInWithNativeGoogle(): Promise<NativeSignInResult> {
  return {
    success: false,
    error: 'Native Google Sign-In is not supported in this environment.',
  };
}

export async function signOutNativeGoogle(): Promise<void> {}
