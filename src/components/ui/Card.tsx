import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Palette, Shadows } from '@/theme/designSystem';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'outlined',
}) => {
  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && [styles.elevated, Shadows.md],
        variant === 'outlined' && styles.outlined,
        variant === 'flat' && styles.flat,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  elevated: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  flat: {
    backgroundColor: Palette.surfaceMuted,
  },
});
