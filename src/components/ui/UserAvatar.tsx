import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
  ImageStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/theme/designSystem';

export interface UserAvatarProps {
  uri?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  fontSize?: number;
  showGoogleBadge?: boolean;
  googleBadgeSize?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  uri,
  name,
  email,
  size = 34,
  fontSize,
  showGoogleBadge = false,
  googleBadgeSize,
  style,
  imageStyle,
  textStyle,
  backgroundColor = Palette.navyPrimary,
  borderColor = '#E2E8F0',
  borderWidth = 1.5,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [uri]);

  const displayName = name || email || 'U';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U';
  const computedFontSize = fontSize || Math.round(size * 0.42);
  const badgeSize = googleBadgeSize || Math.max(12, Math.round(size * 0.35));

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: uri && !hasError ? 'transparent' : backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth,
    borderColor,
    overflow: 'visible',
  };

  return (
    <View style={[containerStyle, style]}>
      {uri && !hasError ? (
        <Image
          source={{ uri }}
          style={[
            {
              width: size - borderWidth * 2,
              height: size - borderWidth * 2,
              borderRadius: (size - borderWidth * 2) / 2,
            },
            imageStyle,
          ]}
          resizeMode="cover"
          onError={() => setHasError(true)}
          {...(Platform.OS === 'web'
            ? ({
                referrerPolicy: 'no-referrer',
                crossOrigin: 'anonymous',
                loading: 'lazy',
              } as any)
            : {})}
        />
      ) : (
        <Text
          style={[
            styles.initialText,
            { fontSize: computedFontSize },
            textStyle,
          ]}
        >
          {initial}
        </Text>
      )}

      {showGoogleBadge && (
        <View
          style={[
            styles.googleBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              bottom: -1,
              right: -1,
            },
          ]}
        >
          <Ionicons name="logo-google" size={Math.round(badgeSize * 0.55)} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  initialText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  googleBadge: {
    position: 'absolute',
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
