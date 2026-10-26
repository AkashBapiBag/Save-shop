import { Platform } from 'react-native';

export const Palette = {
  // Brand Primary & Surface
  navyDark: '#0B1120',
  navyPrimary: '#0F172A',
  navyCard: '#1E293B',
  surfaceLight: '#F8FAFC',
  surfaceCard: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  borderLight: '#E2E8F0',
  borderDark: '#334155',

  // Accent Colors
  bluePrimary: '#2563EB',
  blueHover: '#1D4ED8',
  blueSoft: '#EFF6FF',

  emerald: '#059669',
  emeraldLight: '#ECFDF5',
  emeraldDark: '#047857',

  amber: '#D97706',
  amberLight: '#FFFBEB',

  rose: '#DC2626',
  roseLight: '#FEF2F2',

  purple: '#7C3AED',
  purpleLight: '#F5F3FF',

  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textLight: '#FFFFFF',
};

export const Shadows = {
  sm: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
      },
    }),
  },
  md: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
      },
    }),
  },
  lg: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1)',
      },
    }),
  },
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5, color: Palette.textPrimary },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3, color: Palette.textPrimary },
  h3: { fontSize: 18, fontWeight: '600' as const, color: Palette.textPrimary },
  bodyLarge: { fontSize: 16, fontWeight: '500' as const, color: Palette.textPrimary },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, color: Palette.textSecondary },
  bodyBold: { fontSize: 14, fontWeight: '600' as const, color: Palette.textPrimary },
  caption: { fontSize: 12, fontWeight: '500' as const, color: Palette.textMuted },
  badge: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }), fontSize: 13 },
};
