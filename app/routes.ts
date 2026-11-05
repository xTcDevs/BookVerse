import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('routes/shell.tsx', [
    index('routes/home.tsx'),
    route('explore', 'routes/explore.tsx'),
    route('explore/:format', 'routes/explore-format.tsx'),
    route('genres', 'routes/genres.tsx'),
    route('genres/:slug', 'routes/genre.tsx'),
    route('authors', 'routes/authors.tsx'),
    route('author/:slug', 'routes/author.tsx'),
    route('book/:slug', 'routes/book.tsx'),
    route('top', 'routes/top.tsx'),
    route('library', 'routes/library.tsx'),
    route('write', 'routes/write.tsx'),
    route('signin', 'routes/signin.tsx'),
    route('settings', 'routes/settings.tsx', [
      index('routes/settings-index.tsx'),
      route('appearance', 'routes/settings-appearance.tsx'),
      route('reading', 'routes/settings-reading.tsx'),
      route('account', 'routes/settings-account.tsx'),
    ]),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig;
