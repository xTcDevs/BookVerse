import { useMemo, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/explore';
import { BookCollection, EmptyState, SectionHead, bylineOf } from '~/components/books';
import { allWorks, type Work } from '~/data/catalogue';
import { formatForKind, formatList, type FormatSlug } from '~/data/formats';
import { genreFamilySlugs, genres, getGenre } from '~/data/genres';
import { matchesSearchQuery } from '~/data/search';
import { usePrefs } from '~/lib/prefs/hooks';
import { buildMeta } from '~/lib/seo';
import { useHydrated } from '~/lib/use-hydrated';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'Explore',
    description: 'Search and browse BookVerse by format, genre and how you can read each book.',
    path: '/explore',
  });

function matches(work: Work, query: string): boolean {
  if (!query) return true;
  const haystack = [
    work.title,
    work.subtitle ?? '',
    bylineOf(work),
    ...work.genres.map((g) => getGenre(g)?.name ?? g),
    formatForKind(work.kind).label,
  ].join(' ');
  return matchesSearchQuery(haystack, query);
}

function isFree(work: Work): boolean {
  return work.editions.some((e) => e.offers.some((o) => o.license === 'public_domain' || o.license === 'cc0'));
}

export default function Explore() {
  const hydrated = useHydrated();
  const [params, setParams] = useSearchParams();
  const [browse] = usePrefs('browse');
  // Filters live in the URL so results can be shared and the back button works.
  const q = hydrated ? (params.get('q') ?? '') : '';
  const format = hydrated ? (params.get('format') as FormatSlug | null) : null;
  const genre = hydrated ? params.get('genre') : null;
  const freeOnly = hydrated && params.get('access') === 'free';

  const results = useMemo(
    () => {
      const selectedGenres = genre ? new Set(genreFamilySlugs(genre)) : null;
      return allWorks().filter(
        (w) =>
          matches(w, q) &&
          (!format || formatForKind(w.kind).slug === format) &&
          (!selectedGenres || w.genres.some((slug) => selectedGenres.has(slug))) &&
          (!freeOnly || isFree(w)),
      );
    },
    [q, format, genre, freeOnly],
  );

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get('q');
    setParam('q', typeof value === 'string' && value.trim() ? value.trim() : null);
  };

  const filtering = Boolean(q || format || genre || freeOnly);
  const usedGenres = genres.filter((g) => allWorks().some((w) => w.genres.includes(g.slug)));

  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">Explore</p>
        <h1>Find your next book</h1>
        <p className="lede">
          Search by title, author or genre, or browse by format. In this first release the catalogue is a starter shelf
          of {allWorks().length} public-domain books; the full catalogue arrives in Milestone 2.
        </p>
      </header>

      <section className="filters" aria-label="Search and filters">
        <form className="search-large" role="search" onSubmit={onSubmit} key={q}>
          <label className="visually-hidden" htmlFor="explore-q">
            Search the catalogue
          </label>
          <input
            className="input"
            id="explore-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Try “gothic”, “Austen” or “science fiction”"
          />
          <button className="button button--primary" type="submit">
            Search
          </button>
        </form>
        <div className="chip-group" role="group" aria-label="Format">
          <button type="button" className="chip" aria-pressed={!format} onClick={() => setParam('format', null)}>
            All formats
          </button>
          {formatList.map((f) => (
            <button
              key={f.slug}
              type="button"
              className="chip"
              aria-pressed={format === f.slug}
              onClick={() => setParam('format', format === f.slug ? null : f.slug)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="chip-group" role="group" aria-label="Genre and availability">
          <button
            type="button"
            className="chip"
            aria-pressed={freeOnly}
            onClick={() => setParam('access', freeOnly ? null : 'free')}
          >
            Free to read
          </button>
          {usedGenres.map((g) => (
            <button
              key={g.slug}
              type="button"
              className="chip"
              aria-pressed={genre === g.slug}
              onClick={() => setParam('genre', genre === g.slug ? null : g.slug)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="results-title">
        <SectionHead
          title={filtering ? 'Results' : 'The starter shelf'}
          id="results-title"
          action={
            <span className="result-count" role="status" aria-atomic="true">
              {results.length} {results.length === 1 ? 'book' : 'books'}
            </span>
          }
        />
        {results.length > 0 ? (
          <BookCollection works={results} layout={browse.layout} coverSize={browse.coverSize} />
        ) : (
          <EmptyState
            title="Nothing on the starter shelf matches yet"
            action={
              <button
                type="button"
                className="button"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                Clear search and filters
              </button>
            }
          >
            {format && formatList.find((f) => f.slug === format)?.reader === 'visual'
              ? 'Manga, manhwa, webtoons and comics join the catalogue in Milestone 2.'
              : 'The full catalogue arrives in Milestone 2. Try a broader search for now.'}
          </EmptyState>
        )}
      </section>

      <section className="section" aria-labelledby="formats-title">
        <SectionHead title="Browse by format" id="formats-title" />
        <div className="format-strip">
          {formatList.map((f) => (
            <Link key={f.slug} to={`/explore/${f.slug}`}>
              <strong>{f.label}</strong>
              <span>{f.tagline}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
