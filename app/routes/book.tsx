import { Fragment } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/book';
import {
  AvailabilityBadge,
  BookCard,
  Cover,
  SectionHead,
  accessLabel,
  availabilityOf,
  bylineOf,
} from '~/components/books';
import { Icon } from '~/components/icons';
import {
  allWorks,
  authorsOf,
  formatLifespan,
  getContributor,
  getSource,
  getWork,
  worksByContributor,
  type Contributor,
  type Edition,
  type Work,
} from '~/data/catalogue';
import { formatForKind } from '~/data/formats';
import { getGenre } from '~/data/genres';
import { buildMeta, languageName } from '~/lib/seo';
import NotFound from './not-found';

export const meta: Route.MetaFunction = ({ params }) => {
  const work = getWork(params.slug ?? '');
  if (!work)
    return buildMeta({
      title: 'Not found',
      description: 'This book isn’t on our shelves.',
      path: `/book/${params.slug}`,
      noindex: true,
    });
  return buildMeta({
    title: `${work.title} by ${bylineOf(work)}`,
    description: `${work.description.text} Read free, download, or find every edition on BookVerse.`,
    path: `/book/${work.slug}`,
    type: 'book',
  });
};

const licenseNote: Record<string, string> = {
  cc0: 'Public domain (CC0 edition)',
  public_domain: 'Public domain in the US',
  cc_by: 'Creative Commons BY',
  cc_by_nc: 'Creative Commons BY-NC',
  bookverse_original: 'BookVerse original',
  publisher_licensed: 'Licensed by the publisher',
  all_rights_reserved: 'All rights reserved',
};

function editionDetail(edition: Edition): string {
  const parts: string[] = [];
  const translators = edition.contributors
    .filter((c) => c.role === 'translator')
    .map((c) => getContributor(c.slug)?.name);
  if (translators.length) parts.push(`Translated by ${translators.join(', ')}`);
  if (edition.basedOn) parts.push(`Based on ${edition.basedOn}`);
  if (edition.wordCount) parts.push(`${edition.wordCount.toLocaleString('en-US')} words`);
  return parts.join(' · ');
}

