import { contributors, works } from './starter-shelf';
import { formatSlugs } from './formats';
import { genres } from './genres';

export const staticPaths = [
  '/',
  '/explore',
  '/genres',
  '/authors',
  '/top',
  '/library',
  '/write',
  '/settings',
  '/settings/appearance',
  '/settings/reading',
  '/settings/account',
  '/signin',
] as const;

/** Every URL rendered to static HTML at build time (also used for sitemap.xml). */
export function prerenderPaths(): string[] {
  return [
    ...staticPaths,
    ...formatSlugs.map((s) => `/explore/${s}`),
    ...genres.map((g) => `/genres/${g.slug}`),
    ...contributors.map((c) => `/author/${c.slug}`),
    ...works.map((w) => `/book/${w.slug}`),
  ];
}

/** Paths that should not appear in search results. */
export const noindexPaths = new Set([
  '/library',
  '/settings',
  '/settings/appearance',
  '/settings/reading',
  '/settings/account',
  '/signin',
]);
