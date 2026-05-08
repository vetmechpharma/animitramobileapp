/**
 * Animitra Design System
 * Premium green-tinted theme with Inter font
 */

export const F = {
  // Inter font family names
  regular:    'Inter_400Regular',
  medium:     'Inter_500Medium',
  semiBold:   'Inter_600SemiBold',
  bold:       'Inter_700Bold',
  extraBold:  'Inter_800ExtraBold',
};

export const C = {
  primary:      '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark:  '#1B5E20',
  accent:       '#66BB6A',
  bg:           '#F4F9F4',
  surface:      '#FFFFFF',
  surfaceElevated: '#FAFEFA',
  fill:         '#EBF5EC',
  fillDark:     '#D6EDD8',
  text:         '#1A2E1C',
  textSub:      '#4B6352',
  textMuted:    '#8FA891',
  border:       '#D0E8D2',
  borderLight:  '#E8F5EA',
  warning:      '#E65100',
  error:        '#C62828',
  info:         '#1565C0',
  success:      '#2E7D32',
};

export const S = {
  // Green-tinted shadows (Expo SDK 54 boxShadow)
  xs:  { boxShadow: '0px 1px 4px rgba(46,125,50,0.06)' },
  sm:  { boxShadow: '0px 2px 8px rgba(46,125,50,0.08)' },
  md:  { boxShadow: '0px 4px 16px rgba(46,125,50,0.10)' },
  lg:  { boxShadow: '0px 8px 28px rgba(46,125,50,0.14)' },
  btn: { boxShadow: '0px 4px 20px rgba(46,125,50,0.32)' },
  card:{ boxShadow: '0px 2px 12px rgba(46,125,50,0.07)' },
};

export const R = {
  // Border radii
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
  full: 9999,
};

// Typography presets
export const TY = {
  h1: { fontSize: 32, fontFamily: F.extraBold, letterSpacing: -1.0, lineHeight: 40, color: C.text },
  h2: { fontSize: 26, fontFamily: F.extraBold, letterSpacing: -0.6, lineHeight: 34, color: C.text },
  h3: { fontSize: 20, fontFamily: F.bold,      letterSpacing: -0.3, lineHeight: 28, color: C.text },
  h4: { fontSize: 17, fontFamily: F.semiBold,  letterSpacing: -0.2, lineHeight: 24, color: C.text },
  body: { fontSize: 15, fontFamily: F.regular, letterSpacing: 0.1,  lineHeight: 22, color: C.text },
  bodyMed: { fontSize: 15, fontFamily: F.medium, letterSpacing: 0.1, lineHeight: 22, color: C.text },
  small: { fontSize: 13, fontFamily: F.regular, letterSpacing: 0.1, lineHeight: 18, color: C.textSub },
  smallMed: { fontSize: 13, fontFamily: F.medium, letterSpacing: 0.1, lineHeight: 18, color: C.textSub },
  label: { fontSize: 11, fontFamily: F.semiBold, letterSpacing: 0.8, lineHeight: 16, color: C.textSub, textTransform: 'uppercase' as const },
  micro: { fontSize: 10, fontFamily: F.medium, letterSpacing: 0.5, lineHeight: 14, color: C.textMuted },
  numLg: { fontSize: 28, fontFamily: F.extraBold, letterSpacing: -0.5, lineHeight: 36, color: C.text },
  numMd: { fontSize: 22, fontFamily: F.extraBold, letterSpacing: -0.3, lineHeight: 28, color: C.text },
};
