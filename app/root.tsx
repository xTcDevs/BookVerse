import { useEffect, type ReactNode } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, Link } from 'react-router';
import type { Route } from './+types/root';
import { buildThemeCss, themes } from './design/tokens';
import { AuthProvider } from './lib/auth';
import { HYDRATED_EVENT } from './lib/host-injections';
import { themeBootstrapScript } from './lib/prefs/bootstrap';
import { PreferencesRuntime } from './lib/prefs/provider';
import fontsHref from './styles/fonts.css?url';
import appHref from './styles/app.css?url';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: fontsHref },
  { rel: 'stylesheet', href: appHref },
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'manifest', href: '/site.webmanifest' },
  { rel: 'apple-touch-icon', href: '/icon-192.png' },
];

const themeCss = buildThemeCss();
const bootstrapScript = themeBootstrapScript();

export function Layout({ children }: { children: ReactNode }) {
  return (
    // The inline script sets data-theme and friends before first paint, so these
    // attributes legitimately differ from the pre-rendered defaults.
    <html
      lang="en"
      data-theme="paper"
      data-accent="terracotta"
      data-density="comfortable"
      data-motion="full"
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={themes.paper.bg} />
        <script dangerouslySetInnerHTML={{ __html: bootstrapScript }} />
        <style id="bv-themes" dangerouslySetInnerHTML={{ __html: themeCss }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // Runs once React has hydrated: entry.client puts host-added nodes back then.
  useEffect(() => {
    window.dispatchEvent(new Event(HYDRATED_EVENT));
  }, []);

  return (
    <PreferencesRuntime>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </PreferencesRuntime>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="error-page" id="main">
      <p className="eyebrow">{notFound ? '404' : 'Something went wrong'}</p>
      <h1>{notFound ? 'This page isn’t on our shelves.' : 'BookVerse hit an unexpected error.'}</h1>
      <p className="lede">
        {notFound
          ? 'The link may be old, or the page may have moved.'
          : 'Your settings are safe. Try reloading the page; if it keeps happening, let us know.'}
      </p>
      <p>
        <Link className="button button--primary" to="/">
          Back to BookVerse
        </Link>
      </p>
    </main>
  );
}
