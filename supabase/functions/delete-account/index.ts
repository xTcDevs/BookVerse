// Deletes the signed-in person's account: their avatar files, then the auth
// user (profile, roles and preferences cascade from auth.users).
// The secret key is provided to the function by Supabase at runtime and never
// leaves the server.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const ALLOWED_ORIGINS = [
  // the production site and its branch/preview deploys
  /^https:\/\/([a-z0-9-]+--)?bookverse[a-z0-9-]*\.netlify\.app$/,
  /^http:\/\/localhost:(5173|4173)$/,
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((re) => re.test(origin)) ? origin : 'https://bookverse-1.netlify.app';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  try {
    return await handle(req, origin);
  } catch (error) {
    // Any unexpected failure (environment, network, SDK) returns a clean 500;
    // the account is only deleted as the very last step, so nothing is half-done.
    console.error('delete-account: unexpected error', error instanceof Error ? error.message : String(error));
    return json({ error: 'delete_failed' }, 500, origin);
  }
});

// The request body is never read: the caller is identified only by their JWT.
async function handle(req: Request, origin: string | null): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  const url = Deno.env.get('SUPABASE_URL');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !secret) {
    console.error('delete-account: missing server configuration');
    return json({ error: 'server_misconfigured' }, 500, origin);
  }

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'not_signed_in' }, 401, origin);

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'not_signed_in' }, 401, origin);
  const userId = userData.user.id;

  // Avatar files first: storage objects don't cascade from auth.users.
  const { data: files, error: listError } = await admin.storage.from('avatars').list(userId, { limit: 100 });
  if (listError) {
    console.error('delete-account: could not list avatar files', listError.message);
    return json({ error: 'delete_failed' }, 500, origin);
  }
  if (files.length) {
    const { error: removeError } = await admin.storage.from('avatars').remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) {
      console.error('delete-account: could not remove avatar files', removeError.message);
      return json({ error: 'delete_failed' }, 500, origin);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('delete-account: could not delete user', deleteError.message);
    return json({ error: 'delete_failed' }, 500, origin);
  }
  return json({ deleted: true }, 200, origin);
}
