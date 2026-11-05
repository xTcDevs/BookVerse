import type { BookverseClient } from '~/lib/supabase';
import type { Json } from '~/lib/database.types';
import { SCHEMA_VERSION, isDefault, scopes, type Scope } from './schema';
import { getStore, loadAllStores, type Envelope } from './store';

export type SyncDecision = 'push' | 'pull' | 'none';

/** Newer change wins, scope by scope. Untouched local settings never overwrite the account. */
export function decideSync(
  local: { updatedAt: string; isDefault: boolean },
  remote: { updatedAt: string } | null,
): SyncDecision {
  if (!remote) return local.isDefault ? 'none' : 'push';
  const l = Date.parse(local.updatedAt);
  const r = Date.parse(remote.updatedAt);
  if (r > l) return 'pull';
  if (l > r) return 'push';
  return 'none';
}

export type SyncStatus =
  { state: 'off' } | { state: 'syncing' } | { state: 'synced'; at: string } | { state: 'error'; message: string };

type StatusListener = (status: SyncStatus) => void;

const DEBOUNCE_MS = 800;

/** Keeps every preference scope in step with the signed-in account. */
export class PreferenceSync {
  private status: SyncStatus = { state: 'off' };
  private readonly statusListeners = new Set<StatusListener>();
  private readonly timers = new Map<Scope, ReturnType<typeof setTimeout>>();
  private unsubscribers: (() => void)[] = [];

  constructor(
    private readonly supabase: BookverseClient,
    private readonly userId: string,
  ) {}

  getStatus = (): SyncStatus => this.status;

  onStatus = (listener: StatusListener): (() => void) => {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  };

  private setStatus(status: SyncStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  async start(): Promise<void> {
    loadAllStores(); // Idempotent; make sure local values are known before comparing.
    this.setStatus({ state: 'syncing' });
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('scope, prefs, updated_at')
      .eq('user_id', this.userId);
    if (error) {
      this.setStatus({
        state: 'error',
        message: 'Couldn’t load your saved settings. Changes are kept on this device.',
      });
      return;
    }
    const remote = new Map(data.map((row) => [row.scope, row]));
    const pushes: Promise<void>[] = [];
    for (const scope of scopes) {
      const store = getStore(scope);
      const local = store.get();
      const row = remote.get(scope) ?? null;
      const decision = decideSync(
        { updatedAt: local.updatedAt, isDefault: isDefault(scope, local.data) },
        row ? { updatedAt: row.updated_at } : null,
      );
      if (decision === 'pull' && row) store.replace(row.prefs, row.updated_at, 'remote');
      if (decision === 'push') pushes.push(this.push(scope));
    }
    await Promise.all(pushes);
    for (const scope of scopes) {
      this.unsubscribers.push(
        getStore(scope).subscribe((origin) => {
          if (origin === 'local') this.schedule(scope);
        }),
      );
    }
    if (this.status.state !== 'error') this.setStatus({ state: 'synced', at: new Date().toISOString() });
  }

  stop(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.setStatus({ state: 'off' });
  }

  private schedule(scope: Scope): void {
    const existing = this.timers.get(scope);
    if (existing) clearTimeout(existing);
    this.timers.set(
      scope,
      setTimeout(() => {
        this.timers.delete(scope);
        void this.push(scope);
      }, DEBOUNCE_MS),
    );
  }

  private async push(scope: Scope): Promise<void> {
    const store = getStore(scope);
    const envelope: Envelope<Scope> = store.get();
    this.setStatus({ state: 'syncing' });
    const { data, error } = await this.supabase
      .from('user_preferences')
      .upsert(
        { user_id: this.userId, scope, schema_version: SCHEMA_VERSION, prefs: envelope.data as unknown as Json },
        { onConflict: 'user_id,scope' },
      )
      .select('updated_at')
      .single();
    if (error) {
      this.setStatus({ state: 'error', message: 'Couldn’t save to your account. Your change is kept on this device.' });
      return;
    }
    // Adopt the server's timestamp so other devices compare against the same clock,
    // unless the person changed something again while this request was in flight.
    if (store.get() === envelope) store.replace(envelope.data, data.updated_at, 'sync');
    this.setStatus({ state: 'synced', at: data.updated_at });
  }
}
