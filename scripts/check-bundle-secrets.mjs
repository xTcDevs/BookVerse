// Fails the build if anything shipped to the browser looks like a private
// Supabase credential: a secret key (sb_secret_…) or a JWT whose role is
// service_role. Publishable keys and anon JWTs are expected and allowed.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.argv[2] || 'build/client';
const TEXT = /\.(html|js|mjs|css|json|txt|xml|webmanifest|map)$/;

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)])),
  );
  return nested.flat();
}

function jwtRole(token) {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const problems = [];
  for (const file of await listFiles(root)) {
    if (!TEXT.test(file)) continue;
    const text = await readFile(file, 'utf8');
    if (/sb_secret_[A-Za-z0-9_-]{8,}/.test(text)) problems.push(`${file}: contains a Supabase secret key`);
    for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
      if (jwtRole(match[0]) === 'service_role') problems.push(`${file}: contains a service_role JWT`);
    }
  }
  if (problems.length) {
    // File names only, never the matched values.
    console.error(`Private credentials found in ${root}:\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log(`check-bundle-secrets: no private credentials in ${root}`);
}

main().catch((error) => {
  console.error('check-bundle-secrets failed:', error.message);
  process.exit(1);
});
