# BookVerse

**One place for every kind of story.**

BookVerse is a book and comics discovery platform for readers who move between formats. Explore novels, manga, manhwa, manhua, webtoons, comics, graphic novels, web novels, light novels, audiobooks, poetry and non-fiction.

The experience combines a responsive interface, account-backed preferences and a catalogue grounded in real, openly licensed editions.

## Discover stories across formats

BookVerse is designed to bring different reading formats into one discovery experience:

- Novels and web novels
- Light novels
- Manga, manhwa and manhua
- Webtoons, comics and graphic novels
- Audiobooks
- Poetry
- Non-fiction

The catalogue and discovery experience are structured around formats and genres, helping readers explore without pretending that unavailable activity data exists.

## Product highlights

- **Broad format discovery:** Explore a range of written, illustrated and audio storytelling formats.
- **Genre and catalogue browsing:** Find editions through the site's format and genre organisation.
- **Themes and personalisation:** Choose from a design system with eight site themes and six accent options, with contrast checks.
- **Preference scopes:** A preference engine supports five independent scopes, with local preferences and account synchronisation.
- **Responsive experience:** Shared components and route layouts support different screen sizes.
- **Account and data services:** Supabase provides authentication, Postgres and storage.
- **Pre-rendered delivery:** The application is pre-rendered for deployment as a static site, without requiring an application server.

## Technology

| Area | Technology |
|---|---|
| UI | React 19 |
| Routing | React Router 7 |
| Language | TypeScript |
| Backend services | Supabase Auth, Postgres and Storage |
| Hosting | Netlify |
| Unit tests | Vitest |
| Browser tests | Playwright |
| Accessibility checks | axe |
| Build output | Pre-rendered static site |

## Run locally

### Requirements

- Node.js 22 (the repository includes an `.nvmrc`)
- npm
- Supabase project values for backend-connected functionality

### Install and start

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Add the required public Supabase values to `.env.local` before testing account-backed functionality.

The development server runs at:

```text
http://localhost:5173
```

## Environment variables

Only public configuration belongs in browser-exposed environment variables. The application uses the `VITE_` prefix for these values.

| Variable | Purpose | Browser-safe |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | Yes |
| `VITE_SITE_URL` | Public site URL | Yes |

**Never put a Supabase secret key or service-role key in browser code or a `VITE_` variable.** Server-only secrets belong in the appropriate server-side environment. The build includes checks intended to reject secret-looking `VITE_` values, and CI scans build output and Git history.

## Supabase project configuration

When setting up a new Supabase project, review the following dashboard settings:

1. **Integrations → Data API:** Enable the Data API and expose the `public` schema.
2. **Authentication → URL Configuration:** Set the Site URL and redirect URLs to match the deployment and local development environments.
3. **Email authentication:** The built-in Supabase mailer has sending limits and is intended for limited testing. Public sign-up may require custom SMTP configuration.

The current deployment and redirect configuration is documented in the repository's setup and project configuration. Update those values when deploying to a different site; do not assume the example production domain applies to every environment.

## Useful commands

| Command | Description |
|---|---|
| `nvm use` | Select the Node version specified by the project |
| `npm ci` | Install locked dependencies |
| `npm run dev` | Start the local development server |
| `npm run build` | Build and pre-render the site, including CSP and sitemap output |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright browser tests against the build |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run ESLint |
| `npm run check:secrets` | Check for private Supabase credentials in browser files |
| `npm run db:start` | Start the local Supabase environment (Docker) |
| `npm run db:test` | Run database security tests |

## Project structure

```text
app/
  design/      colour maths and theme tokens
  lib/prefs/   preference engine and local/account synchronisation
  data/        formats, genres and openly licensed starter shelf
  routes/      application pages
  components/  shared interface components

supabase/
  migrations/  schema, row-level security and storage policies
  tests/       pgTAP security tests
  functions/   server-side account deletion

e2e/           Playwright browser tests
scripts/       post-build tasks, secret scan and static server
```

## Catalogue integrity

BookVerse aims to be transparent about the information it presents:

- The starter catalogue uses real, openly licensed editions.
- Text and descriptions are sourced from openly licensed collections such as Standard Ebooks (CC0) and Project Gutenberg.
- The interface does not invent ratings, reviews or popularity figures.
- Where real activity data is not available, the product communicates that limitation rather than presenting made-up metrics.

## Security and account data

Database access is governed by Supabase Row Level Security and storage policies. Account deletion is handled by a server-side Edge Function so the Supabase secret key is not exposed to the browser. Use the database tests and secret checks when changing data access or account flows.

## Deployment

BookVerse is designed for static deployment on Netlify. The build pre-renders routes into `build/client` and includes content security policy and sitemap generation.

When deploying:
- Configure the public environment variables in the hosting dashboard.
- Confirm the Supabase authentication Site URL and redirect allowlist.
- Keep secret keys in server-side configuration only.
- Run the build, type checks, tests and secret checks before publishing.

---

A home for stories, whatever form they take.
