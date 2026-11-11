import { describe, expect, it } from 'vitest';
import { matchesSearchQuery } from './search';

describe('catalogue search text', () => {
  it('matches names when readers omit diacritic marks', () => {
    expect(matchesSearchQuery('Charlotte Brontë', 'charlotte bronte')).toBe(true);
    expect(matchesSearchQuery('Émile Zola', 'emile zola')).toBe(true);
  });

  it('matches names with extended combining diacritics', () => {
    for (const mark of ['\u1ab0', '\u1dc0', '\u20d0', '\ufe20']) {
      expect(matchesSearchQuery(`A${mark}usten`, 'austen')).toBe(true);
    }
  });

  it('treats punctuation as a separator in names and titles', () => {
    expect(matchesSearchQuery('Jane Austen', 'Austen, Jane')).toBe(true);
    expect(matchesSearchQuery('The Time Traveller', 'time-traveller')).toBe(true);
  });

  it('keeps case-insensitive, order-independent matching for every query word', () => {
    expect(matchesSearchQuery('Pride and Prejudice — Jane Austen', 'AUSTEN pride')).toBe(true);
    expect(matchesSearchQuery('Pride and Prejudice', 'pride mystery')).toBe(false);
  });

  it('treats a blank query as a match for every item', () => {
    expect(matchesSearchQuery('Anything at all', '   ')).toBe(true);
  });
});
