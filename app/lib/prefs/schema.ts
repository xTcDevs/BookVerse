import { z } from 'zod';
import { accentIds, readerThemeIds, readingFontIds, themeIds } from '~/design/tokens';
import { formatSlugs } from '~/data/formats';

// One schema per scope. Every field falls back to its default on bad input, so a
// corrupted or outdated saved value never breaks the page; it just resets that field.

export const scopes = ['appearance', 'browse', 'reader_text', 'reader_visual', 'reader_audio'] as const;
export type Scope = (typeof scopes)[number];

export const SCHEMA_VERSION = 1;

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const num = (min: number, max: number, fallback: number) => z.number().min(min).max(max).catch(fallback);

export const appearanceSchema = z.object({
  theme: z.enum(['system', ...themeIds]).catch('system'),
  accent: z.enum(accentIds).catch('terracotta'),
  textScale: num(90, 130, 100),
  density: z.enum(['comfortable', 'compact']).catch('comfortable'),
  motion: z.enum(['system', 'reduced', 'full']).catch('system'),
});

export const browseSchema = z.object({
  layout: z.enum(['grid', 'list']).catch('grid'),
  coverSize: z.enum(['small', 'medium', 'large']).catch('medium'),
  preferredFormats: z.array(z.enum(formatSlugs)).max(formatSlugs.length).catch([]),
  preferredGenres: z.array(z.string().max(60)).max(30).catch([]),
});

export const textPresetIds = ['classic', 'modern', 'minimal', 'sepia', 'night', 'contrast', 'custom'] as const;
export type TextPresetId = (typeof textPresetIds)[number];

export const readerTextSchema = z.object({
  preset: z.enum(textPresetIds).catch('classic'),
  theme: z.enum(['match', 'custom', ...readerThemeIds]).catch('paper'),
  customPage: hex.catch('#FBF7EF'),
  customInk: hex.catch('#2A241C'),
  font: z.enum(readingFontIds).catch('literata'),
  fontSize: num(14, 32, 20),
  fontWeight: num(300, 700, 400),
  lineHeight: num(1.2, 2.2, 1.65),
  letterSpacing: num(-0.02, 0.12, 0),
  // Defaults equal the Classic Book preset.
  paragraphSpacing: num(0, 1.6, 0),
  align: z.enum(['start', 'justify']).catch('justify'),
  measure: num(45, 90, 62),
  margins: num(0, 6, 3),
  layout: z.enum(['scroll', 'paged']).catch('scroll'),
});

export const readerVisualSchema = z.object({
  mode: z.enum(['auto', 'paged', 'vertical']).catch('auto'),
  spread: z.enum(['single', 'double']).catch('single'),
  direction: z.enum(['auto', 'rtl', 'ltr']).catch('auto'),
  fit: z.enum(['width', 'height', 'original']).catch('width'),
  gap: num(0, 48, 8),
  background: z.enum(['match', 'black', 'grey', 'white']).catch('black'),
  fullscreen: z.boolean().catch(false),
});

export const readerAudioSchema = z.object({
  speed: num(0.5, 2.5, 1),
  skipBack: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]).catch(15),
  skipForward: z.union([z.literal(10), z.literal(15), z.literal(30), z.literal(60)]).catch(30),
  sleepTimer: z.enum(['off', '15', '30', '45', '60', 'chapter']).catch('off'),
  autoplayNext: z.boolean().catch(true),
});

export const schemas = {
  appearance: appearanceSchema,
  browse: browseSchema,
  reader_text: readerTextSchema,
  reader_visual: readerVisualSchema,
  reader_audio: readerAudioSchema,
} as const;

export type PrefsFor<S extends Scope> = z.infer<(typeof schemas)[S]>;
export type AppearancePrefs = PrefsFor<'appearance'>;
export type BrowsePrefs = PrefsFor<'browse'>;
export type ReaderTextPrefs = PrefsFor<'reader_text'>;
export type ReaderVisualPrefs = PrefsFor<'reader_visual'>;
export type ReaderAudioPrefs = PrefsFor<'reader_audio'>;

/** Parses anything into valid preferences; never throws. */
export function parsePrefs<S extends Scope>(scope: S, input: unknown): PrefsFor<S> {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return schemas[scope].parse(source) as PrefsFor<S>;
}

export function defaultsFor<S extends Scope>(scope: S): PrefsFor<S> {
  return parsePrefs(scope, {});
}

export function isDefault<S extends Scope>(scope: S, prefs: PrefsFor<S>): boolean {
  return JSON.stringify(prefs) === JSON.stringify(defaultsFor(scope));
}

// ── Text presets ─────────────────────────────────────────────────────────────

type PresetValues = Omit<ReaderTextPrefs, 'preset' | 'customPage' | 'customInk' | 'layout'>;

export const textPresets: Record<Exclude<TextPresetId, 'custom'>, { label: string; values: PresetValues }> = {
  classic: {
    label: 'Classic Book',
    values: {
      theme: 'paper',
      font: 'literata',
      fontSize: 20,
      fontWeight: 400,
      lineHeight: 1.65,
      letterSpacing: 0,
      paragraphSpacing: 0,
      align: 'justify',
      measure: 62,
      margins: 3,
    },
  },
  modern: {
    label: 'Modern',
    values: {
      theme: 'white',
      font: 'inter',
      fontSize: 18,
      fontWeight: 400,
      lineHeight: 1.7,
      letterSpacing: 0,
      paragraphSpacing: 0.9,
      align: 'start',
      measure: 68,
      margins: 3,
    },
  },
  minimal: {
    label: 'Minimal',
    values: {
      theme: 'match',
      font: 'source-serif',
      fontSize: 19,
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: 0,
      paragraphSpacing: 0.8,
      align: 'start',
      measure: 72,
      margins: 2,
    },
  },
  sepia: {
    label: 'Sepia Paper',
    values: {
      theme: 'sepia',
      font: 'literata',
      fontSize: 21,
      fontWeight: 400,
      lineHeight: 1.7,
      letterSpacing: 0,
      paragraphSpacing: 0,
      align: 'start',
      measure: 62,
      margins: 4,
    },
  },
  night: {
    label: 'Night Reading',
    values: {
      theme: 'night',
      font: 'literata',
      fontSize: 20,
      fontWeight: 380,
      lineHeight: 1.75,
      letterSpacing: 0.01,
      paragraphSpacing: 0.8,
      align: 'start',
      measure: 60,
      margins: 4,
    },
  },
  contrast: {
    label: 'High Contrast',
    values: {
      theme: 'contrast',
      font: 'atkinson',
      fontSize: 22,
      fontWeight: 500,
      lineHeight: 1.7,
      letterSpacing: 0.02,
      paragraphSpacing: 1,
      align: 'start',
      measure: 60,
      margins: 3,
    },
  },
};

/** Applies a preset; any later manual change marks the settings as "custom". */
export function applyTextPreset(current: ReaderTextPrefs, preset: Exclude<TextPresetId, 'custom'>): ReaderTextPrefs {
  return { ...current, ...textPresets[preset].values, preset };
}
