/**
 * Color palette for the trading platform
 * Futuristic blue/purple theme with pure dark background
 */

export const colors = {
  // Primary Blues - Futuristic blue tones
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main primary
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Secondary Purples - Vibrant purple accents
  purple: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7', // Main purple
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
  },
  
  // Indigo - Blue-purple blend
  indigo: {
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
  },
  
  // Background - Pure dark
  background: {
    primary: '#0A0A0A',   // Deep black
    secondary: '#111111', // Slightly lighter black
    tertiary: '#1A1A1A',  // Card backgrounds
    elevated: '#222222',   // Elevated surfaces
  },
  
  // Text - Light grays for high contrast
  text: {
    primary: '#F3F4F6',   // Main text
    secondary: '#E5E7EB', // Secondary text
    tertiary: '#D1D5DB',  // Tertiary text
    muted: '#9CA3AF',     // Muted text
    disabled: '#6B7280',  // Disabled text
  },
  
  // Accents - Cyan for highlights
  accent: {
    cyan: '#06B6D4',
    cyanLight: '#22D3EE',
    cyanDark: '#0891B2',
  },
  
  // Semantic colors
  success: {
    500: '#10B981',
    600: '#059669',
  },
  
  warning: {
    500: '#F59E0B',
    600: '#D97706',
  },
  
  error: {
    500: '#EF4444',
    600: '#DC2626',
  },
  
  // Borders and dividers
  border: {
    default: '#2A2A2A',
    light: '#333333',
    dark: '#1A1A1A',
  },
  
  // Glassmorphism
  glass: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.1)',
    dark: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

// CSS variables for theme
export const cssVariables = {
  '--color-primary': colors.primary[500],
  '--color-primary-dark': colors.primary[600],
  '--color-purple': colors.purple[500],
  '--color-indigo': colors.indigo[500],
  '--color-bg-primary': colors.background.primary,
  '--color-bg-secondary': colors.background.secondary,
  '--color-bg-tertiary': colors.background.tertiary,
  '--color-text-primary': colors.text.primary,
  '--color-text-secondary': colors.text.secondary,
  '--color-accent-cyan': colors.accent.cyan,
  '--color-border': colors.border.default,
} as const;

