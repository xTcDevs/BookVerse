import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { authorsOf, type AccessType, type Work } from '~/data/catalogue';
import { ensureContrast } from '~/design/color';
import { formatForKind } from '~/data/formats';
import { Icon, type IconName } from './icons';

/** A typographic cover, used whenever BookVerse has no licensed cover image. */
export function Cover({ work, className }: { work: Work; className?: string }) {
  const author = authorsOf(work)[0]?.name ?? '';
  // Covers are generated from the work's palette; keep the type legible on it (WCAG AA).
  const style = {
    '--cover-bg': work.cover.bg,
    '--cover-ink': ensureContrast(work.cover.ink, [work.cover.bg], 4.5),
  } as CSSProperties;
  return (
    <div className={`cover ${className ?? ''}`} style={style} aria-hidden="true">
      <span className="cover__author">{author}</span>
      <span className="cover__title">
        {work.title}
        {work.subtitle && work.subtitle !== author ? <span className="cover__subtitle">{work.subtitle}</span> : null}
      </span>
    </div>
  );
}

export function bylineOf(work: Work): string {
  return authorsOf(work)
    .map((a) => a.name)
    .join(', ');
}

function yearOf(work: Work): string {
  if (!work.firstPublished) return '';
  const { year, approximate } = work.firstPublished;
  return `${approximate ? 'c. ' : ''}${year}`;
}

export function BookCard({ work }: { work: Work }) {
  return (
    <Link className="book-card" to={`/book/${work.slug}`}>
      <Cover work={work} />
      <span className="book-card__title">{work.title}</span>
      <span className="book-card__meta">
        {bylineOf(work)}
        {yearOf(work) ? ` · ${yearOf(work)}` : ''}
      </span>
    </Link>
  );
}

export function BookRow({ work, children }: { work: Work; children?: ReactNode }) {
  return (
    <Link className="book-row" to={`/book/${work.slug}`}>
      <Cover work={work} />
      <span className="book-row__body">
        <span className="book-row__title">{work.title}</span>
        <span className="muted small">
          {bylineOf(work)} · {formatForKind(work.kind).singular}
          {yearOf(work) ? ` · ${yearOf(work)}` : ''}
        </span>
        <span>{work.description.text}</span>
        {children}
      </span>
    </Link>
  );
}

export function BookCollection({
  works,
  layout,
  coverSize,
}: {
  works: Work[];
  layout: 'grid' | 'list';
  coverSize: string;
}) {
  if (layout === 'list') {
    return (
      <div className="book-list">
        {works.map((w) => (
          <BookRow key={w.slug} work={w} />
        ))}
      </div>
    );
  }
  return (
    <div className="book-grid" data-cover={coverSize}>
      {works.map((w) => (
        <BookCard key={w.slug} work={w} />
      ))}
    </div>
  );
}

// ── Availability ─────────────────────────────────────────────────────────────

const accessLabels: Record<AccessType, { label: string; icon: IconName; tone?: 'free' }> = {
  read_on_bookverse: { label: 'Read on BookVerse', icon: 'book', tone: 'free' },
  listen_on_bookverse: { label: 'Listen on BookVerse', icon: 'headphones', tone: 'free' },
  read_official_external: { label: 'Read free online', icon: 'book', tone: 'free' },
  listen_external: { label: 'Listen', icon: 'headphones' },
  download: { label: 'Download free', icon: 'download', tone: 'free' },
  borrow: { label: 'Borrow', icon: 'library' },
  preview: { label: 'Preview', icon: 'eye' },
  buy_digital: { label: 'Buy ebook', icon: 'bag' },
  buy_print: { label: 'Buy print', icon: 'bag' },
};

export function accessLabel(access: AccessType): string {
  return accessLabels[access].label;
}

export function AvailabilityBadge({ access }: { access: AccessType | 'info_only' }) {
  if (access === 'info_only') {
    return (
      <span className="badge badge--info">
        <Icon name="info" />
        Info only
      </span>
    );
  }
  const { label, icon, tone } = accessLabels[access];
  return (
    <span className={`badge ${tone === 'free' ? 'badge--free' : ''}`}>
      <Icon name={icon} />
      {label}
    </span>
  );
}

/** One badge per distinct way to get the work, in a stable order. */
export function availabilityOf(work: Work): AccessType[] {
  const order: AccessType[] = [
    'read_on_bookverse',
    'read_official_external',
    'download',
    'listen_on_bookverse',
    'listen_external',
    'borrow',
    'preview',
    'buy_digital',
    'buy_print',
  ];
  const present = new Set(work.editions.flatMap((e) => e.offers.map((o) => o.access)));
  return order.filter((a) => present.has(a));
}

// ── Layout helpers ───────────────────────────────────────────────────────────

export function SectionHead({
  title,
  id,
  action,
  children,
}: {
  title: string;
  id?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="section-head">
      <h2 id={id}>{title}</h2>
      {action}
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  wide,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`empty ${wide ? 'empty--wide' : ''}`}>
      <h3>{title}</h3>
      <p>{children}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
