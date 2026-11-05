import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** False in pre-rendered HTML and during hydration; true once running in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
