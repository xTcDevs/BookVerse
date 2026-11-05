import { Link } from 'react-router';
import type { Route } from './+types/top';
import { SectionHead } from '~/components/books';
import { buildMeta } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'Top Books',
    description: 'Rankings built only from real BookVerse reading activity, with every source labelled.',
    path: '/top',
  });

const lists = [
  {
    title: 'Trending this week',
    source: 'BookVerse readers',
    basis: 'Books started and finished on BookVerse in the last 7 days.',
  },
  { title: 'Most read', source: 'BookVerse readers', basis: 'Books finished on BookVerse, all time.' },
  {
    title: 'Highest rated',
    source: 'BookVerse readers',
    basis: 'Average rating, shown only once a book has enough ratings to be meaningful.',
  },
  { title: 'Popular manga and webtoons', source: 'BookVerse readers', basis: 'Series followed and read on BookVerse.' },
  { title: 'Rising web novels', source: 'BookVerse readers', basis: 'Serials gaining readers chapter by chapter.' },
  {
    title: 'Most-followed authors',
    source: 'BookVerse readers',
    basis: 'Authors with the most followers on BookVerse.',
  },
];

export default function Top() {
  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">Top Books</p>
        <h1>Rankings you can trust</h1>
        <p className="lede">
          Every list here will be built from real reading on BookVerse, and will say so. Where a ranking comes from
          somewhere else (a prize list or an editor’s selection), it will be labelled with that source. No number on
          BookVerse is ever invented.
        </p>
      </header>
      <section className="section" aria-labelledby="lists-title">
        <SectionHead title="The lists" id="lists-title">
          They start filling once readers arrive: reading activity is recorded from Milestone 3, ratings from Milestone
          5.
        </SectionHead>
        <div className="genre-index">
          {lists.map((l) => (
            <div key={l.title} className="genre-tile">
              <strong>{l.title}</strong>
              <span>{l.basis}</span>
              <span className="badge badge--info" style={{ alignSelf: 'flex-start' }}>
                Source: {l.source} · not enough data yet
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="meanwhile-title">
        <SectionHead title="Meanwhile" id="meanwhile-title" />
        <div className="actions">
          <Link className="button button--primary" to="/genres/classics">
            Browse the classics
          </Link>
          <Link className="button" to="/explore">
            Search the catalogue
          </Link>
        </div>
      </section>
    </main>
  );
}
