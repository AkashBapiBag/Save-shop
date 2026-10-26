import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Palette, Shadows } from '@/theme/designSystem';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getVariantStyles = (): { btn: ViewStyle; txt: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          btn: { backgroundColor: Palette.surfaceMuted, borderWidth: 1, borderColor: Palette.borderLight },
          txt: { color: Palette.textPrimary },
        };
      case 'outline':
        return {
          btn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Palette.bluePrimary },
          txt: { color: Palette.bluePrimary },
        };
      case 'danger':
        return {
          btn: { backgroundColor: Palette.rose },
          txt: { color: Palette.textLight },
        };
      case 'success':
        return {
          btn: { backgroundColor: Palette.emerald },
          txt: { color: Palette.textLight },
        };
      case 'primary':
      default:
        return {
          btn: { backgroundColor: Palette.navyPrimary },
          txt: { color: Palette.textLight },
        };
    }
  };

  const getSizeStyles = (): { btn: ViewStyle; txt: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
          txt: { fontSize: 13, fontWeight: '600' },
        };
      case 'lg':
        return {
          btn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14 },
          txt: { fontSize: 16, fontWeight: '700' },
        };
      case 'md':
      default:
        return {
          btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
          txt: { fontSize: 14, fontWeight: '600' },
        };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        variantStyle.btn,
        sizeStyle.btn,
        (variant === 'primary' || variant === 'success') && Shadows.sm,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.txt.color} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, variantStyle.txt, sizeStyle.txt, icon ? { marginLeft: 8 } : null, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
