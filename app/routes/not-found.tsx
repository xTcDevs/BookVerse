import { Link } from 'react-router';
import type { Route } from './+types/not-found';
import { buildMeta } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  buildMeta({ title: 'Page not found', description: 'This page isn’t on our shelves.', path: '/404', noindex: true });

export default function NotFound() {
  return (
    <main id="main" className="error-page">
      <p className="eyebrow">404</p>
      <h1>This page isn’t on our shelves.</h1>
      <p className="lede">The link may be old, or the page may have moved.</p>
      <div className="actions">
        <Link className="button button--primary" to="/">
          Back to BookVerse
        </Link>
        <Link className="button" to="/explore">
          Search the catalogue
        </Link>
      </div>
    </main>
  );
}
