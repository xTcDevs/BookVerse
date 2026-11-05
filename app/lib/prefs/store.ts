import { SCHEMA_VERSION, defaultsFor, parsePrefs, scopes, type PrefsFor, type Scope } from './schema';

// A tiny external store per preference scope. Scopes never write to each other:
// changing the site theme cannot touch reading settings, and vice versa.

export const NEVER = '1970-01-01T00:00:00.000Z';
export const storageKey = (scope: Scope) => `bookverse:prefs:${scope}`;

export type ChangeOrigin = 'local' | 'remote' | 'sync';

export interface Envelope<S extends Scope> {
  v: number;
  updatedAt: string;
  data: PrefsFor<S>;
}

type Listener = (origin: ChangeOrigin) => void;

function readStorage(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // Private mode, blocked storage or corrupt JSON: fall back to defaults.
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. The in-memory value still applies for this visit.
  }
}

export class PrefStore<S extends Scope> {
  readonly scope: S;
  private envelope: Envelope<S>;
  private readonly listeners = new Set<Listener>();
  private loaded = false;

  constructor(scope: S) {
    this.scope = scope;
    this.envelope = { v: SCHEMA_VERSION, updatedAt: NEVER, data: defaultsFor(scope) };
  }

  /** Reads the saved value once, in the browser. */
  load(): void {
    if (this.loaded || typeof window === 'undefined') return;
    this.loaded = true;
    this.envelope = this.fromStorage();
    this.emit('remote');
  }

  /** Re-reads storage, e.g. after another tab saved a change. */
  reloadFromStorage(): void {
    this.envelope = this.fromStorage();
    this.emit('remote');
  }

  private fromStorage(): Envelope<S> {
    const saved = readStorage(storageKey(this.scope)) as Partial<Envelope<S>> | null;
    if (!saved || typeof saved !== 'object')
      return { v: SCHEMA_VERSION, updatedAt: NEVER, data: defaultsFor(this.scope) };
    const updatedAt =
      typeof saved.updatedAt === 'string' && !Number.isNaN(Date.parse(saved.updatedAt)) ? saved.updatedAt : NEVER;
    return { v: SCHEMA_VERSION, updatedAt, data: parsePrefs(this.scope, saved.data) };
  }

  get = (): Envelope<S> => this.envelope;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** A change made by the person on this device. */
  update(patch: Partial<PrefsFor<S>>): void {
    const data = parsePrefs(this.scope, { ...this.envelope.data, ...patch });
    this.commit({ v: SCHEMA_VERSION, updatedAt: new Date().toISOString(), data }, 'local');
  }

  reset(): void {
    this.commit({ v: SCHEMA_VERSION, updatedAt: new Date().toISOString(), data: defaultsFor(this.scope) }, 'local');
  }

  /** A value that came from the account (another device). */
  replace(data: unknown, updatedAt: string, origin: Exclude<ChangeOrigin, 'local'>): void {
    this.commit({ v: SCHEMA_VERSION, updatedAt, data: parsePrefs(this.scope, data) }, origin);
  }

  private commit(next: Envelope<S>, origin: ChangeOrigin): void {
    this.envelope = next;
    if (typeof window !== 'undefined') writeStorage(storageKey(this.scope), next);
    this.emit(origin);
  }

  private emit(origin: ChangeOrigin): void {
    for (const listener of this.listeners) listener(origin);
  }
}

type StoreMap = { [S in Scope]: PrefStore<S> };

function createStores(): StoreMap {
  return {
    appearance: new PrefStore('appearance'),
    browse: new PrefStore('browse'),
    reader_text: new PrefStore('reader_text'),
    reader_visual: new PrefStore('reader_visual'),
    reader_audio: new PrefStore('reader_audio'),
  };
}

let stores: StoreMap | null = null;

export function getStores(): StoreMap {
  stores ??= createStores();
  return stores;
}

export function getStore<S extends Scope>(scope: S): PrefStore<S> {
  return getStores()[scope] as PrefStore<S>;
}

/** Only for tests: start from a clean slate. */
export function resetStoresForTests(): void {
  stores = createStores();
}

export function loadAllStores(): void {
  for (const scope of scopes) getStore(scope).load();
}
