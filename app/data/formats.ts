// Formats are first-class in BookVerse: each has its own Explore page and maps to
// one or more `work_kind` values in the database (see 003_catalogue_library.sql).

export const formatSlugs = [
  'novels',
  'manga',
  'manhwa',
  'manhua',
  'webtoons',
  'comics',
  'graphic-novels',
  'web-novels',
  'light-novels',
  'audiobooks',
  'poetry',
  'non-fiction',
] as const;
export type FormatSlug = (typeof formatSlugs)[number];

export type WorkKind =
  | 'novel'
  | 'novella'
  | 'short_stories'
  | 'poetry'
  | 'drama'
  | 'nonfiction'
  | 'biography'
  | 'memoir'
  | 'essay'
  | 'textbook'
  | 'academic'
  | 'children'
  | 'manga'
  | 'manhwa'
  | 'manhua'
  | 'webtoon'
  | 'comic'
  | 'graphic_novel'
  | 'light_novel'
  | 'web_novel';

export type ReaderKind = 'text' | 'visual' | 'audio';

export interface Format {
  slug: FormatSlug;
  label: string;
  singular: string;
  tagline: string;
  description: string;
  kinds: WorkKind[];
  reader: ReaderKind;
  /** The milestone that brings this format's catalogue online. */
  catalogueMilestone: string;
  /** What reading inside BookVerse will look like for this format. */
  readingNote: string;
}

export const formats: Record<FormatSlug, Format> = {
  novels: {
    slug: 'novels',
    label: 'Novels',
    singular: 'Novel',
    tagline: 'Long-form fiction, from classics to new voices.',
    description:
      'Classics you can read here for free, modern novels with every edition and where to find it, and new fiction from BookVerse writers.',
    kinds: ['novel', 'novella', 'short_stories', 'drama'],
    reader: 'text',
    catalogueMilestone: 'Milestone 2',
    readingNote:
      'Public-domain and openly licensed novels open in the BookVerse reader. Modern novels link to their publishers, bookshops and libraries.',
  },
  manga: {
    slug: 'manga',
    label: 'Manga',
    singular: 'Manga',
    tagline: 'Japanese comics, read right to left.',
    description:
      'Series pages with every volume, box sets and collector editions, and links to the official places to read each chapter.',
    kinds: ['manga'],
    reader: 'visual',
    catalogueMilestone: 'Milestone 2',
    readingNote:
      'Licensed manga links to official platforms such as MANGA Plus. Creator uploads and openly licensed comics open in the BookVerse visual reader.',
  },
  manhwa: {
    slug: 'manhwa',
    label: 'Manhwa',
    singular: 'Manhwa',
    tagline: 'Korean comics, often in full colour.',
    description: 'Ongoing and completed series, collected print editions, and official reading destinations.',
    kinds: ['manhwa'],
    reader: 'visual',
    catalogueMilestone: 'Milestone 2',
    readingNote:
      'Licensed series link to their official platforms. The visual reader supports vertical scrolling for creator uploads.',
  },
  manhua: {
    slug: 'manhua',
    label: 'Manhua',
    singular: 'Manhua',
    tagline: 'Chinese comics, from wuxia to romance.',
    description: 'Series, editions and official reading destinations for Chinese comics.',
    kinds: ['manhua'],
    reader: 'visual',
    catalogueMilestone: 'Milestone 2',
    readingNote: 'Licensed series link to their official platforms.',
  },
  webtoons: {
    slug: 'webtoons',
    label: 'Webtoons',
    singular: 'Webtoon',
    tagline: 'Vertical-scroll episodes made for phones.',
    description: 'Episodic stories with release schedules and links to where each series is officially published.',
    kinds: ['webtoon'],
    reader: 'visual',
    catalogueMilestone: 'Milestone 2',
    readingNote: 'Official series link out. Creator uploads read top to bottom in the BookVerse visual reader.',
  },
  comics: {
    slug: 'comics',
    label: 'Comics',
    singular: 'Comic',
    tagline: 'Single issues, runs and collected trades.',
    description:
      'Comics from independent creators, openly licensed series and public-domain archives, alongside where to buy current titles.',
    kinds: ['comic'],
    reader: 'visual',
    catalogueMilestone: 'Milestone 3',
    readingNote: 'Openly licensed comics such as Pepper&Carrot (CC BY 4.0) arrive in the visual reader in Milestone 3.',
  },
  'graphic-novels': {
    slug: 'graphic-novels',
    label: 'Graphic novels',
    singular: 'Graphic novel',
    tagline: 'Book-length stories told in pictures.',
    description: 'Standalone graphic novels and collected editions, with every format and where to get it.',
    kinds: ['graphic_novel'],
    reader: 'visual',
    catalogueMilestone: 'Milestone 2',
    readingNote:
      'Most graphic novels are under copyright, so BookVerse shows editions and where to buy or borrow them.',
  },
  'web-novels': {
    slug: 'web-novels',
    label: 'Web novels',
    singular: 'Web novel',
    tagline: 'Serial fiction, released chapter by chapter.',
    description: 'Serialised stories from BookVerse writers, with update schedules and chapter lists.',
    kinds: ['web_novel'],
    reader: 'text',
    catalogueMilestone: 'Milestone 5',
    readingNote: 'Writers publish chapters through the BookVerse studio in Milestone 5.',
  },
  'light-novels': {
    slug: 'light-novels',
    label: 'Light novels',
    singular: 'Light novel',
    tagline: 'Illustrated novels, often the source of anime and manga.',
    description: 'Volumes, translations and official releases of light novel series.',
    kinds: ['light_novel'],
    reader: 'text',
    catalogueMilestone: 'Milestone 2',
    readingNote: 'Licensed light novels link to their publishers and bookshops.',
  },
  audiobooks: {
    slug: 'audiobooks',
    label: 'Audiobooks',
    singular: 'Audiobook',
    tagline: 'Listen to the classics, read by volunteers.',
    description:
      'Public-domain recordings from LibriVox play in the BookVerse player; commercial audiobooks link to where you can buy them.',
    kinds: [],
    reader: 'audio',
    catalogueMilestone: 'Milestone 3',
    readingNote: 'LibriVox recordings are in the public domain and will play in BookVerse from Milestone 3.',
  },
  poetry: {
    slug: 'poetry',
    label: 'Poetry',
    singular: 'Poetry collection',
    tagline: 'Collections, anthologies and single poems.',
    description: 'Poetry you can read here for free, and collections with every edition and where to get them.',
    kinds: ['poetry'],
    reader: 'text',
    catalogueMilestone: 'Milestone 2',
    readingNote: 'Public-domain poetry opens in the BookVerse reader.',
  },
  'non-fiction': {
    slug: 'non-fiction',
    label: 'Non-fiction',
    singular: 'Non-fiction',
    tagline: 'Biography, history, philosophy, education and more.',
    description: 'Memoirs, essays, philosophy, history, textbooks and open-access academic books.',
    kinds: ['nonfiction', 'biography', 'memoir', 'essay', 'textbook', 'academic'],
    reader: 'text',
    catalogueMilestone: 'Milestone 2',
    readingNote:
      'Public-domain and open-access books open in the BookVerse reader; others link to publishers and libraries.',
  },
};

export const formatList: Format[] = formatSlugs.map((slug) => formats[slug]);

export function formatForKind(kind: WorkKind): Format {
  const match = formatList.find((f) => f.kinds.includes(kind));
  return match ?? formats.novels;
}
