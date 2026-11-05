import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { publicConfig } from './env';

export type BookverseClient = SupabaseClient<Database>;

let client: BookverseClient | null | undefined;

/**
 * The browser's Supabase client, built only from the publishable key.
 * Returns null during pre-rendering and when the deployment has no Supabase
 * configuration, so every caller must handle "accounts unavailable".
 */
export function getSupabase(): BookverseClient | null {
  if (client !== undefined) return client;
  if (typeof window === 'undefined') return null;
  const config = publicConfig();
  client =
    config.status === 'ready'
      ? createClient<Database>(config.supabaseUrl, config.supabaseKey, {
          // Implicit flow: an emailed sign-in link works in whichever browser or
          // device opens it (PKCE links only work in the browser that asked).
          // Fine for a fully client-side site; supabase-js clears the tokens
          // from the URL as soon as it reads them.
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
        })
      : null;
  return client;
}

export const AVATAR_BUCKET = 'avatars';

export function avatarUrl(path: string | null, version?: string): string | null {
  const supabase = getSupabase();
  if (!supabase || !path) return null;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return version ? `${data.publicUrl}?v=${encodeURIComponent(version)}` : data.publicUrl;
}
