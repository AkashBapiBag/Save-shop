import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Palette } from '@/theme/designSystem';

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

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Palette?.navyPrimary || '#208AEF'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
