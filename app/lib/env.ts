import { z } from 'zod';

// The only configuration the browser ever receives. Both Supabase values are
// public by design (protected by row-level security). Private credentials have
// no place here, and vite.config.ts refuses to build if one appears.

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url().startsWith('https://').or(z.string().url().startsWith('http://127.0.0.1')),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  VITE_SITE_URL: z.string().url().optional(),
});

export type PublicConfig =
  | { status: 'ready'; supabaseUrl: string; supabaseKey: string; siteUrl: string | undefined }
  | { status: 'missing'; missing: string[] };

let cached: PublicConfig | null = null;

export function publicConfig(): PublicConfig {
  if (cached) return cached;
  const result = schema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SITE_URL: import.meta.env.VITE_SITE_URL || undefined,
  });
  cached = result.success
    ? {
        status: 'ready',
        supabaseUrl: result.data.VITE_SUPABASE_URL,
        supabaseKey: result.data.VITE_SUPABASE_PUBLISHABLE_KEY,
        siteUrl: result.data.VITE_SITE_URL,
      }
    : // Names only, never values.
      { status: 'missing', missing: result.error.issues.map((i) => String(i.path[0])) };
  return cached;
}

export const SITE_NAME = 'BookVerse';

export function siteUrl(): string {
  const config = publicConfig();
  return (
    (config.status === 'ready' && config.siteUrl) || import.meta.env.VITE_SITE_URL || 'https://bookverse.netlify.app'
  );
}
