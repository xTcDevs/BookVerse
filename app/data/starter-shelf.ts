import type { Contributor, Edition, Source, Work } from './catalogue';

// ─────────────────────────────────────────────────────────────────────────────
// Milestone 1 starter shelf: 14 real public-domain works.
//
// Every title, author, translator, description, word count, edition note and
// link below was checked on 5 November 2026 against the book's page on
// standardebooks.org (descriptions are Standard Ebooks' own CC0 text, quoted
// verbatim). Project Gutenberg links are the transcription sources each
// Standard Ebooks page lists. Life dates are standard reference dates and get
// re-checked against Wikidata when the catalogue moves to the database in M2.
//
// There are no ratings, reviews, read counts or popularity figures here, by
// design. This file is replaced by the Supabase catalogue in Milestone 2.
// ─────────────────────────────────────────────────────────────────────────────

export const sources: Source[] = [
  {
    slug: 'standard-ebooks',
    name: 'Standard Ebooks',
    homepage: 'https://standardebooks.org',
    termsUrl: 'https://standardebooks.org/about',
    attribution: 'Edition and description by Standard Ebooks, dedicated to the public domain (CC0).',
  },
  {
    slug: 'project-gutenberg',
    name: 'Project Gutenberg',
    homepage: 'https://www.gutenberg.org',
    termsUrl: 'https://www.gutenberg.org/policy/license',
    attribution: 'Transcription by Project Gutenberg volunteers.',
  },
];

export const contributors: Contributor[] = [
  { slug: 'mary-shelley', name: 'Mary Shelley', born: 1797, died: 1851 },
  { slug: 'jane-austen', name: 'Jane Austen', born: 1775, died: 1817 },
  { slug: 'herman-melville', name: 'Herman Melville', born: 1819, died: 1891 },
  { slug: 'bram-stoker', name: 'Bram Stoker', born: 1847, died: 1912 },
  { slug: 'charlotte-bronte', name: 'Charlotte Brontë', born: 1816, died: 1855 },
  { slug: 'charles-dickens', name: 'Charles Dickens', born: 1812, died: 1870 },
  { slug: 'arthur-conan-doyle', name: 'Arthur Conan Doyle', born: 1859, died: 1930 },
  { slug: 'h-g-wells', name: 'H. G. Wells', born: 1866, died: 1946 },
  { slug: 'olaudah-equiano', name: 'Olaudah Equiano', born: 1745, died: 1797, approximate: true },
  { slug: 'marcus-aurelius', name: 'Marcus Aurelius', born: 121, died: 180 },
  { slug: 'george-long', name: 'George Long', born: 1800, died: 1879 },
  { slug: 'fyodor-dostoevsky', name: 'Fyodor Dostoevsky', born: 1821, died: 1881 },
  { slug: 'constance-garnett', name: 'Constance Garnett', born: 1861, died: 1946 },
  { slug: 'oscar-wilde', name: 'Oscar Wilde', born: 1854, died: 1900 },
  { slug: 'william-shakespeare', name: 'William Shakespeare', born: 1564, died: 1616 },
  { slug: 'frances-ellen-watkins-harper', name: 'Frances Ellen Watkins Harper', born: 1825, died: 1911 },
];

const SE = 'https://standardebooks.org/ebooks';

function standardEbooksEdition(
  path: string,
  wordCount: number,
  extra: Partial<Pick<Edition, 'basedOn' | 'contributors'>> = {},
): Edition {
  return {
    id: `se-${path.replaceAll('/', '-')}`,
    format: 'ebook_epub',
    label: 'Standard Ebooks edition',
    language: 'en',
    publisher: 'Standard Ebooks',
    contributors: extra.contributors ?? [],
    wordCount,
    basedOn: extra.basedOn,
    sourceSlug: 'standard-ebooks',
    sourceUrl: `${SE}/${path}`,
    offers: [
      {
        access: 'read_official_external',
        license: 'cc0',
        provider: 'Standard Ebooks',
        url: `${SE}/${path}/text`,
        isOfficial: true,
      },
      {
        access: 'download',
        license: 'cc0',
        provider: 'Standard Ebooks',
        url: `${SE}/${path}`,
        isOfficial: true,
      },
    ],
  };
}

function gutenbergEdition(ebookNumber: number, extra: Partial<Pick<Edition, 'contributors'>> = {}): Edition {
  const url = `https://www.gutenberg.org/ebooks/${ebookNumber}`;
  return {
    id: `pg-${ebookNumber}`,
    format: 'ebook_epub',
    label: `Project Gutenberg eBook #${ebookNumber}`,
    language: 'en',
    publisher: 'Project Gutenberg',
    contributors: extra.contributors ?? [],
    sourceSlug: 'project-gutenberg',
    sourceUrl: url,
    offers: [{ access: 'download', license: 'public_domain', provider: 'Project Gutenberg', url, isOfficial: true }],
  };
}

function description(path: string, text: string): Work['description'] {
  return { text, license: 'cc0', sourceSlug: 'standard-ebooks', sourceUrl: `${SE}/${path}` };
}

