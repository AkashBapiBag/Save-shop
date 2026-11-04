import React, { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { AppLoadingSkeleton } from '@/components/ui/Skeleton';

// Handle OAuth redirect completion on native and web
WebBrowser.maybeCompleteAuthSession();

export default function OAuthRedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    const timeout = setTimeout(() => {
      try {
        router.replace('/');
      } catch {}
    }, 100);
    return () => clearTimeout(timeout);
  }, [router]);

  return <AppLoadingSkeleton />;
}
