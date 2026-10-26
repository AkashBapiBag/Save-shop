import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Palette } from '@/theme/designSystem';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  style,
  textStyle,
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: Palette.emeraldLight, color: Palette.emeraldDark };
      case 'warning':
        return { bg: Palette.amberLight, color: Palette.amber };
      case 'danger':
        return { bg: Palette.roseLight, color: Palette.rose };
      case 'primary':
        return { bg: Palette.blueSoft, color: Palette.bluePrimary };
      case 'purple':
        return { bg: Palette.purpleLight, color: Palette.purple };
      case 'neutral':
      default:
        return { bg: Palette.surfaceMuted, color: Palette.textSecondary };
    }
  };

  const { bg, color } = getStyles();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        isSm ? styles.badgeSm : styles.badgeMd,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color },
          isSm ? styles.textSm : styles.textMd,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 10,
  },
  textMd: {
    fontSize: 12,
  },
});
