import { Link } from 'react-router';
import type { Route } from './+types/author';
import { BookCollection, SectionHead } from '~/components/books';
import { formatLifespan, getContributor, worksByContributor } from '~/data/catalogue';
import { usePrefs } from '~/lib/prefs/hooks';
import { buildMeta } from '~/lib/seo';
import NotFound from './not-found';

export const meta: Route.MetaFunction = ({ params }) => {
  const person = getContributor(params.slug ?? '');
  if (!person)
    return buildMeta({
      title: 'Not found',
      description: 'This author isn’t on our shelves.',
      path: `/author/${params.slug}`,
      noindex: true,
    });
  return buildMeta({
    title: person.name,
    description: `Books by and translated by ${person.name} (${formatLifespan(person)}) on BookVerse.`,
    path: `/author/${person.slug}`,
    type: 'profile',
  });
};

export default function Author({ params }: Route.ComponentProps) {
  const person = getContributor(params.slug);
  const [browse] = usePrefs('browse');
  if (!person) return <NotFound />;
  const works = worksByContributor(person.slug);
  const wrote = works.filter((w) => w.contributors.some((c) => c.slug === person.slug && c.role === 'author'));
  const translated = works.filter((w) => !wrote.includes(w));

  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">
          <Link to="/authors">Authors</Link>
        </p>
        <h1>{person.name}</h1>
        <p className="lede">{formatLifespan(person)}</p>
        <p className="muted small">Biographies and links to other sources join author pages in Milestone 2.</p>
      </header>
      {wrote.length > 0 && (
        <section className="section" aria-labelledby="wrote-title">
          <SectionHead title={`Books by ${person.name}`} id="wrote-title" />
          <BookCollection works={wrote} layout={browse.layout} coverSize={browse.coverSize} />
        </section>
      )}
      {translated.length > 0 && (
        <section className="section" aria-labelledby="translated-title">
          <SectionHead title={`Translated by ${person.name}`} id="translated-title" />
          <BookCollection works={translated} layout={browse.layout} coverSize={browse.coverSize} />
        </section>
      )}
    </main>
  );
}
