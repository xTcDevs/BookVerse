import { Link } from 'react-router';
import type { Route } from './+types/library';
import { EmptyState, SectionHead } from '~/components/books';
import { useAuth } from '~/lib/auth';
import { buildMeta } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'My Library',
    description: 'Your shelves, reading progress and lists.',
    path: '/library',
    noindex: true,
  });

const shelves = [
  { name: 'Want to read', note: 'Books you’ve saved for later.' },
  { name: 'Reading', note: 'Pick up exactly where you stopped, on any device.' },
  { name: 'Read', note: 'Everything you’ve finished, with dates.' },
  { name: 'Did not finish', note: 'No guilt. Just a record.' },
];

export default function Library() {
  const { state } = useAuth();
  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">My Library</p>
        <h1>{state.status === 'signed-in' ? 'Your library' : 'A library that follows you'}</h1>
        <p className="lede">
          Shelves, reading progress, bookmarks and your own lists, synced to your account. Shelves arrive with the
          catalogue in Milestone 2; progress and bookmarks with the reader in Milestone 3.
        </p>
        {state.status === 'signed-out' && (
          <div className="actions">
            <Link className="button button--primary" to="/signin">
              Sign in
            </Link>
          </div>
        )}
      </header>
      <section className="section" aria-labelledby="shelves-title">
        <SectionHead title="Shelves" id="shelves-title" />
        <div className="genre-index">
          {shelves.map((s) => (
            <div key={s.name} className="genre-tile">
              <strong>{s.name}</strong>
              <span>{s.note}</span>
            </div>
          ))}
        </div>
        <EmptyState
          title="Nothing shelved yet"
          wide
          action={
            <Link className="button" to="/explore">
              Find something to read
            </Link>
          }
        >
          Saving books becomes possible in Milestone 2. Your appearance and reading settings already sync to your
          account today.
        </EmptyState>
      </section>
    </main>
  );
}
