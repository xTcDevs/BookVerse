import { ensureContrast, mix, readableOn, type Hex } from './color';

// ── Site themes ──────────────────────────────────────────────────────────────
// Every theme defines every token. Accent colours are derived per theme so that
// each theme × accent pair meets WCAG contrast (verified in tokens.test.ts).

export const themeIds = ['paper', 'white', 'cream', 'sepia', 'dark', 'midnight', 'oled', 'contrast'] as const;
export type ThemeId = (typeof themeIds)[number];
export type ThemeChoice = ThemeId | 'system';

export const accentIds = ['terracotta', 'ink', 'forest', 'plum', 'saffron', 'graphite'] as const;
export type AccentId = (typeof accentIds)[number];

interface ThemeBase {
  label: string;
  description: string;
  tone: 'light' | 'dark';
  /** Text that must reach 7:1 instead of 4.5:1 (High Contrast). */
  enhanced: boolean;
  bg: Hex;
  surface: Hex;
  sunken: Hex;
  text: Hex;
  muted: Hex;
  border: Hex;
  borderStrong: Hex;
  shadow: string;
}

export const themes: Record<ThemeId, ThemeBase> = {
  paper: {
    label: 'Paper',
    description: 'Warm off-white with ink-dark text. The default by day.',
    tone: 'light',
    enhanced: false,
    bg: '#F6F1E9',
    surface: '#FFFDF9',
    sunken: '#EFE7DA',
    text: '#1B1712',
    muted: '#5A5247',
    border: '#E2D9CB',
    borderStrong: '#8A7F6E',
    shadow: '40 28 14',
  },
  white: {
    label: 'White',
    description: 'Neutral white and cool greys.',
    tone: 'light',
    enhanced: false,
    bg: '#FFFFFF',
    surface: '#FAFAF9',
    sunken: '#F2F2F1',
    text: '#18181B',
    muted: '#52525B',
    border: '#E4E4E7',
    borderStrong: '#85858F',
    shadow: '24 24 27',
  },
  cream: {
    label: 'Cream',
    description: 'Softer, lower-glare paper for long sessions.',
    tone: 'light',
    enhanced: false,
    bg: '#FBF6EA',
    surface: '#FFFCF4',
    sunken: '#F1E8D4',
    text: '#2A251D',
    muted: '#5C5244',
    border: '#E6DCC6',
    borderStrong: '#8C7F67',
    shadow: '60 44 20',
  },
  sepia: {
    label: 'Sepia',
    description: 'Brown on tan. Warm and dim.',
    tone: 'light',
    enhanced: false,
    bg: '#EADBC4',
    surface: '#F2E6D3',
    sunken: '#E0CDB0',
    text: '#33241A',
    muted: '#523C2C',
    border: '#D3BE9E',
    borderStrong: '#7F6447',
    shadow: '70 45 20',
  },
  dark: {
    label: 'Dark',
    description: 'Charcoal greys, easier on the eyes than pure black.',
    tone: 'dark',
    enhanced: false,
    bg: '#1C1B1A',
    surface: '#262422',
    sunken: '#161514',
    text: '#EDE8E1',
    muted: '#ABA399',
    border: '#3A3734',
    borderStrong: '#7C766E',
    shadow: '0 0 0',
  },
  midnight: {
    label: 'Midnight',
    description: 'Deep blue-black with cool accents.',
    tone: 'dark',
    enhanced: false,
    bg: '#0F1522',
    surface: '#172033',
    sunken: '#0A0F19',
    text: '#E3E8F2',
    muted: '#9EAAC0',
    border: '#273349',
    borderStrong: '#66779A',
    shadow: '0 0 0',
  },
  oled: {
    label: 'OLED Black',
    description: 'True black surfaces and dimmed text to avoid glare.',
    tone: 'dark',
    enhanced: false,
    bg: '#000000',
    surface: '#0E0E0E',
    sunken: '#000000',
    text: '#D9D6D0',
    muted: '#918E88',
    border: '#262626',
    borderStrong: '#6E6B66',
    shadow: '0 0 0',
  },
  contrast: {
    label: 'High Contrast',
    description: 'Maximum contrast, solid borders and heavy focus rings.',
    tone: 'light',
    enhanced: true,
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    sunken: '#F0F0F0',
    text: '#000000',
    muted: '#1F1F1F',
    border: '#000000',
    borderStrong: '#000000',
    shadow: '0 0 0',
  },
};

interface AccentBase {
  label: string;
  /** Used on light themes before contrast adjustment. */
  light: Hex;
  /** Used on dark themes before contrast adjustment. */
  dark: Hex;
}

