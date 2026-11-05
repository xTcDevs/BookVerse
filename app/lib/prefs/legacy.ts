import type { PrefStore } from './store';

// The previous BookVerse site saved a light/dark theme and three reader settings
// in localStorage. Carry those choices over once, then remove the old keys
// (including the old demo library and progress, which referred to invented books).

const MARKER = 'bookverse:legacy-imported';
const OLD_KEYS = ['bookverse-theme', 'bookverse-reader-preferences', 'bookverse-library', 'bookverse-reading-progress'];

interface Targets {
  appearance: PrefStore<'appearance'>;
  readerText: PrefStore<'reader_text'>;
}

export function importLegacyPreferences(storage: Storage, targets: Targets): void {
  try {
    if (storage.getItem(MARKER)) return;
    const oldTheme = storage.getItem('bookverse-theme');
    if (oldTheme === 'dark') targets.appearance.update({ theme: 'dark' });

    const rawReader = storage.getItem('bookverse-reader-preferences');
    if (rawReader) {
      const old = JSON.parse(rawReader) as { fontSize?: unknown; width?: unknown; theme?: unknown };
      const measure = { narrow: 56, comfortable: 66, wide: 80 }[String(old.width)] ?? undefined;
      const theme = { paper: 'paper', sepia: 'sepia', night: 'night' }[String(old.theme)] as
        'paper' | 'sepia' | 'night' | undefined;
      targets.readerText.update({
        preset: 'custom',
        ...(typeof old.fontSize === 'number' ? { fontSize: old.fontSize } : {}),
        ...(measure ? { measure } : {}),
        ...(theme ? { theme } : {}),
      });
    }
    for (const key of OLD_KEYS) storage.removeItem(key);
    storage.setItem(MARKER, '1');
  } catch {
    // Unreadable old data is simply left behind; it no longer affects anything.
  }
}
