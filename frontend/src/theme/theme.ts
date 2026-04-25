export const theme = {
  colors: {
    brandTopbar: '#064E5C',
    brandTopbarOverlay: 'rgba(6, 78, 92, 0.85)',
  },
} as const;

export type AppTheme = typeof theme;