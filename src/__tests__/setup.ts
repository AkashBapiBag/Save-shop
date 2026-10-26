/* eslint-disable @typescript-eslint/no-require-imports */
require('../../scripts/patch-node.cjs');
import { vi } from 'vitest';

// Define global __DEV__ for test environment
(globalThis as any).__DEV__ = true;

// Default mock for global fetch to prevent unhandled background network rejections in tests
if (!globalThis.fetch || typeof (globalThis.fetch as any).mockImplementation !== 'function') {
  globalThis.fetch = vi.fn().mockImplementation((input: any) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isArrayEndpoint =
      url.includes('/products') ||
      url.includes('/states') ||
      url.includes('/stores') ||
      url.includes('/transactions') ||
      url.includes('/batches');
    const responsePayload = isArrayEndpoint ? [] : {};
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responsePayload),
      text: () => Promise.resolve(JSON.stringify(responsePayload)),
    } as any);
  });
}

// Stub png asset requires
if (typeof require !== 'undefined' && require.extensions) {
  require.extensions['.png'] = () => 'mock-png';
  require.extensions['.jpg'] = () => 'mock-jpg';
}

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
    multiRemove: vi.fn((keys: string[]) => {
      keys.forEach((k) => delete mockStorage[k]);
      return Promise.resolve();
    }),
    multiGet: vi.fn((keys: string[]) => {
      return Promise.resolve(keys.map((k) => [k, mockStorage[k] || null]));
    }),
    clear: vi.fn(() => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
      return Promise.resolve();
    }),
  },
}));

// Mock expo-constants
vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      hostUri: '192.168.1.100:8000',
    },
  },
}));

// Mock expo-print
vi.mock('expo-print', () => ({
  printAsync: vi.fn(() => Promise.resolve()),
  printToFileAsync: vi.fn(() => Promise.resolve({ uri: 'file://receipt.pdf' })),
}));

// Mock expo-sharing
vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(() => Promise.resolve(true)),
  shareAsync: vi.fn(() => Promise.resolve()),
}));

// Mock expo-image-picker
vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  requestCameraPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: vi.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'file://img.png', base64: 'sampleBase64' }] })),
  launchCameraAsync: vi.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'file://photo.png', base64: 'samplePhotoBase64' }] })),
}));

// Mock expo-splash-screen
vi.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: vi.fn(() => Promise.resolve()),
  hideAsync: vi.fn(() => Promise.resolve()),
}));

// Mock expo-status-bar
vi.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock expo-router
vi.mock('expo-router', () => ({
  Link: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    return React.createElement('a', { onClick: onPress, ...props }, children);
  },
}));

// Mock expo-web-browser
vi.mock('expo-web-browser', () => ({
  openBrowserAsync: vi.fn(() => Promise.resolve()),
  maybeCompleteAuthSession: vi.fn(),
  WebBrowserPresentationStyle: { AUTOMATIC: 'automatic' },
}));

// Mock expo-auth-session and providers
vi.mock('expo-auth-session', () => ({
  makeRedirectUri: vi.fn(() => 'saveshop:/oauthredirect'),
  ResponseType: { Code: 'code', Token: 'token', IdToken: 'id_token' },
}));

vi.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: vi.fn(() => [
    { isLoaded: true },
    null,
    vi.fn(() => Promise.resolve({ type: 'success', params: { id_token: 'mock-google-id-token' } })),
  ]),
  useIdTokenAuthRequest: vi.fn(() => [
    { isLoaded: true },
    null,
    vi.fn(() => Promise.resolve({ type: 'success', params: { id_token: 'mock-google-id-token' } })),
  ]),
}));

// Mock expo-symbols
vi.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

// Mock expo-image
vi.mock('expo-image', () => ({
  Image: () => null,
}));

// Mock react-native-reanimated
vi.mock('react-native-reanimated', () => {
  const React = require('react');
  class MockKeyframe {
    duration() { return this; }
    withCallback() { return this; }
  }
  return {
    default: {
      View: ({ children, style }: any) => React.createElement('div', { style }, children),
    },
    Keyframe: MockKeyframe,
    Easing: {
      elastic: () => ({}),
      linear: () => ({}),
    },
    FadeIn: {
      duration: () => ({}),
    },
  };
});

// Mock react-native-safe-area-context
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
  SafeAreaView: ({ children }: any) => children,
  SafeAreaProvider: ({ children }: any) => children,
}));

// Mock @expo/vector-icons
vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
