import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Palette } from '@/theme/designSystem';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightElement,
  containerStyle,
  inputStyle,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputError : null,
          props.editable === false ? styles.inputDisabled : null,
        ]}
      >
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <TextInput
          placeholderTextColor={Palette.textMuted}
          style={[styles.input, inputStyle]}
          {...props}
        />
        {rightElement ? <View style={styles.rightContainer}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    overflow: 'hidden',
  },
  inputError: {
    borderColor: Palette.rose,
  },
  inputDisabled: {
    backgroundColor: Palette.surfaceMuted,
  },
  iconContainer: {
    marginRight: 8,
    flexShrink: 0,
  },
  rightContainer: {
    marginLeft: 8,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: Palette.textPrimary,
    fontSize: 14,
    height: '100%',
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 11,
    color: Palette.rose,
    marginTop: 4,
    fontWeight: '500',
  },
});