export const works: Work[] = [
  {
    slug: 'frankenstein',
    title: 'Frankenstein',
    kind: 'novel',
    originalLanguage: 'en',
    firstPublished: { year: 1818 },
    description: description('mary-shelley/frankenstein', 'A tragic scientist creates a monster in his laboratory.'),
    genres: ['classics', 'gothic', 'horror', 'science-fiction'],
    contributors: [{ slug: 'mary-shelley', role: 'author' }],
    editions: [
      standardEbooksEdition('mary-shelley/frankenstein', 77898, { basedOn: "Shelley's revised 1831 edition" }),
      gutenbergEdition(42324),
    ],
    cover: { bg: '#2E4A3F', ink: '#F3E9D6' },
    editorsPick: true,
  },
  {
    slug: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    kind: 'novel',
    originalLanguage: 'en',
    firstPublished: { year: 1813 },
    description: description(
      'jane-austen/pride-and-prejudice',
      'A Regency-era novel of manners in which five women try to adjust to their new neighbor, an eligible gentleman.',
    ),
    genres: ['classics', 'romance', 'historical-romance'],
    contributors: [{ slug: 'jane-austen', role: 'author' }],
    editions: [standardEbooksEdition('jane-austen/pride-and-prejudice', 121970), gutenbergEdition(42671)],
    cover: { bg: '#7A2E2A', ink: '#F6E7D8' },
  },
  {
    slug: 'moby-dick',
    title: 'Moby Dick',
    kind: 'novel',
    originalLanguage: 'en',
    firstPublished: { year: 1851 },
    description: description(
      'herman-melville/moby-dick',
      'Captain Ahab, having lost his leg to the white whale Moby Dick, travels the world on a quest for vengeance.',
    ),
    genres: ['classics', 'adventure'],
    contributors: [{ slug: 'herman-melville', role: 'author' }],
    editions: [standardEbooksEdition('herman-melville/moby-dick', 211202), gutenbergEdition(2701)],
    cover: { bg: '#1F3A5A', ink: '#E6EEF5' },
  },
  {
    slug: 'dracula',
    title: 'Dracula',
    kind: 'novel',
    originalLanguage: 'en',
    firstPublished: { year: 1897 },
    description: description('bram-stoker/dracula', 'An ancient undead monster terrorizes Victorian London.'),
    genres: ['classics', 'horror', 'gothic'],
    contributors: [{ slug: 'bram-stoker', role: 'author' }],
    editions: [standardEbooksEdition('bram-stoker/dracula', 161105), gutenbergEdition(345)],
    cover: { bg: '#2B1B1F', ink: '#E9D6CF' },
  },
  {
    slug: 'jane-eyre',
    title: 'Jane Eyre',
    kind: 'novel',
    originalLanguage: 'en',
    firstPublished: { year: 1847 },
    description: description(
      'charlotte-bronte/jane-eyre',
      'A woman is hired by the mysterious master of Thornfield Hall as a governess for his young ward.',
    ),
    genres: ['classics', 'gothic', 'romance', 'literary-fiction'],
    contributors: [{ slug: 'charlotte-bronte', role: 'author' }],
    editions: [standardEbooksEdition('charlotte-bronte/jane-eyre', 186958), gutenbergEdition(1260)],
    cover: { bg: '#5B4A2E', ink: '#F4EBDA' },
  },
  {
    slug: 'a-tale-of-two-cities',
    title: 'A Tale of Two Cities',
    kind: 'novel',
    originalLanguage: 'en',
    firstPublished: { year: 1859 },
    description: description(
      'charles-dickens/a-tale-of-two-cities',
      'A family is reunited, added to, and then threatened to be torn apart by events arising from the French Revolution.',
    ),
    genres: ['classics', 'historical-fiction'],
    contributors: [{ slug: 'charles-dickens', role: 'author' }],
    editions: [standardEbooksEdition('charles-dickens/a-tale-of-two-cities', 136359), gutenbergEdition(98)],
    cover: { bg: '#6B2D3E', ink: '#F5E3E6' },
  },
  {
    slug: 'the-adventures-of-sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    kind: 'short_stories',
    originalLanguage: 'en',
    firstPublished: { year: 1892 },
    description: description(
      'arthur-conan-doyle/the-adventures-of-sherlock-holmes',
      'The world’s first consulting detective investigates a variety of intriguing cases in the first Holmes short story collection.',
    ),
    genres: ['classics', 'mystery'],
    contributors: [{ slug: 'arthur-conan-doyle', role: 'author' }],
    editions: [
      standardEbooksEdition('arthur-conan-doyle/the-adventures-of-sherlock-holmes', 104582),
      gutenbergEdition(1661),
    ],
    cover: { bg: '#735621', ink: '#FBF3E2' },
  },
  {
    slug: 'the-time-machine',
    title: 'The Time Machine',
    kind: 'novella',
    originalLanguage: 'en',
    firstPublished: { year: 1895 },
    description: description('h-g-wells/the-time-machine', 'A mysterious inventor travels to a land far off in time.'),
    genres: ['classics', 'science-fiction', 'time-travel'],
    contributors: [{ slug: 'h-g-wells', role: 'author' }],
    editions: [standardEbooksEdition('h-g-wells/the-time-machine', 32429), gutenbergEdition(35)],
    cover: { bg: '#24484D', ink: '#E2F0EF' },
  },
  {
    slug: 'the-interesting-narrative-of-the-life-of-olaudah-equiano',
    title: 'The Interesting Narrative of the Life of Olaudah Equiano',
    kind: 'memoir',
    originalLanguage: 'en',
    firstPublished: { year: 1789 },
    description: description(
      'olaudah-equiano/the-interesting-narrative-of-the-life-of-olaudah-equiano',
      'An autobiography of an ex-slave in the mid 1700s.',
    ),
    genres: ['biography-memoir', 'history'],
    contributors: [{ slug: 'olaudah-equiano', role: 'author' }],
    editions: [
      standardEbooksEdition('olaudah-equiano/the-interesting-narrative-of-the-life-of-olaudah-equiano', 80271),
      gutenbergEdition(15399),
    ],
    cover: { bg: '#3D3A1F', ink: '#F2EED6' },
  },
  {
    slug: 'meditations',
    title: 'Meditations',
    kind: 'nonfiction',
    originalLanguage: 'grc',
    firstPublished: { year: 180, approximate: true },
    description: description(
      'marcus-aurelius/meditations/george-long',
      'The personal diary of the Roman Emperor, in which he lays out his thoughts and philosophical musings on the Stoic philosophy and way of life.',
    ),
    genres: ['philosophy', 'classics'],
    contributors: [{ slug: 'marcus-aurelius', role: 'author' }],
    editions: [
      standardEbooksEdition('marcus-aurelius/meditations/george-long', 45608, {
        contributors: [{ slug: 'george-long', role: 'translator' }],
      }),
    ],
    cover: { bg: '#4A4E57', ink: '#EEF0F3' },
  },
  {
    slug: 'crime-and-punishment',
    title: 'Crime and Punishment',
    kind: 'novel',
    originalLanguage: 'ru',
    firstPublished: { year: 1866 },
    description: description(
      'fyodor-dostoevsky/crime-and-punishment/constance-garnett',
      'Inflated by his own ambition, an ex-student murders a pawnbroker, then faces the inevitable consequences.',
    ),
    genres: ['classics', 'literary-fiction', 'crime', 'psychological-thriller'],
    contributors: [{ slug: 'fyodor-dostoevsky', role: 'author' }],
    editions: [
      standardEbooksEdition('fyodor-dostoevsky/crime-and-punishment/constance-garnett', 204007, {
        contributors: [{ slug: 'constance-garnett', role: 'translator' }],
      }),
      gutenbergEdition(2554, { contributors: [{ slug: 'constance-garnett', role: 'translator' }] }),
    ],
    cover: { bg: '#3A2B4A', ink: '#ECE4F4' },
  },
  {
    slug: 'the-picture-of-dorian-gray',
    title: 'The Picture of Dorian Gray',
    kind: 'novel',
    originalLanguage: 'en',
    firstPublished: { year: 1890 },
    description: description(
      'oscar-wilde/the-picture-of-dorian-gray',
      'A Victorian dandy turns to a life of debauchery after a magical portrait stops him from aging.',
    ),
    genres: ['classics', 'gothic', 'literary-fiction'],
    contributors: [{ slug: 'oscar-wilde', role: 'author' }],
    editions: [standardEbooksEdition('oscar-wilde/the-picture-of-dorian-gray', 79057), gutenbergEdition(174)],
    cover: { bg: '#5A3A55', ink: '#F5E8F2' },
  },
  {
    slug: 'hamlet',
    title: 'Hamlet',
    kind: 'drama',
    originalLanguage: 'en',
    firstPublished: { year: 1603 },
    description: description(
      'william-shakespeare/hamlet',
      'The ghost of the King of Denmark tells his son, Hamlet, to avenge his death.',
    ),
    genres: ['classics', 'drama'],
    contributors: [{ slug: 'william-shakespeare', role: 'author' }],
    editions: [standardEbooksEdition('william-shakespeare/hamlet', 31891)],
    cover: { bg: '#1E2A3A', ink: '#E7ECF3' },
  },
  {
    slug: 'poetry-frances-ellen-watkins-harper',
    title: 'Poetry',
    subtitle: 'Frances Ellen Watkins Harper',
    kind: 'poetry',
    originalLanguage: 'en',
    firstPublished: null,
    description: description(
      'frances-ellen-watkins-harper/poetry',
      'A collection of poems by Frances Ellen Watkins Harper.',
    ),
    genres: ['classics'],
    contributors: [{ slug: 'frances-ellen-watkins-harper', role: 'author' }],
    editions: [standardEbooksEdition('frances-ellen-watkins-harper/poetry', 40650)],
    cover: { bg: '#6E4B1F', ink: '#FAF0DE' },
  },
];
