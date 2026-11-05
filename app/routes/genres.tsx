import { Link } from 'react-router';
import type { Route } from './+types/genres';
import { SectionHead } from '~/components/books';
import { subgenres, topLevelGenres, type Genre } from '~/data/genres';
import { buildMeta } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'Genres',
    description: 'Browse BookVerse by genre, from fantasy and romance to philosophy and history.',
    path: '/genres',
  });

function GenreTiles({ list }: { list: Genre[] }) {
  return (
    <div className="genre-index">
      {list.map((g) => (
        <Link key={g.slug} className="genre-tile" to={`/genres/${g.slug}`}>
          <strong>{g.name}</strong>
          <span>{g.description}</span>
          {subgenres(g.slug).length > 0 && (
            <ul>
              {subgenres(g.slug).map((s) => (
                <li key={s.slug}>{s.name}</li>
              ))}
            </ul>
          )}
        </Link>
      ))}
    </div>
  );
}

export default function Genres() {
  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">Genres</p>
        <h1>What are you in the mood for?</h1>
        <p className="lede">
          Genres cut across every format, so a fantasy page holds novels, manga and audiobooks together. Formats have
          their own pages under Explore.
        </p>
      </header>
      <section className="section" aria-labelledby="fiction-title">
        <SectionHead title="Fiction" id="fiction-title" />
        <GenreTiles list={topLevelGenres('fiction')} />
      </section>
      <section className="section" aria-labelledby="nonfiction-title">
        <SectionHead title="Non-fiction" id="nonfiction-title" />
        <GenreTiles list={topLevelGenres('non-fiction')} />
      </section>
    </main>
  );
}
