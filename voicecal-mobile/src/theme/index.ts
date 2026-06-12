/**
 * VoiceCal Global Theme — Modern Flat with Depth
 * Material Design 3 + Neumorphism inspired
 */

export const Colors = {
  // Primary gradient
  primaryGradientStart: '#E1F5FE',   // light sky blue
  primaryGradientEnd: '#81D4FA',     // soft blue

  // Background
  background: '#F5F7FA',             // clean light gray
  surface: '#FFFFFF',                // white cards
  surfaceVariant: '#F0F4F8',         // slightly darker surface

  // Accent
  primary: '#42A5F5',                // main blue
  primaryDark: '#1E88E5',            // darker blue
  primaryLight: '#BBDEFB',           // lighter blue
  primaryContainer: '#E3F2FD',       // container bg

  // Semantic
  error: '#EF5350',
  errorLight: '#FFEBEE',
  success: '#66BB6A',
  successLight: '#E8F5E9',
  warning: '#FFA726',
  warningLight: '#FFF3E0',

  // Text
  textPrimary: '#1A1D26',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',

  // UI
  border: '#E5E7EB',
  divider: '#F0F0F0',
  overlay: 'rgba(0,0,0,0.3)',
  shadow: 'rgba(0,0,0,0.08)',
  shadowDark: 'rgba(0,0,0,0.15)',

  // Chat
  userBubble: '#5B9BF5',
  userBubbleShadow: 'rgba(91,155,245,0.3)',
  aiBubble: '#FFFFFF',
  aiBubbleShadow: 'rgba(0,0,0,0.06)',
} as const;

export const Gradients = {
  primary: [Colors.primaryGradientStart, Colors.primaryGradientEnd],
  header: ['#E8F4FD', '#B3E0FC'],
  fab: ['#42A5F5', '#1E88E5'],
  micActive: ['#EF5350', '#E53935'],
  userBubble: ['#64B5F6', '#42A5F5'],
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  subtitle: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const, color: Colors.textSecondary },
  tiny: { fontSize: 10, fontWeight: '400' as const, color: Colors.textTertiary },
} as const;

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  colored: (color: string, opacity = 0.3) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: opacity,
    shadowRadius: 12,
    elevation: 6,
  }),
} as const;
