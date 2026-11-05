# BookVerse

Discover, read and follow stories in every format: novels, manga, manhwa, manhua, webtoons, comics, graphic novels, web and light novels, audiobooks, poetry and non-fiction.

**Stack:** React 19 · React Router 7 (pre-rendered, no server) · TypeScript · Supabase (auth, Postgres, storage) · Netlify.

## Run it

```bash
nvm use            # Node 22
npm ci
cp .env.example .env.local   # fill in the two public Supabase values
npm run dev                  # http://localhost:5173
```

| Command                        | What it does                                                   |
| ------------------------------ | -------------------------------------------------------------- |
| `npm run build`                | Pre-renders every page to `build/client`, adds CSP, sitemap    |
| `npm run preview`              | Serves the build like Netlify on http://localhost:4173         |
| `npm test`                     | Unit tests (Vitest)                                            |
| `npm run test:e2e`             | Browser tests on the build: routes, layout, themes, axe a11y   |
| `npm run typecheck` / `lint`   | TypeScript and ESLint                                          |
| `npm run check:secrets`        | Fails if a private Supabase credential is in the browser files |
| `npm run db:start` / `db:test` | Local Supabase (Docker) and the pgTAP security tests           |

## Environment variables

Only **public** values go to the browser, and only with the `VITE_` prefix:

| Name                            | Where                              | Safe in the browser?     |
| ------------------------------- | ---------------------------------- | ------------------------ |
| `VITE_SUPABASE_URL`             | Netlify, GitHub vars, `.env.local` | Yes                      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Netlify, GitHub vars, `.env.local` | Yes (`sb_publishable_…`) |
| `VITE_SITE_URL`                 | Netlify                            | Yes                      |

The Supabase **secret key** (`sb_secret_…` / `service_role`) is never used by the site. Only Supabase Edge Functions use it, and Supabase injects it at runtime. The build refuses to run if a `VITE_` variable looks like a secret, and CI scans the output and the git history.

## Layout

```
app/
  design/      colour maths and theme tokens (8 site themes × 6 accents, contrast-checked)
  lib/prefs/   preference engine: 5 independent scopes, local + account sync
  data/        formats, genres and the openly licensed starter shelf
  routes/      pages
  components/  shared UI
supabase/
  migrations/  schema, row-level security, storage policies
  tests/       pgTAP security tests
  functions/   delete-account (runs server-side with the secret key)
e2e/           Playwright tests
scripts/       post-build, secret scan, static server
```

## Data honesty

The catalogue contains only real, openly licensed editions (Standard Ebooks CC0 text and descriptions, Project Gutenberg links). There are no invented ratings, reviews or popularity numbers. Lists that need real activity data say so until that data exists.
