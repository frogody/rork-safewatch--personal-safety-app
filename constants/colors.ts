export const Colors = {
  // Primary Colors
  black: '#000000',
  yellow: '#FFD700',
  darkYellow: '#FFC107',
  lightYellow: '#FFF9C4',
  
  // Background Colors
  background: '#000000',
  surface: '#1A1A1A',
  card: '#2A2A2A',
  
  // Text Colors
  text: '#FFFFFF',
  textSecondary: '#FFD700',
  textMuted: '#CCCCCC',
  textDisabled: '#666666',
  
  // Status Colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Interactive Colors
  primary: '#FFD700',
  primaryDark: '#FFC107',
  secondary: '#FFFFFF',
  accent: '#FFE082',
  
  // Utility Colors
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  border: '#333333',
  divider: '#444444',
} as const;

export type ColorKey = keyof typeof Colors;