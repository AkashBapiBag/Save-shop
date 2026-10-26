import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as nativeAuth from '@/services/nativeGoogleAuth';

describe('services/nativeGoogleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides isNativeGoogleSignInAvailable', () => {
    expect(typeof nativeAuth.isNativeGoogleSignInAvailable).toBe('function');
  });

  it('provides configureGoogleSignIn without throwing', () => {
    expect(() => nativeAuth.configureGoogleSignIn('test-web-client-id')).not.toThrow();
  });

  it('provides signInWithNativeGoogle returning a result object', async () => {
    const res = await nativeAuth.signInWithNativeGoogle();
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  it('provides signOutNativeGoogle without throwing', async () => {
    await expect(nativeAuth.signOutNativeGoogle()).resolves.not.toThrow();
  });
});
