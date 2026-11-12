// NFD leaves combining marks as standalone code points; removing them is intentional.
// eslint-disable-next-line no-misleading-character-class -- each matched mark must be stripped individually.
const DIACRITICS = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
const PUNCTUATION = /\p{P}+/gu;

/** Normalise text so readers can find names even when they omit accent marks. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLocaleLowerCase()
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Match every query word, regardless of order or diacritic marks. */
export function matchesSearchQuery(text: string, query: string): boolean {
  const haystack = normalizeSearchText(text);
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}
