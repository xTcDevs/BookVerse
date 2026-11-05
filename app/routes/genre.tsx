import { Link } from 'react-router';
import type { Route } from './+types/genre';
import { BookCollection, EmptyState, SectionHead } from '~/components/books';
import { worksInGenre } from '~/data/catalogue';
import { getGenre, subgenres } from '~/data/genres';
import { usePrefs } from '~/lib/prefs/hooks';
import { buildMeta } from '~/lib/seo';
import NotFound from './not-found';

export const meta: Route.MetaFunction = ({ params }) => {
  const genre = getGenre(params.slug ?? '');
  if (!genre)
    return buildMeta({
      title: 'Not found',
      description: 'This genre isn’t on our shelves.',
      path: `/genres/${params.slug}`,
      noindex: true,
    });
  return buildMeta({
    title: genre.name,
    description: `${genre.description} ${genre.name} books on BookVerse.`,
    path: `/genres/${genre.slug}`,
  });
};

export default function GenrePage({ params }: Route.ComponentProps) {
  const genre = getGenre(params.slug);
  const [browse] = usePrefs('browse');
  if (!genre) return <NotFound />;
  const children = subgenres(genre.slug);
  const parent = genre.parent ? getGenre(genre.parent) : undefined;
  const works = worksInGenre(
    genre.slug,
    children.map((c) => c.slug),
  );

  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">
          <Link to="/genres">Genres</Link>
          {parent && (
            <>
              {' · '}
              <Link to={`/genres/${parent.slug}`}>{parent.name}</Link>
            </>
          )}
        </p>
        <h1>{genre.name}</h1>
        <p className="lede">{genre.description}</p>
        {children.length > 0 && (
          <div className="chip-group">
            {children.map((c) => (
              <Link key={c.slug} className="chip" to={`/genres/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </header>
      <section className="section" aria-labelledby="genre-books">
        <SectionHead title="On the starter shelf" id="genre-books" />
        {works.length > 0 ? (
          <BookCollection works={works} layout={browse.layout} coverSize={browse.coverSize} />
        ) : (
          <EmptyState title={`No ${genre.name.toLowerCase()} books yet`} wide>
            The starter shelf is small on purpose. {genre.name} across novels, manga, comics and audiobooks fills in
            when the catalogue arrives in Milestone 2.
          </EmptyState>
        )}
      </section>
    </main>
  );
}
