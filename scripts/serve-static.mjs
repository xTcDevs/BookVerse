// Serves build/client the way Netlify does: /path → /path/index.html,
// unknown paths → 404.html with a 404 status. Used for local preview and E2E tests.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'build/client');
const port = Number(process.argv[3] || 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.data': 'text/x-script',
};

async function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0] ?? '/')).replace(/^(\.\.[/\\])+/, '');
  const candidates = [join(root, clean), join(root, clean, 'index.html'), join(root, `${clean}.html`)];
  for (const candidate of candidates) {
    if (!candidate.startsWith(root)) continue;
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

createServer(async (req, res) => {
  try {
    const file = await resolveFile(req.url || '/');
    const target = file ?? join(root, '404.html');
    const body = await readFile(target);
    res.writeHead(file ? 200 : 404, { 'content-type': types[extname(target)] || 'application/octet-stream' });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(`Server error: ${error.message}`);
  }
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));
