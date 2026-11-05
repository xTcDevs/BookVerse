import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { PreferenceSync, type SyncStatus } from './prefs/sync';
import { getSupabase } from './supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type AuthState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: User; profile: Profile | null };

interface AuthContextValue {
  state: AuthState;
  sync: SyncStatus;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [sync, setSync] = useState<SyncStatus>({ state: 'off' });

  const loadProfile = useCallback(async (user: User) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setState({ status: 'signed-in', user, profile: error ? null : data });
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setState({ status: 'unavailable' });
      return;
    }
    let syncer: PreferenceSync | null = null;
    let currentUserId: string | null = null;

    const handleUser = (user: User | null) => {
      if (user?.id === currentUserId) return;
      currentUserId = user?.id ?? null;
      syncer?.stop();
      syncer = null;
      if (!user) {
        setState({ status: 'signed-out' });
        return;
      }
      setState({ status: 'signed-in', user, profile: null });
      void loadProfile(user);
      syncer = new PreferenceSync(supabase, user.id);
      syncer.onStatus(setSync);
      void syncer.start();
    };

    supabase.auth.getSession().then(
      ({ data }) => handleUser(data.session?.user ?? null),
      () => setState({ status: 'signed-out' }),
    );
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => handleUser(session?.user ?? null));
    return () => {
      listener.subscription.unsubscribe();
      syncer?.stop();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (state.status === 'signed-in') await loadProfile(state.user);
  }, [state, loadProfile]);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({ state, sync, refreshProfile, signOut }), [state, sync, refreshProfile, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
