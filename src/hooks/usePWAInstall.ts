import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Check if running in standalone mode (already installed as PWA or native webview)
    const isStandalone =
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as unknown as { standalone?: boolean })?.standalone === true ||
      (typeof document !== 'undefined' && document.referrer?.includes('android-app://'));

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS Safari (which doesn't fire beforeinstallprompt, requires manual Add to Home Screen)
    const ua = window.navigator?.userAgent || '';
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown })?.MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIosDevice && isSafari) {
      setIsIOS(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      if (typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    if (typeof window.addEventListener === 'function') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.warn('PWA install prompt failed:', err);
      }
    }
    return false;
  }, [deferredPrompt]);

  const canInstall = !isInstalled && (!!deferredPrompt || isIOS);

  return {
    canInstall,
    isInstalled,
    isIOS,
    promptInstall,
  };
}
