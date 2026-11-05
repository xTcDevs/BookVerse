import { Link } from 'react-router';
import type { Route } from './+types/home';
import {
  AvailabilityBadge,
  BookCollection,
  Cover,
  EmptyState,
  SectionHead,
  availabilityOf,
  bylineOf,
} from '~/components/books';
import { Icon } from '~/components/icons';
import { allWorks } from '~/data/catalogue';
import { formatList, formats } from '~/data/formats';
import { topLevelGenres } from '~/data/genres';
import { usePrefs } from '~/lib/prefs/hooks';
import { buildMeta } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'BookVerse',
    description:
      'Discover novels, manga, manhwa, webtoons, comics, poetry and audiobooks. Read free classics, find every edition, and see honestly where each book can be read, borrowed or bought.',
    path: '/',
  });

const visualFormats = [
  formats.manga,
  formats.manhwa,
  formats.manhua,
  formats.webtoons,
  formats.comics,
  formats['graphic-novels'],
];

export default function Home() {
  const works = allWorks();
  const pick = works.find((w) => w.editorsPick) ?? works[0];
  const [browse] = usePrefs('browse');
  if (!pick) return null;
  const readOnline = pick.editions.flatMap((e) => e.offers).find((o) => o.access === 'read_official_external');
  const preferred = browse.preferredFormats;
  const orderedFormats = [...formatList].sort(
    (a, b) => Number(preferred.includes(b.slug)) - Number(preferred.includes(a.slug)),
  );

  return (
    <main id="main" className="container page">
      <section className="feature" aria-labelledby="pick-title">
        <div className="feature__body">
          <p className="eyebrow">Editor’s pick · Free to read</p>
          <h1 id="pick-title">
            {pick.title}
            <span className="subtitle">by {bylineOf(pick)}</span>
          </h1>
          <p className="lede">{pick.description.text}</p>
          <div className="badge-row">
            {availabilityOf(pick).map((a) => (
              <AvailabilityBadge key={a} access={a} />
            ))}
          </div>
          <div className="actions">
            {readOnline && (
              <a className="button button--primary" href={readOnline.url} rel="noopener">
                Read free at {readOnline.provider} <Icon name="external" />
              </a>
            )}
            <Link className="button" to={`/book/${pick.slug}`}>
              Editions and details
            </Link>
          </div>
        </div>
        <Link className="feature__cover" to={`/book/${pick.slug}`} aria-label={`${pick.title} by ${bylineOf(pick)}`}>
          <Cover work={pick} />
        </Link>
      </section>

      <section className="section" aria-labelledby="formats-title">
        <SectionHead
          title="Every way to read"
          id="formats-title"
          action={
            <Link className="text-link" to="/explore">
              Explore everything <Icon name="arrowRight" />
            </Link>
          }
        />
        <div className="format-strip">
          {orderedFormats.map((f) => (
            <Link key={f.slug} to={`/explore/${f.slug}`}>
              <strong>{f.label}</strong>
              <span>{f.tagline}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="split">
        <section className="section" aria-labelledby="classics-title">
          <SectionHead
            title="Free classics, beautifully set"
            id="classics-title"
            action={
              <Link className="text-link" to="/genres/classics">
                All classics <Icon name="arrowRight" />
              </Link>
            }
          >
            Public-domain books in carefully produced editions from Standard Ebooks, free to read and download.
          </SectionHead>
          <BookCollection
            works={works.filter((w) => w !== pick).slice(0, 8)}
            layout={browse.layout}
            coverSize={browse.coverSize}
          />
        </section>

        <aside className="section ranked-empty" aria-labelledby="trending-title">
          <SectionHead title="Trending on BookVerse" id="trending-title" />
          <ol aria-hidden="true">
            {[78, 64, 56, 48, 40].map((w, i) => (
              <li key={w}>
                <span className="numeral">{i + 1}</span>
                <span className="bar" style={{ width: `${w}%` }} />
              </li>
            ))}
          </ol>
          <p className="notice">
            Rankings appear once enough people read here. They will come only from real BookVerse reading activity, and
            each list will say where its numbers come from.
          </p>
        </aside>
      </div>

      <section className="section" aria-labelledby="visual-title">
        <SectionHead title="Manga, manhwa, webtoons and comics" id="visual-title">
          Each has its own home on BookVerse. Licensed series will link to their official reading platforms; creator
          uploads and openly licensed comics will open in the BookVerse visual reader.
        </SectionHead>
        <div className="chip-group">
          {visualFormats.map((f) => (
            <Link key={f.slug} className="chip" to={`/explore/${f.slug}`}>
              {f.label}
            </Link>
          ))}
        </div>
        <EmptyState title="Series pages are on their way" wide>
          The visual catalogue, with volumes, box sets and official reading links, arrives with the database in
          Milestone 2. The visual reader settings are already in{' '}
          <Link to="/settings/reading?tab=visual">Reading settings</Link>.
        </EmptyState>
      </section>

      <section className="genre-band" aria-labelledby="genres-title">
        <h2 id="genres-title">Wander by genre</h2>
        <ul>
          {topLevelGenres()
            .slice(0, 14)
            .map((g) => (
              <li key={g.slug}>
                <Link to={`/genres/${g.slug}`}>{g.name}</Link>
              </li>
            ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="writers-title">
        <SectionHead title="New from BookVerse writers" id="writers-title" />
        <EmptyState
          title="The writing studio opens in Milestone 5"
          action={
            <Link className="button" to="/write">
              What you’ll be able to do
            </Link>
          }
        >
          Writers will publish novels, web serials, poetry and comics here, chapter by chapter. Their newest stories
          will appear in this space.
        </EmptyState>
      </section>
    </main>
  );
}
