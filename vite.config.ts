import { reactRouter } from '@react-router/dev/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

// Only variables prefixed VITE_ reach the browser bundle. Refuse to build if a
// private credential has been given a public name by mistake.
function guardPublicEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  for (const [name, value] of Object.entries(env)) {
    const suspiciousName = /SECRET|SERVICE|PRIVATE|PASSWORD|TOKEN/i.test(name);
    const suspiciousValue =
      value.startsWith('sb_secret_') || /"role"\s*:\s*"service_role"/.test(decodeJwtPayload(value));
    if (suspiciousName || suspiciousValue) {
      throw new Error(`Refusing to expose ${name} to the browser: it looks like a private credential.`);
    }
  }
}

function decodeJwtPayload(value: string): string {
  const parts = value.split('.');
  const payload = parts[1];
  if (parts.length !== 3 || !payload) return '';
  try {
    return Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

export default defineConfig(({ mode }) => {
  // On Netlify, default the canonical site address to the deploy's own URL.
  if (!process.env.VITE_SITE_URL && process.env.URL) process.env.VITE_SITE_URL = process.env.URL;
  guardPublicEnv(mode);
  return {
    plugins: [reactRouter()],
    resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
    build: { target: 'es2022' },
  };
});
