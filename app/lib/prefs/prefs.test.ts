import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { themeIds } from '~/design/tokens';
import { applyAppearance, readerLook, resolveTheme } from './apply';
import { themeBootstrapScript } from './bootstrap';
import { importLegacyPreferences } from './legacy';
import { applyTextPreset, defaultsFor, isDefault, parsePrefs, scopes, textPresets } from './schema';
import { getStore, NEVER, resetStoresForTests, storageKey } from './store';
import { decideSync } from './sync';

beforeEach(() => {
  window.localStorage.clear();
  resetStoresForTests();
  document.documentElement.removeAttribute('style');
  for (const a of ['data-theme', 'data-accent', 'data-motion', 'data-density'])
    document.documentElement.removeAttribute(a);
});
afterEach(() => window.localStorage.clear());

describe('schema', () => {
  it('gives every scope valid defaults', () => {
    for (const scope of scopes) expect(isDefault(scope, defaultsFor(scope))).toBe(true);
  });

  it('repairs bad or out-of-range values field by field instead of discarding everything', () => {
    const prefs = parsePrefs('reader_text', { fontSize: 400, font: 'comic-sans', lineHeight: 1.9, measure: 'wide' });
    expect(prefs.fontSize).toBe(20);
    expect(prefs.font).toBe('literata');
    expect(prefs.lineHeight).toBe(1.9);
    expect(prefs.measure).toBe(62);
  });

  it('rejects an unknown site theme and falls back to system', () => {
    expect(parsePrefs('appearance', { theme: 'neon' }).theme).toBe('system');
    for (const id of themeIds) expect(parsePrefs('appearance', { theme: id }).theme).toBe(id);
  });

  it('returns defaults for null, undefined, empty or non-object input', () => {
    for (const scope of scopes) {
      for (const input of [null, undefined, {}, '', 42, []])
        expect(parsePrefs(scope, input)).toEqual(defaultsFor(scope));
    }
  });

  it('keeps values exactly on the range boundaries', () => {
    expect(parsePrefs('reader_text', { fontSize: 14 }).fontSize).toBe(14);
    expect(parsePrefs('reader_text', { fontSize: 32 }).fontSize).toBe(32);
    expect(parsePrefs('reader_text', { fontSize: 13.9 }).fontSize).toBe(20);
    expect(parsePrefs('appearance', { textScale: 130 }).textScale).toBe(130);
  });

  it('Classic Book preset equals the text defaults', () => {
    const d = defaultsFor('reader_text');
    expect(applyTextPreset(d, 'classic')).toEqual(d);
  });

  it('every text preset produces valid settings', () => {
    for (const id of Object.keys(textPresets) as (keyof typeof textPresets)[]) {
      const applied = applyTextPreset(defaultsFor('reader_text'), id);
      expect(parsePrefs('reader_text', applied)).toEqual(applied);
      expect(applied.preset).toBe(id);
    }
  });
});

describe('stores', () => {
  it('keeps each scope independent: reader settings never touch the site theme', () => {
    getStore('appearance').load();
    getStore('reader_text').load();
    getStore('reader_visual').load();
    getStore('appearance').update({ theme: 'oled', accent: 'forest' });
    getStore('reader_text').update({ theme: 'sepia', fontSize: 24 });
    getStore('reader_visual').update({ direction: 'rtl' });

    expect(getStore('appearance').get().data.theme).toBe('oled');
    expect(getStore('reader_text').get().data.theme).toBe('sepia');
    expect(getStore('reader_visual').get().data.direction).toBe('rtl');

    getStore('reader_text').reset();
    expect(getStore('reader_text').get().data).toEqual(defaultsFor('reader_text'));
    expect(getStore('appearance').get().data.theme).toBe('oled');
    expect(getStore('reader_visual').get().data.direction).toBe('rtl');
  });

  it('persists under its own key and survives a reload', () => {
    getStore('appearance').load();
    getStore('appearance').update({ theme: 'midnight' });
    const saved = JSON.parse(window.localStorage.getItem(storageKey('appearance')) ?? '{}');
    expect(saved.data.theme).toBe('midnight');
    expect(Date.parse(saved.updatedAt)).toBeGreaterThan(0);

    resetStoresForTests();
    getStore('appearance').load();
    expect(getStore('appearance').get().data.theme).toBe('midnight');
  });

  it('treats corrupt storage as defaults', () => {
    window.localStorage.setItem(storageKey('reader_audio'), '{not json');
    getStore('reader_audio').load();
    expect(getStore('reader_audio').get().data).toEqual(defaultsFor('reader_audio'));
    expect(getStore('reader_audio').get().updatedAt).toBe(NEVER);
  });

  it('treats a missing or empty saved value as defaults', () => {
    window.localStorage.setItem(storageKey('reader_visual'), '');
    getStore('reader_visual').load();
    expect(getStore('reader_visual').get().data).toEqual(defaultsFor('reader_visual'));
    getStore('browse').load();
    expect(getStore('browse').get()).toEqual({ v: 1, updatedAt: NEVER, data: defaultsFor('browse') });
  });

  it('tells listeners where a change came from', () => {
    const store = getStore('browse');
    store.load();
    const origins: string[] = [];
    store.subscribe((o) => origins.push(o));
    store.update({ layout: 'list' });
    store.replace({ layout: 'grid' }, new Date().toISOString(), 'remote');
    expect(origins).toEqual(['local', 'remote']);
  });
});

