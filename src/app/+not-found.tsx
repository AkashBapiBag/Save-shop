import React, { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { AppLoadingSkeleton } from '@/components/ui/Skeleton';

WebBrowser.maybeCompleteAuthSession();

export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    const timeout = setTimeout(() => {
      try {
        router.replace('/');
      } catch {}
    }, 50);
    return () => clearTimeout(timeout);
  }, [router]);

  return <AppLoadingSkeleton />;
}
