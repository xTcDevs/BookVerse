import { describe, expect, it } from 'vitest';
import {
  allAuthors,
  allWorks,
  authorsOf,
  getContributor,
  getSource,
  getWork,
  worksByContributor,
  worksInGenre,
} from './catalogue';
import { formatForKind, formatList, formatSlugs } from './formats';
import { genreFamilySlugs, getGenre } from './genres';
import { prerenderPaths } from './paths';

// The starter shelf is real, openly licensed data. These checks keep it honest.
describe('starter shelf', () => {
  const works = allWorks();

  it('has unique slugs', () => {
    expect(new Set(works.map((w) => w.slug)).size).toBe(works.length);
  });

  it('every work links to real contributors, genres and sources', () => {
    for (const work of works) {
      expect(authorsOf(work).length, work.slug).toBeGreaterThan(0);
      for (const c of work.contributors) expect(getContributor(c.slug), `${work.slug} → ${c.slug}`).toBeDefined();
      for (const g of work.genres) expect(getGenre(g), `${work.slug} → ${g}`).toBeDefined();
      for (const edition of work.editions) {
        expect(getSource(edition.sourceSlug), `${work.slug} → ${edition.sourceSlug}`).toBeDefined();
        for (const offer of edition.offers) expect(offer.url, `${work.slug} offer`).toMatch(/^https:\/\//);
      }
      expect(() => formatForKind(work.kind)).not.toThrow();
    }
  });

  it('hosts or links only openly licensed editions', () => {
    for (const work of works) {
      for (const edition of work.editions) {
        for (const offer of edition.offers) expect(['public_domain', 'cc0']).toContain(offer.license);
      }
    }
  });

  it('contains no invented ratings or popularity numbers', () => {
    const text = JSON.stringify(works);
    expect(text).not.toMatch(/"(rating|ratings|averageRating|reviewCount|popularity|readers|views)"\s*:/i);
  });

  it('every author has at least one work', () => {
    for (const author of allAuthors())
      expect(works.some((w) => w.contributors.some((c) => c.slug === author.slug))).toBe(true);
  });
});

describe('lookups with missing or empty input', () => {
  it('returns undefined for unknown or empty slugs', () => {
    expect(getWork('')).toBeUndefined();
    expect(getWork('no-such-book')).toBeUndefined();
    expect(getContributor('')).toBeUndefined();
    expect(getSource('nowhere')).toBeUndefined();
    expect(getGenre('')).toBeUndefined();
  });

  it('returns empty lists rather than throwing', () => {
    expect(worksByContributor('nobody')).toEqual([]);
    expect(worksInGenre('no-such-genre')).toEqual([]);
    expect(worksInGenre('no-such-genre', [])).toEqual([]);
  });
});

describe('genre filters', () => {
  it('includes direct subgenres when a parent genre is selected', () => {
    expect(genreFamilySlugs('mystery')).toEqual(['mystery', 'crime']);
    expect(genreFamilySlugs('fantasy')).toEqual(['fantasy', 'epic-fantasy', 'urban-fantasy', 'isekai']);
    expect(genreFamilySlugs('unknown')).toEqual(['unknown']);
  });
});

describe('formats', () => {
  it('covers every format with a page', () => {
    expect(formatList.map((f) => f.slug)).toEqual([...formatSlugs]);
    const paths = prerenderPaths();
    for (const slug of formatSlugs) expect(paths).toContain(`/explore/${slug}`);
  });

  it('keeps visual formats as first-class categories', () => {
    for (const slug of ['manga', 'manhwa', 'manhua', 'webtoons', 'comics', 'graphic-novels'] as const) {
      expect(formatSlugs).toContain(slug);
    }
  });
});
