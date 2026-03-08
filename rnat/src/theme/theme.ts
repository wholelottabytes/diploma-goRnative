// Global design tokens for the BeatMarket app
// Dark mode premium theme with glassmorphism aesthetics

export const Colors = {
  // Primary brand colors
  primary: '#A855F7',       // Purple
  primaryDark: '#7C3AED',
  primaryLight: '#C084FC',
  secondary: '#06B6D4',     // Cyan
  secondaryDark: '#0891B2',
  accent: '#F59E0B',        // Amber

  // Backgrounds
  background: '#0A0A0F',
  backgroundSecondary: '#12121A',
  backgroundTertiary: '#1A1A28',
  card: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.1)',

  // Glass effect
  glass: 'rgba(168, 85, 247, 0.08)',
  glassBorder: 'rgba(168, 85, 247, 0.25)',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#475569',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.7)',

  // Tab bar
  tabBar: 'rgba(10,10,15,0.95)',
  tabActive: '#A855F7',
  tabInactive: '#475569',
};

export const Gradients = {
  primary: ['#A855F7', '#7C3AED'] as const,
  secondary: ['#06B6D4', '#0891B2'] as const,
  background: ['#0A0A0F', '#12121A'] as const,
  card: ['rgba(168,85,247,0.15)', 'rgba(6,182,212,0.08)'] as const,
  hero: ['rgba(168,85,247,0.2)', 'rgba(0,0,0,0)'] as const,
};

export const Typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 24,
  '2xl': 30,
  '3xl': 36,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadow = {
  glow: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

export default {
  Colors,
  Gradients,
  Typography,
  Spacing,
  BorderRadius,
  Shadow,
};
