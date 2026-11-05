import { Link } from 'react-router';
import type { Route } from './+types/explore-format';
import { BookCollection, EmptyState, SectionHead } from '~/components/books';
import { worksInFormat } from '~/data/catalogue';
import { formatList, formats, formatSlugs, type FormatSlug } from '~/data/formats';
import { usePrefs } from '~/lib/prefs/hooks';
import { buildMeta } from '~/lib/seo';
import NotFound from './not-found';

function findFormat(slug: string | undefined) {
  return formatSlugs.includes(slug as FormatSlug) ? formats[slug as FormatSlug] : undefined;
}

export const meta: Route.MetaFunction = ({ params }) => {
  const format = findFormat(params.format);
  if (!format)
    return buildMeta({
      title: 'Not found',
      description: 'This page isn’t on our shelves.',
      path: `/explore/${params.format}`,
      noindex: true,
    });
  return buildMeta({
    title: format.label,
    description: `${format.tagline} ${format.description}`,
    path: `/explore/${format.slug}`,
  });
};

const readerLabels = {
  text: 'BookVerse text reader',
  visual: 'BookVerse visual reader',
  audio: 'BookVerse audio player',
} as const;
const readerTabs = { text: 'text', visual: 'visual', audio: 'audio' } as const;

export default function ExploreFormat({ params }: Route.ComponentProps) {
  const format = findFormat(params.format);
  const [browse] = usePrefs('browse');
  if (!format) return <NotFound />;
  const works = worksInFormat(format.slug);
  const siblings = formatList.filter((f) => f.reader === format.reader && f.slug !== format.slug);

  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">
          <Link to="/explore">Explore</Link> · Format
        </p>
        <h1>{format.label}</h1>
        <p className="lede">{format.description}</p>
      </header>

      <section className="section" aria-labelledby="shelf-title">
        <SectionHead
          title={works.length ? `${format.label} on the starter shelf` : `${format.label} on BookVerse`}
          id="shelf-title"
        />
        {works.length > 0 ? (
          <BookCollection works={works} layout={browse.layout} coverSize={browse.coverSize} />
        ) : (
          <EmptyState title={`${format.label} arrive in ${format.catalogueMilestone}`} wide>
            {format.readingNote}
          </EmptyState>
        )}
      </section>

      <section className="section" aria-labelledby="reading-title">
        <SectionHead title="How reading works" id="reading-title" />
        <div className="prose-block">
          <p>{format.readingNote}</p>
          <p>
            {format.label} use the {readerLabels[format.reader]}. You can set it up now in{' '}
            <Link to={`/settings/reading?tab=${readerTabs[format.reader]}`}>Reading settings</Link>; your choices apply
            as soon as the reader arrives.
          </p>
        </div>
      </section>

      {siblings.length > 0 && (
        <section className="section" aria-labelledby="related-formats">
          <SectionHead title="Related formats" id="related-formats" />
          <div className="chip-group">
            {siblings.map((f) => (
              <Link key={f.slug} className="chip" to={`/explore/${f.slug}`}>
                {f.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
