export const tokens = {
  primary: '#4f46e5',
  primaryFg: '#ffffff',
  background: '#f8f7ff',
  surface: '#ffffff',
  surfaceAlt: '#f1f0fe',
  text: '#1e1b4b',
  textMuted: '#6b7280',
  accent: '#f97316',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  border: '#e0deff',
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: '8px',
  borderRadiusSm: '4px',
  borderRadiusLg: '16px',
} as const

export type Tokens = typeof tokens