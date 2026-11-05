// Runs after `react-router build`:
//  1. 404.html for unknown URLs (Netlify serves it with a 404 status),
//  2. sitemap.xml and robots.txt from the pre-rendered pages,
//  3. a Content-Security-Policy <meta> per page, allowing only that page's own
//     inline scripts by hash (no 'unsafe-inline' for scripts).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const OUT = 'build/client';

// Vite reads .env files itself; this script reads the same public VITE_ values
// (CI and Netlify pass them as real environment variables instead).
for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (!existsSync(file)) continue;
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    console.warn(`postbuild: could not read ${file} (${error.code ?? error.message}); skipping it`);
    continue;
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(VITE_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const SITE_URL = (process.env.VITE_SITE_URL || process.env.URL || 'https://bookverse.netlify.app').replace(/\/$/, '');

function supabaseOrigin() {
  const raw = process.env.VITE_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    throw new Error('VITE_SUPABASE_URL is not a valid URL.');
  }
}

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : [],
    ),
  );
  return files.flat();
}

function inlineScriptHashes(html) {
  const hashes = [];
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    const body = match[1] ?? '';
    if (!body.trim()) continue;
    hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return [...new Set(hashes)];
}

function cspFor(html, supabase) {
  const connect = ["'self'", ...(supabase ? [supabase, supabase.replace(/^https:/, 'wss:')] : [])];
  const images = ["'self'", 'data:', 'blob:', ...(supabase ? [supabase] : [])];
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes(html).join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    `img-src ${images.join(' ')}`,
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

function urlPathFor(file) {
  const rel = relative(OUT, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`;
}

async function main() {
  await copyFile(join(OUT, '__spa-fallback.html'), join(OUT, '404.html'));

  const supabase = supabaseOrigin();
  const files = await htmlFiles(OUT);
  const sitemapPaths = [];

  for (const file of files) {
    let html = await readFile(file, 'utf8');
    if (html.includes('http-equiv="Content-Security-Policy"')) continue;
    const meta = `<meta http-equiv="Content-Security-Policy" content="${cspFor(html, supabase)}">`;
    html = html.replace(/<head>/i, `<head>${meta}`);
    await writeFile(file, html);

    const path = urlPathFor(file);
    const isPage = file.endsWith(`${sep}index.html`) || file === join(OUT, 'index.html');
    if (isPage && !html.includes('name="robots" content="noindex"')) sitemapPaths.push(path);
  }

  sitemapPaths.sort();
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapPaths.map((p) => `  <url><loc>${SITE_URL}${p === '/' ? '/' : p}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  await writeFile(join(OUT, 'sitemap.xml'), sitemap);
  await writeFile(
    join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /settings\nDisallow: /library\nDisallow: /signin\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  );

  console.log(
    `postbuild: CSP added to ${files.length} pages, ${sitemapPaths.length} URLs in sitemap.xml${supabase ? '' : ' (no Supabase URL configured)'}`,
  );
}

main().catch((error) => {
  console.error('postbuild failed:', error.message);
  process.exit(1);
});
