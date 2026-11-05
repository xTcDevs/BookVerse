import { SITE_NAME, siteUrl } from './env';

interface MetaInput {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  type?: 'website' | 'book' | 'profile';
}

type MetaDescriptor = Record<string, string>;

/** Title, description, canonical URL, Open Graph and Twitter tags for a route. */
export function buildMeta({ title, description, path, noindex, type = 'website' }: MetaInput): MetaDescriptor[] {
  const fullTitle = title === SITE_NAME ? `${SITE_NAME} — Every book, honestly labelled` : `${title} · ${SITE_NAME}`;
  const url = `${siteUrl()}${path}`;
  const image = `${siteUrl()}/og-image.png`;
  const tags: MetaDescriptor[] = [
    { title: fullTitle },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:type', content: type },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: image },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ];
  if (noindex) tags.push({ name: 'robots', content: 'noindex' });
  return tags;
}

const languageNames: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  grc: 'Ancient Greek',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  yo: 'Yoruba',
  ig: 'Igbo',
  ha: 'Hausa',
};

export function languageName(code: string): string {
  return languageNames[code] ?? code;
}
