import type { FormatSlug, WorkKind } from './formats';
import { formatForKind } from './formats';
import { contributors, sources, works } from './starter-shelf';

// Types mirror the Milestone 2 tables (works, editions, offers, contributors,
// sources) so that swapping this starter data for the database changes only the
// functions at the bottom of this file.

export type ContributorRole = 'author' | 'artist' | 'illustrator' | 'translator' | 'narrator' | 'editor';
export type EditionFormat =
  | 'hardcover'
  | 'paperback'
  | 'collector'
  | 'box_set'
  | 'manga_volume'
  | 'ebook_epub'
  | 'ebook_kindle'
  | 'ebook_pdf'
  | 'web_text'
  | 'image_chapters'
  | 'audiobook';
export type AccessType =
  | 'read_on_bookverse'
  | 'listen_on_bookverse'
  | 'read_official_external'
  | 'listen_external'
  | 'download'
  | 'borrow'
  | 'preview'
  | 'buy_digital'
  | 'buy_print';
export type License =
  'public_domain' | 'cc0' | 'cc_by' | 'cc_by_nc' | 'bookverse_original' | 'publisher_licensed' | 'all_rights_reserved';

export interface Source {
  slug: string;
  name: string;
  homepage: string;
  termsUrl: string;
  attribution: string;
}

export interface Contributor {
  slug: string;
  name: string;
  /** Negative years are BCE. Null when unknown. */
  born: number | null;
  died: number | null;
  approximate?: boolean;
}

export interface Offer {
  access: AccessType;
  license: License;
  provider: string;
  url: string;
  isOfficial: boolean;
}

export interface Edition {
  id: string;
  format: EditionFormat;
  label: string;
  language: string;
  publisher: string;
  contributors: { slug: string; role: ContributorRole }[];
  wordCount?: number;
  basedOn?: string;
  sourceSlug: string;
  sourceUrl: string;
  offers: Offer[];
}

export interface Work {
  slug: string;
  title: string;
  subtitle?: string;
  kind: WorkKind;
  originalLanguage: string;
  firstPublished: { year: number; approximate?: boolean } | null;
  description: { text: string; license: License; sourceSlug: string; sourceUrl: string };
  genres: string[];
  contributors: { slug: string; role: ContributorRole }[];
  editions: Edition[];
  /** Colours for the generated typographic cover (no cover image is stored). */
  cover: { bg: string; ink: string };
  editorsPick?: boolean;
}

// ── Accessors ────────────────────────────────────────────────────────────────

export function allWorks(): Work[] {
  return works;
}

export function getWork(slug: string): Work | undefined {
  return works.find((w) => w.slug === slug);
}

export function getContributor(slug: string): Contributor | undefined {
  return contributors.find((c) => c.slug === slug);
}

export function getSource(slug: string): Source | undefined {
  return sources.find((s) => s.slug === slug);
}

export function allAuthors(): Contributor[] {
  const slugs = new Set(works.flatMap((w) => w.contributors.filter((c) => c.role === 'author').map((c) => c.slug)));
  return contributors.filter((c) => slugs.has(c.slug)).sort((a, b) => a.name.localeCompare(b.name));
}

export function worksByContributor(slug: string): Work[] {
  return works.filter(
    (w) =>
      w.contributors.some((c) => c.slug === slug) ||
      w.editions.some((e) => e.contributors.some((c) => c.slug === slug)),
  );
}

export function worksInFormat(format: FormatSlug): Work[] {
  return works.filter((w) => formatForKind(w.kind).slug === format);
}

export function worksInGenre(slug: string, childSlugs: string[] = []): Work[] {
  const wanted = new Set([slug, ...childSlugs]);
  return works.filter((w) => w.genres.some((g) => wanted.has(g)));
}

export function authorsOf(work: Work): Contributor[] {
  return work.contributors
    .filter((c) => c.role === 'author')
    .map((c) => getContributor(c.slug))
    .filter((c): c is Contributor => Boolean(c));
}

export function formatLifespan(c: Contributor): string {
  const year = (y: number) => (y < 0 ? `${-y} BCE` : `${y}`);
  if (c.born === null && c.died === null) return '';
  const prefix = c.approximate ? 'c. ' : '';
  return `${c.born === null ? '?' : prefix + year(c.born)}–${c.died === null ? '' : year(c.died)}`;
}
