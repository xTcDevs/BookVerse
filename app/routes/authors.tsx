import { Link } from 'react-router';
import type { Route } from './+types/authors';
import { SectionHead } from '~/components/books';
import { allAuthors, formatLifespan, worksByContributor } from '~/data/catalogue';
import { contributors } from '~/data/starter-shelf';
import { buildMeta } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'Authors',
    description: 'The writers and translators behind the books on BookVerse.',
    path: '/authors',
  });

export default function Authors() {
  const authors = allAuthors();
  const authorSlugs = new Set(authors.map((a) => a.slug));
  const translators = contributors.filter((c) => !authorSlugs.has(c.slug));
  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">Authors</p>
        <h1>The people behind the books</h1>
        <p className="lede">
          Every writer and translator on the starter shelf. Author profiles grow with the catalogue in Milestone 2, and
          BookVerse writers get their own pages when the studio opens.
        </p>
      </header>
      <section className="section" aria-labelledby="authors-title">
        <SectionHead title="Writers" id="authors-title" />
        <ul className="author-list">
          {authors.map((a) => (
            <li key={a.slug}>
              <Link to={`/author/${a.slug}`}>
                <strong>{a.name}</strong>
                <span>
                  {formatLifespan(a)} · {worksByContributor(a.slug).length}{' '}
                  {worksByContributor(a.slug).length === 1 ? 'book' : 'books'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="section" aria-labelledby="translators-title">
        <SectionHead title="Translators" id="translators-title" />
        <ul className="author-list">
          {translators.map((t) => (
            <li key={t.slug}>
              <Link to={`/author/${t.slug}`}>
                <strong>{t.name}</strong>
                <span>{formatLifespan(t)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