export const accents: Record<AccentId, AccentBase> = {
  terracotta: { label: 'Terracotta', light: '#A8462A', dark: '#E08A68' },
  ink: { label: 'Ink Blue', light: '#2F4FA3', dark: '#8FB3FF' },
  forest: { label: 'Forest', light: '#2F6B45', dark: '#7CC79A' },
  plum: { label: 'Plum', light: '#7A3B69', dark: '#D69BC8' },
  saffron: { label: 'Saffron', light: '#8A5A00', dark: '#E9B949' },
  graphite: { label: 'Graphite', light: '#3F3F46', dark: '#C4C4CC' },
};

export interface ResolvedAccent {
  accent: Hex;
  onAccent: Hex;
  accentSoft: Hex;
}

/** Accent colour for a theme, adjusted until it reads as text on every surface. */
export function resolveAccent(themeId: ThemeId, accentId: AccentId): ResolvedAccent {
  const theme = themes[themeId];
  const base = theme.tone === 'dark' ? accents[accentId].dark : accents[accentId].light;
  const target = theme.enhanced ? 7 : 4.5;
  const accent = ensureContrast(base, [theme.bg, theme.surface, theme.sunken], target);
  return {
    accent,
    onAccent: readableOn(accent),
    accentSoft: mix(theme.bg, accent, theme.tone === 'dark' ? 0.2 : 0.12),
  };
}

// ── Reader page themes ───────────────────────────────────────────────────────
// Independent from the site theme. "match" follows whatever the site uses.

export const readerThemeIds = ['paper', 'white', 'cream', 'sepia', 'night', 'oled', 'contrast'] as const;
export type ReaderThemeId = (typeof readerThemeIds)[number];
export type ReaderThemeChoice = ReaderThemeId | 'match' | 'custom';

export const readerThemes: Record<ReaderThemeId, { label: string; page: Hex; ink: Hex }> = {
  paper: { label: 'Paper', page: '#FBF7EF', ink: '#2A241C' },
  white: { label: 'White', page: '#FFFFFF', ink: '#1A1A1A' },
  cream: { label: 'Cream', page: '#F8F1DF', ink: '#2E281F' },
  sepia: { label: 'Sepia', page: '#F1E4CC', ink: '#3B2A1A' },
  night: { label: 'Night', page: '#161412', ink: '#CFC6B8' },
  oled: { label: 'OLED', page: '#000000', ink: '#BDB8B0' },
  contrast: { label: 'High contrast', page: '#FFFFFF', ink: '#000000' },
};

// ── Fonts ────────────────────────────────────────────────────────────────────

export const fontStacks = {
  display: "'Newsreader Variable', 'Iowan Old Style', Georgia, serif",
  ui: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

export const readingFontIds = ['literata', 'source-serif', 'inter', 'atkinson', 'opendyslexic'] as const;
export type ReadingFontId = (typeof readingFontIds)[number];

export const readingFonts: Record<ReadingFontId, { label: string; stack: string; kind: string }> = {
  literata: { label: 'Literata', stack: "'Literata Variable', Georgia, serif", kind: 'Serif, made for long reading' },
  'source-serif': { label: 'Source Serif 4', stack: "'Source Serif 4 Variable', Georgia, serif", kind: 'Serif' },
  inter: { label: 'Inter', stack: fontStacks.ui, kind: 'Sans-serif' },
  atkinson: {
    label: 'Atkinson Hyperlegible',
    stack: "'Atkinson Hyperlegible', system-ui, sans-serif",
    kind: 'Sans-serif, for low vision',
  },
  opendyslexic: { label: 'OpenDyslexic', stack: "'OpenDyslexic', system-ui, sans-serif", kind: 'Dyslexia-friendly' },
};

// ── CSS generation ───────────────────────────────────────────────────────────

function themeVars(id: ThemeId): string {
  const t = themes[id];
  return [
    `--bv-bg:${t.bg}`,
    `--bv-surface:${t.surface}`,
    `--bv-sunken:${t.sunken}`,
    `--bv-text:${t.text}`,
    `--bv-muted:${t.muted}`,
    `--bv-border:${t.border}`,
    `--bv-border-strong:${t.borderStrong}`,
    `--bv-shadow-rgb:${t.shadow}`,
    `--bv-focus-width:${t.enhanced ? '3px' : '2px'}`,
    `color-scheme:${t.tone}`,
  ].join(';');
}

function accentVars(themeId: ThemeId, accentId: AccentId): string {
  const a = resolveAccent(themeId, accentId);
  return `--bv-accent:${a.accent};--bv-on-accent:${a.onAccent};--bv-accent-soft:${a.accentSoft};--bv-focus:${a.accent}`;
}

/** All theme × accent custom properties, rendered once into the document head. */
export function buildThemeCss(): string {
  const rules: string[] = [];
  for (const id of themeIds) {
    rules.push(`:root[data-theme="${id}"]{${themeVars(id)}}`);
    for (const accent of accentIds) {
      rules.push(`:root[data-theme="${id}"][data-accent="${accent}"]{${accentVars(id, accent)}}`);
    }
  }
  return rules.join('\n');
}
