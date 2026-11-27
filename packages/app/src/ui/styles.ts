// Design tokens for ResilioLog UI — Clean Light SaaS Theme (Prodex-inspired).
// Neutral #f8f9fc canvas, crisp white cards with subtle borders,
// light sidebar with soft pill active state, and indigo-blue (#4f46e5) primary accent.

import type { CSSProperties } from 'react';

// ── Colour palette ──────────────────────────────────────────────────────────
export const colors = {
  teal: '#4f46e5',       // Primary accent (indigo-blue)
  tealLight: '#eef2ff',  // Soft indigo tint
  tealDark: '#3730a3',   // Deep indigo

  sidebar: '#f9fafb',
  sidebarBorder: '#e5e7eb',
  sidebarText: '#4b5563',
  sidebarMuted: '#9ca3af',
  sidebarActiveBg: '#eceff4',
  sidebarActiveText: '#111827',

  headerBg: '#ffffff',
  headerBorder: '#eceef2',

  pageBg: '#f6f7fb',

  cardBg: '#ffffff',
  cardBorder: '#eceef2',
  cardShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',

  text: '#111827',
  textMuted: '#6b7280',
  textSubtle: '#9ca3af',

  success: '#16a34a',
  successBg: '#ecfdf5',
  warning: '#d97706',
  warningBg: '#fffbeb',
  warningBorder: '#fcd34d',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  dangerText: '#991b1b',

  amber: '#f59e0b',
  amberBg: '#fffbeb',
  amberBorder: '#fde68a',

  badgeDeficitBg: '#fef2f2',
  badgeDeficitText: '#b91c1c',

  borderLight: '#eceef2',
  borderMedium: '#d1d5db',
};

// ── Spacing ─────────────────────────────────────────────────────────────────
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
};

// ── Radii ───────────────────────────────────────────────────────────────────
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
};

// ── Typography ───────────────────────────────────────────────────────────────
export const font = {
  family: "'Poppins', system-ui, -apple-system, sans-serif",
  sizeXs: 11,
  sizeSm: 12,
  sizeMd: 13.5,
  sizeLg: 15.5,
  sizeXl: 20,
  size2xl: 22,
  size3xl: 26,
  weightNormal: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
};

// ── Layout constants ─────────────────────────────────────────────────────────
export const layout = {
  sidebarWidth: 236,
  headerHeight: 62,
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
    padding: '9px 18px',
    backgroundColor: '#111827',
    color: '#ffffff',
    border: 'none',
    borderRadius: radius.md,
    fontSize: font.sizeMd,
    fontWeight: font.weightMedium,
    cursor: 'pointer',
    minHeight: 40,
  } as CSSProperties,

  secondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 14px',
    backgroundColor: '#ffffff',
    color: colors.text,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: radius.md,
    fontSize: font.sizeMd,
    fontWeight: font.weightMedium,
    cursor: 'pointer',
    minHeight: 38,
  } as CSSProperties,

  danger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 14px',
    backgroundColor: colors.dangerBg,
    color: colors.dangerText,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: radius.md,
    fontSize: font.sizeMd,
    fontWeight: font.weightMedium,
    cursor: 'pointer',
    minHeight: 38,
  } as CSSProperties,
};

export const input: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: radius.md,
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
    fontWeight: font.weightSemibold,
  } as CSSProperties,

  warning: {
    display: 'inline-block',
    padding: '2px 10px',
    backgroundColor: colors.warningBg,
    color: colors.warning,
    borderRadius: radius.pill,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  } as CSSProperties,

  success: {
    display: 'inline-block',
    padding: '2px 10px',
    backgroundColor: colors.successBg,
    color: colors.success,
    borderRadius: radius.pill,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  } as CSSProperties,

  amber: {
    display: 'inline-block',
    padding: '2px 10px',
    backgroundColor: colors.amberBg,
    color: colors.amber,
    borderRadius: radius.pill,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
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
    border: `1px solid #a7f3d0`,
    color: '#065f46',
    borderRadius: radius.md,
    fontSize: font.sizeMd,
  } as CSSProperties,
};

// Quick action card colors (subtle clean tints)
export const quickActionColors = [
  { bg: '#eef2ff', accent: '#4f46e5' },
  { bg: '#ecfdf5', accent: '#059669' },
  { bg: '#fffbeb', accent: '#d97706' },
  { bg: '#f0f9ff', accent: '#0284c7' },
];