function related(work: Work): Work[] {
  const genreSet = new Set(work.genres.filter((g) => g !== 'classics'));
  return allWorks()
    .filter((w) => w.slug !== work.slug)
    .map((w) => ({ w, score: w.genres.filter((g) => genreSet.has(g)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.w);
}

export default function Book({ params }: Route.ComponentProps) {
  const work = getWork(params.slug);
  if (!work) return <NotFound />;
  const format = formatForKind(work.kind);
  const authors = authorsOf(work);
  const translators = [
    ...new Set(work.editions.flatMap((e) => e.contributors.filter((c) => c.role === 'translator').map((c) => c.slug))),
  ]
    .map((slug) => getContributor(slug))
    .filter((c): c is Contributor => Boolean(c));
  const primaryRead = work.editions.flatMap((e) => e.offers).find((o) => o.access === 'read_official_external');
  const descriptionSource = getSource(work.description.sourceSlug);
  const moreByAuthor = authors[0] ? worksByContributor(authors[0].slug).filter((w) => w.slug !== work.slug) : [];
  const similar = related(work);

  return (
    <main id="main" className="container page">
      <article className="book-hero">
        <div className="book-hero__cover">
          <Cover work={work} />
          <span className="credit">Generated cover. BookVerse shows publisher artwork only where it is licensed.</span>
        </div>
        <div className="book-hero__body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p className="eyebrow">
              <Link to={`/explore/${format.slug}`}>{format.singular}</Link>
              {work.genres
                .filter((g) => g !== 'classics')
                .slice(0, 3)
                .map((g) => (
                  <Fragment key={g}>
                    {' · '}
                    <Link to={`/genres/${g}`}>{getGenre(g)?.name ?? g}</Link>
                  </Fragment>
                ))}
            </p>
            <h1>{work.title}</h1>
            {work.subtitle && <p className="subtitle">{work.subtitle}</p>}
            <p>
              by{' '}
              {authors.map((a, i) => (
                <Fragment key={a.slug}>
                  {i > 0 ? ', ' : ''}
                  <Link to={`/author/${a.slug}`} style={{ fontWeight: 600 }}>
                    {a.name}
                  </Link>
                </Fragment>
              ))}
              {translators.length > 0 && (
                <>
                  {' · translated by '}
                  {translators.map((t, i) => (
                    <Fragment key={t.slug}>
                      {i > 0 ? ', ' : ''}
                      <Link to={`/author/${t.slug}`}>{t.name}</Link>
                    </Fragment>
                  ))}
                </>
              )}
              {work.firstPublished &&
                ` · first published ${work.firstPublished.approximate ? 'c. ' : ''}${work.firstPublished.year}`}
            </p>
          </div>

          <div className="badge-row">
            {availabilityOf(work).map((a) => (
              <AvailabilityBadge key={a} access={a} />
            ))}
          </div>

          <div className="actions">
            {primaryRead && (
              <a className="button button--primary" href={primaryRead.url} rel="noopener">
                Read free at {primaryRead.provider} <Icon name="external" />
              </a>
            )}
            <a className="button" href="#ways">
              Every edition
            </a>
          </div>

          <div className="prose-block">
            <p className="lede" style={{ color: 'var(--bv-text)' }}>
              {work.description.text}
            </p>
            <p className="credit">
              Description from{' '}
              <a href={work.description.sourceUrl} rel="noopener">
                {descriptionSource?.name ?? 'source'}
              </a>
              , public domain (CC0).
            </p>
          </div>

          <section className="ways" id="ways" aria-labelledby="ways-title">
            <h2 id="ways-title">Ways to get it</h2>
            {work.editions.flatMap((edition) =>
              edition.offers.map((offer) => (
                <div className="ways__row" key={`${edition.id}-${offer.access}`}>
                  <span className="ways__access">{accessLabel(offer.access)}</span>
                  <span className="ways__edition">
                    <strong>{edition.label}</strong>
                    <span className="muted small">
                      {[editionDetail(edition), licenseNote[offer.license]].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <a className="button button--small" href={offer.url} rel="noopener">
                    {offer.access === 'download' ? 'Get the ebook' : 'Open'} <Icon name="external" />
                  </a>
                </div>
              )),
            )}
            <div className="ways__row">
              <span className="ways__access">Read on BookVerse</span>
              <span className="ways__edition">
                <strong>BookVerse reader</strong>
                <span className="muted small">Arrives in Milestone 3, using your reading settings.</span>
              </span>
              <Link className="button button--small" to="/settings/reading">
                Set it up
              </Link>
            </div>
            <p className="ways__foot">
              Each row is a real edition with a link to its source. Public-domain status is checked for the United
              States; it can differ in other countries. Print editions, libraries and audiobooks join in later
              milestones.
            </p>
          </section>

          <section className="section" aria-labelledby="readers-title">
            <SectionHead title="BookVerse readers" id="readers-title">
              No ratings or reviews yet. Ratings will only ever come from people reading on BookVerse; reviews open in
              Milestone 5.
            </SectionHead>
          </section>

          <dl className="facts">
            <div>
              <dt>First published</dt>
              <dd>
                {work.firstPublished
                  ? `${work.firstPublished.approximate ? 'c. ' : ''}${work.firstPublished.year}`
                  : 'Various dates'}
              </dd>
            </div>
            <div>
              <dt>Original language</dt>
              <dd>{languageName(work.originalLanguage)}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>
                <Link to={`/explore/${format.slug}`}>{format.singular}</Link>
              </dd>
            </div>
            <div>
              <dt>Editions listed</dt>
              <dd>{work.editions.length}</dd>
            </div>
          </dl>
        </div>
      </article>

      {authors[0] && (
        <section className="section" aria-labelledby="author-title">
          <SectionHead
            title={`About ${authors[0].name}`}
            id="author-title"
            action={
              <Link className="text-link" to={`/author/${authors[0].slug}`}>
                Author page <Icon name="arrowRight" />
              </Link>
            }
          >
            {formatLifespan(authors[0])}
            {moreByAuthor.length ? ` · ${moreByAuthor.length} more on BookVerse` : ''}
          </SectionHead>
          {moreByAuthor.length > 0 && (
            <div className="book-grid">
              {moreByAuthor.map((w) => (
                <BookCard key={w.slug} work={w} />
              ))}
            </div>
          )}
        </section>
      )}

      {similar.length > 0 && (
        <section className="section" aria-labelledby="similar-title">
          <SectionHead title={`If ${work.title} stayed with you`} id="similar-title">
            Chosen by shared genres, not by popularity.
          </SectionHead>
          <div className="book-grid">
            {similar.map((w) => (
              <BookCard key={w.slug} work={w} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
