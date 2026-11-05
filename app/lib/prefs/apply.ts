import { readerThemes, readingFonts, resolveAccent, themes, type ThemeId } from '~/design/tokens';
import type { AppearancePrefs, ReaderTextPrefs } from './schema';

export function resolveTheme(choice: AppearancePrefs['theme'], prefersDark: boolean): ThemeId {
  if (choice === 'system') return prefersDark ? 'dark' : 'paper';
  return choice;
}

export function resolveMotion(choice: AppearancePrefs['motion'], prefersReduced: boolean): 'reduced' | 'full' {
  if (choice === 'system') return prefersReduced ? 'reduced' : 'full';
  return choice;
}

function media(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/** Applies site appearance to <html>. Mirrors themeBootstrapScript() exactly. */
export function applyAppearance(prefs: AppearancePrefs, root: HTMLElement = document.documentElement): ThemeId {
  const theme = resolveTheme(prefs.theme, media('(prefers-color-scheme: dark)'));
  root.dataset.theme = theme;
  root.dataset.accent = prefs.accent;
  root.dataset.density = prefs.density;
  root.dataset.motion = resolveMotion(prefs.motion, media('(prefers-reduced-motion: reduce)'));
  root.style.setProperty('--bv-text-scale', String(prefs.textScale / 100));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themes[theme].bg);
  return theme;
}

export interface ReaderLook {
  page: string;
  ink: string;
  accent: string;
  style: Record<string, string>;
}

/**
 * Reading appearance is applied to the reader's own container, never to <html>,
 * so it can differ completely from the site theme.
 */
export function readerLook(prefs: ReaderTextPrefs, siteTheme: ThemeId, accent: AppearancePrefs['accent']): ReaderLook {
  let page: string;
  let ink: string;
  if (prefs.theme === 'match') {
    page = themes[siteTheme].surface;
    ink = themes[siteTheme].text;
  } else if (prefs.theme === 'custom') {
    page = prefs.customPage;
    ink = prefs.customInk;
  } else {
    page = readerThemes[prefs.theme].page;
    ink = readerThemes[prefs.theme].ink;
  }
  const marginRem = [0.5, 1, 1.5, 2, 3, 4, 5][prefs.margins] ?? 2;
  return {
    page,
    ink,
    accent: resolveAccent(siteTheme, accent).accent,
    style: {
      '--rd-page': page,
      '--rd-ink': ink,
      '--rd-font': readingFonts[prefs.font].stack,
      '--rd-size': `${prefs.fontSize / 16}rem`,
      '--rd-weight': String(prefs.fontWeight),
      '--rd-leading': String(prefs.lineHeight),
      '--rd-tracking': `${prefs.letterSpacing}em`,
      '--rd-paragraph': `${prefs.paragraphSpacing}em`,
      '--rd-measure': `${prefs.measure}ch`,
      '--rd-margin': `${marginRem}rem`,
      '--rd-align': prefs.align === 'justify' ? 'justify' : 'start',
      '--rd-indent': prefs.paragraphSpacing === 0 ? '1.5em' : '0',
    },
  };
}