describe('sync decisions', () => {
  const t = (s: number) => new Date(Date.UTC(2026, 10, 5, 12, 0, s)).toISOString();
  it('pushes local changes when the account has none', () =>
    expect(decideSync({ updatedAt: t(1), isDefault: false }, null)).toBe('push'));
  it('does not push untouched defaults', () =>
    expect(decideSync({ updatedAt: NEVER, isDefault: true }, null)).toBe('none'));
  it('pulls when the account is newer', () =>
    expect(decideSync({ updatedAt: t(1), isDefault: false }, { updatedAt: t(2) })).toBe('pull'));
  it('pushes when this device is newer', () =>
    expect(decideSync({ updatedAt: t(3), isDefault: false }, { updatedAt: t(2) })).toBe('push'));
  it('does nothing when equal', () =>
    expect(decideSync({ updatedAt: t(2), isDefault: false }, { updatedAt: t(2) })).toBe('none'));
});

describe('applying appearance', () => {
  it('follows the system for the "system" theme', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('paper');
    expect(resolveTheme('sepia', true)).toBe('sepia');
  });

  it('sets the attributes the CSS reads', () => {
    applyAppearance({
      ...defaultsFor('appearance'),
      theme: 'contrast',
      accent: 'plum',
      density: 'compact',
      textScale: 120,
    });
    const root = document.documentElement;
    expect(root.dataset.theme).toBe('contrast');
    expect(root.dataset.accent).toBe('plum');
    expect(root.dataset.density).toBe('compact');
    expect(root.style.getPropertyValue('--bv-text-scale')).toBe('1.2');
  });

  it('the inline bootstrap script applies the same theme before React loads', () => {
    window.localStorage.setItem(
      storageKey('appearance'),
      JSON.stringify({ v: 1, updatedAt: new Date().toISOString(), data: { theme: 'sepia', accent: 'ink' } }),
    );
    new Function(themeBootstrapScript())();
    expect(document.documentElement.dataset.theme).toBe('sepia');
    expect(document.documentElement.dataset.accent).toBe('ink');
  });

  it('the bootstrap script ignores tampered values', () => {
    window.localStorage.setItem(
      storageKey('appearance'),
      JSON.stringify({ data: { theme: '"><script>', accent: 'x', textScale: 999 } }),
    );
    new Function(themeBootstrapScript())();
    expect(themeIds).toContain(document.documentElement.dataset.theme);
    expect(document.documentElement.dataset.accent).toBe('terracotta');
    expect(document.documentElement.style.getPropertyValue('--bv-text-scale')).toBe('1');
  });

  it('reader colours are independent of the site theme unless set to match', () => {
    const sepia = readerLook({ ...defaultsFor('reader_text'), theme: 'sepia' }, 'oled', 'terracotta');
    const sepiaOnPaper = readerLook({ ...defaultsFor('reader_text'), theme: 'sepia' }, 'paper', 'terracotta');
    expect(sepia.page).toBe(sepiaOnPaper.page);
    const match = readerLook({ ...defaultsFor('reader_text'), theme: 'match' }, 'oled', 'terracotta');
    expect(match.page).not.toBe(sepia.page);
  });
});

describe('legacy import', () => {
  it('carries the old site settings over once and removes the old keys', () => {
    window.localStorage.setItem('bookverse-theme', 'dark');
    window.localStorage.setItem(
      'bookverse-reader-preferences',
      JSON.stringify({ fontSize: 22, width: 'wide', theme: 'sepia' }),
    );
    window.localStorage.setItem('bookverse-library', '["fake"]');
    getStore('appearance').load();
    getStore('reader_text').load();
    importLegacyPreferences(window.localStorage, {
      appearance: getStore('appearance'),
      readerText: getStore('reader_text'),
    });

    expect(getStore('appearance').get().data.theme).toBe('dark');
    expect(getStore('reader_text').get().data).toMatchObject({
      fontSize: 22,
      measure: 80,
      theme: 'sepia',
      preset: 'custom',
    });
    expect(window.localStorage.getItem('bookverse-library')).toBeNull();
    expect(window.localStorage.getItem('bookverse-theme')).toBeNull();

    getStore('appearance').update({ theme: 'white' });
    window.localStorage.setItem('bookverse-theme', 'dark');
    importLegacyPreferences(window.localStorage, {
      appearance: getStore('appearance'),
      readerText: getStore('reader_text'),
    });
    expect(getStore('appearance').get().data.theme).toBe('white');
  });
});
