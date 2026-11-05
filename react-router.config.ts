import type { Config } from '@react-router/dev/config';
import { prerenderPaths } from './app/data/paths';

// Milestone 1 ships as static files: every route is rendered at build time and
// served from Netlify's CDN. There is no runtime server (see the M1 plan,
// "Rendering decision"). Catalogue routes may move to server rendering in M2.
export default {
  ssr: false,
  prerender: () => prerenderPaths(),
} satisfies Config;
