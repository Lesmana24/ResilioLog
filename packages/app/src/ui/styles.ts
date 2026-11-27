// Design tokens for ResilioLog UI.
// Based on the Mycogen-style reference dashboard:
// - Light pastel gradient background
// - White cards with rounded corners and soft shadows
// - Dark sidebar pill for active nav item
// - Teal accent color (#0f766e)

import type { CSSProperties } from 'react';

// ── Colour palette ──────────────────────────────────────────────────────────
export const colors = {
  teal: '#0f766e',
  tealLight: '#e6f4f2',
  tealDark: '#0a5952',

  sidebar: '#1a1a2e',
  sidebarText: '#e2e8f0',
  sidebarMuted: '#94a3b8',
  sidebarActiveBg: '#0f766e',
  sidebarActiveText: '#ffffff',

  headerBg: '#ffffff',
  headerBorder: '#f1f5f9',

  pageBg: 'linear-gradient(135deg, #fce4ec 0%, #f3e8ff 35%, #e0f7fa 70%, #e8f5e9 100%)',

  cardBg: '#ffffff',
  cardBorder: '#f1f5f9',
  cardShadow: '0 2px 12px rgba(0,0,0,0.07)',

  text: '#1e293b',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',

  success: '#16a34a',
  successBg: '#dcfce7',
  warning: '#d97706',
  warningBg: '#fef3c7',
  warningBorder: '#f59e0b',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  dangerBorder: '#fca5a5',
  dangerText: '#991b1b',

  amber: '#f59e0b',
  amberBg: '#fffbeb',
  amberBorder: '#fde68a',

  badgeDeficitBg: '#fee2e2',
  badgeDeficitText: '#991b1b',

  borderLight: '#e2e8f0',
  borderMedium: '#cbd5e1',
};

// ── Spacing ─────────────────────────────────────────────────────────────────
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// ── Radii ───────────────────────────────────────────────────────────────────
export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  pill: 999,
};

// ── Typography ───────────────────────────────────────────────────────────────
export const font = {
  family: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  sizeXs: 11,
  sizeSm: 12,
  sizeMd: 14,
  sizeLg: 16,
  sizeXl: 20,
  size2xl: 24,
  size3xl: 32,
  weightNormal: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
};

// ── Layout constants ─────────────────────────────────────────────────────────
export const layout = {
  sidebarWidth: 220,
  headerHeight: 60,
  contentPadding: 24,
};

// ── Reusable style objects ───────────────────────────────────────────────────

export const card: CSSProperties = {
  background: colors.cardBg,
  borderRadius: radius.lg,
  boxShadow: colors.cardShadow,
  padding: space.lg,
  border: `1px solid ${colors.cardBorder}`,
};

export const cardSm: CSSProperties = {
  ...card,
  padding: space.md,
  borderRadius: radius.md,
};

export const btn = {
  primary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 20px',
    backgroundColor: colors.teal,
    color: '#ffffff',
    border: 'none',
    borderRadius: radius.md,
    fontSize: font.sizeMd,
    fontWeight: font.weightSemibold,
    cursor: 'pointer',
    minHeight: 40,
  } as CSSProperties,

  secondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: colors.teal,
    border: `1px solid ${colors.teal}`,
    borderRadius: radius.md,
    fontSize: font.sizeMd,
    fontWeight: font.weightMedium,
    cursor: 'pointer',
    minHeight: 40,
  } as CSSProperties,

  danger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 16px',
    backgroundColor: colors.dangerBg,
    color: colors.dangerText,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: radius.md,
    fontSize: font.sizeMd,
    fontWeight: font.weightMedium,
    cursor: 'pointer',
    minHeight: 40,
  } as CSSProperties,
};

export const input: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: radius.sm,
  fontSize: font.sizeMd,
  fontFamily: 'inherit',
  color: colors.text,
  background: '#ffffff',
  minHeight: 40,
  boxSizing: 'border-box',
};

export const label: CSSProperties = {
  display: 'grid',
  gap: 4,
  fontSize: font.sizeMd,
  color: colors.text,
  fontWeight: font.weightMedium,
};

export const badge = {
  deficit: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: colors.badgeDeficitBg,
    color: colors.badgeDeficitText,
    borderRadius: radius.pill,
    fontSize: font.sizeSm,
    fontWeight: font.weightBold,
  } as CSSProperties,

  warning: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: colors.warningBg,
    color: colors.warning,
    borderRadius: radius.pill,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  } as CSSProperties,

  success: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: colors.successBg,
    color: colors.success,
    borderRadius: radius.pill,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  } as CSSProperties,

  amber: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: colors.amberBg,
    color: colors.amber,
    borderRadius: radius.pill,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  } as CSSProperties,
};

export const alert = {
  warning: {
    padding: '12px 16px',
    backgroundColor: colors.warningBg,
    border: `1px solid ${colors.warningBorder}`,
    color: '#92400e',
    borderRadius: radius.md,
    fontSize: font.sizeMd,
  } as CSSProperties,

  danger: {
    padding: '12px 16px',
    backgroundColor: colors.dangerBg,
    border: `1px solid ${colors.dangerBorder}`,
    color: colors.dangerText,
    borderRadius: radius.md,
    fontSize: font.sizeMd,
  } as CSSProperties,

  success: {
    padding: '12px 16px',
    backgroundColor: colors.successBg,
    border: `1px solid #86efac`,
    color: '#14532d',
    borderRadius: radius.md,
    fontSize: font.sizeMd,
  } as CSSProperties,
};

// Quick action card colors (pastel gradients)
export const quickActionColors = [
  { bg: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)', accent: '#00838f' },
  { bg: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)', accent: '#ad1457' },
  { bg: 'linear-gradient(135deg, #f3e8ff 0%, #e1bee7 100%)', accent: '#6a1b9a' },
  { bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', accent: '#2e7d32' },
];
