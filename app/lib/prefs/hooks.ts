import { useCallback, useSyncExternalStore } from 'react';
import { SCHEMA_VERSION, defaultsFor, type PrefsFor, type Scope } from './schema';
import { NEVER, getStore, type Envelope } from './store';

const serverSnapshots = new Map<Scope, Envelope<Scope>>();

function serverSnapshot<S extends Scope>(scope: S): Envelope<S> {
  let snapshot = serverSnapshots.get(scope);
  if (!snapshot) {
    snapshot = { v: SCHEMA_VERSION, updatedAt: NEVER, data: defaultsFor(scope) };
    serverSnapshots.set(scope, snapshot);
  }
  return snapshot as Envelope<S>;
}

export interface PrefsApi<S extends Scope> {
  update: (patch: Partial<PrefsFor<S>>) => void;
  reset: () => void;
  updatedAt: string;
}

/** Reads and edits one preference scope. Pre-rendered HTML uses the defaults. */
export function usePrefs<S extends Scope>(scope: S): [PrefsFor<S>, PrefsApi<S>] {
  const store = getStore(scope);
  const envelope = useSyncExternalStore(store.subscribe, store.get, () => serverSnapshot(scope));
  const update = useCallback((patch: Partial<PrefsFor<S>>) => store.update(patch), [store]);
  const reset = useCallback(() => store.reset(), [store]);
  return [envelope.data, { update, reset, updatedAt: envelope.updatedAt }];
}
