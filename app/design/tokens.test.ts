import { describe, expect, it } from 'vitest';
import { contrast } from './color';
import { accentIds, readerThemeIds, readerThemes, resolveAccent, themeIds, themes } from './tokens';

describe('site themes meet WCAG contrast', () => {
  for (const id of themeIds) {
    const t = themes[id];
    const textTarget = t.enhanced ? 7 : 4.5;

    it(`${id}: body and muted text are readable on every surface`, () => {
      for (const surface of [t.bg, t.surface, t.sunken]) {
        expect(contrast(t.text, surface)).toBeGreaterThanOrEqual(textTarget);
        expect(contrast(t.muted, surface)).toBeGreaterThanOrEqual(textTarget);
      }
    });

    it(`${id}: control borders reach 3:1 (WCAG 1.4.11)`, () => {
      expect(contrast(t.borderStrong, t.bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(t.borderStrong, t.surface)).toBeGreaterThanOrEqual(3);
    });

    for (const accentId of accentIds) {
      it(`${id} × ${accentId}: accent text, button text and focus ring pass`, () => {
        const a = resolveAccent(id, accentId);
        for (const surface of [t.bg, t.surface, t.sunken]) {
          expect(contrast(a.accent, surface)).toBeGreaterThanOrEqual(textTarget);
        }
        expect(contrast(a.onAccent, a.accent)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.text, a.accentSoft)).toBeGreaterThanOrEqual(textTarget);
      });
    }
  }
});

describe('reader page themes', () => {
  for (const id of readerThemeIds) {
    it(`${id}: page text is readable`, () => {
      const r = readerThemes[id];
      expect(contrast(r.ink, r.page)).toBeGreaterThanOrEqual(id === 'contrast' ? 7 : 4.5);
    });
  }
});
