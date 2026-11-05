import { Link } from 'react-router';
import type { Route } from './+types/write';
import { SectionHead } from '~/components/books';
import { buildMeta } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'Write',
    description: 'The BookVerse studio for writing and publishing novels, web serials, poetry and comics.',
    path: '/write',
  });

const capabilities = [
  {
    title: 'Books and serials',
    body: 'Novels, novellas, web serials, short stories and poetry, written chapter by chapter.',
  },
  {
    title: 'Comics and webtoons',
    body: 'Image chapters for manga, manhwa, webtoons and comics, read paged or as a vertical scroll.',
  },
  {
    title: 'Drafts and scheduling',
    body: 'Autosaved drafts, a private preview, and chapters scheduled to publish on a date you choose.',
  },
  {
    title: 'Your book’s page',
    body: 'Cover, description, genres, tags, content rating and status, on the same pages as every other book.',
  },
  {
    title: 'Your author profile',
    body: 'One profile that connects everything you publish, with followers and updates.',
  },
  { title: 'Readership', body: 'Reads, completions and follows per chapter, drawn from real readers only.' },
];

export default function Write() {
  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">Write</p>
        <h1>A studio for your stories</h1>
        <p className="lede">
          Write and publish on BookVerse, beside the classics. The studio opens in Milestone 5; this page describes what
          it will do. Nothing here is a mock editor.
        </p>
      </header>
      <section className="section" aria-labelledby="studio-title">
        <SectionHead title="What the studio will do" id="studio-title" />
        <div className="genre-index">
          {capabilities.map((c) => (
            <div key={c.title} className="genre-tile">
              <strong>{c.title}</strong>
              <span>{c.body}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="ready-title">
        <SectionHead title="Get ready" id="ready-title">
          Create your account now so your name and handle are yours when the studio opens.
        </SectionHead>
        <div className="actions">
          <Link className="button button--primary" to="/settings/account">
            Set up your profile
          </Link>
        </div>
      </section>
    </main>
  );
}
