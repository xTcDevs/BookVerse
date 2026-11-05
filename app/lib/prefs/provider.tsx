import { useEffect, type ReactNode } from 'react';
import { applyAppearance } from './apply';
import { importLegacyPreferences } from './legacy';
import { scopes } from './schema';
import { getStore, loadAllStores, storageKey } from './store';

/** Loads saved preferences, applies site appearance and keeps tabs in step. */
export function PreferencesRuntime({ children }: { children: ReactNode }) {
  useEffect(() => {
    loadAllStores();
    try {
      importLegacyPreferences(window.localStorage, {
        appearance: getStore('appearance'),
        readerText: getStore('reader_text'),
      });
    } catch {
      // localStorage blocked entirely: nothing to import.
    }

    const appearance = getStore('appearance');
    const apply = () => applyAppearance(appearance.get().data);
    apply();
    const unsubscribe = appearance.subscribe(apply);

    const queries = ['(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)'].map((q) =>
      window.matchMedia(q),
    );
    for (const q of queries) q.addEventListener('change', apply);

    // Another tab changed a setting: pick it up here too.
    const onStorage = (event: StorageEvent) => {
      const scope = scopes.find((s) => storageKey(s) === event.key);
      if (scope) getStore(scope).reloadFromStorage();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      unsubscribe();
      for (const q of queries) q.removeEventListener('change', apply);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return children;
}
