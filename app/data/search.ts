const DIACRITICS = /[\u0300-\u036f]/g;

/** Normalise text so readers can find names even when they omit accent marks. */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(DIACRITICS, '').toLocaleLowerCase();
}

/** Match every query word, regardless of order or diacritic marks. */
export function matchesSearchQuery(text: string, query: string): boolean {
  const haystack = normalizeSearchText(text);
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}
