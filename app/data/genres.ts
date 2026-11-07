// Genre taxonomy. Mirrors the `genres` table (with parent_id) that Milestone 2 seeds.
// Formats such as manga or poetry are not genres; see formats.ts.

export interface Genre {
  slug: string;
  name: string;
  group: 'fiction' | 'non-fiction';
  description: string;
  parent?: string;
}

export const genres: Genre[] = [
  {
    slug: 'classics',
    name: 'Classics',
    group: 'fiction',
    description: 'Books that have lasted, most of them free to read.',
  },
  {
    slug: 'literary-fiction',
    name: 'Literary fiction',
    group: 'fiction',
    description: 'Character, voice and ideas first.',
  },
  { slug: 'fantasy', name: 'Fantasy', group: 'fiction', description: 'Other worlds, magic and myth.' },
  {
    slug: 'epic-fantasy',
    name: 'Epic fantasy',
    group: 'fiction',
    parent: 'fantasy',
    description: 'Wars, quests and kingdoms.',
  },
  {
    slug: 'urban-fantasy',
    name: 'Urban fantasy',
    group: 'fiction',
    parent: 'fantasy',
    description: 'Magic in modern cities.',
  },
  { slug: 'isekai', name: 'Isekai', group: 'fiction', parent: 'fantasy', description: 'Transported to another world.' },
  {
    slug: 'science-fiction',
    name: 'Science fiction',
    group: 'fiction',
    description: 'Futures, technology and the unknown.',
  },
  {
    slug: 'dystopian',
    name: 'Dystopian',
    group: 'fiction',
    parent: 'science-fiction',
    description: 'Societies gone wrong.',
  },
  {
    slug: 'time-travel',
    name: 'Time travel',
    group: 'fiction',
    parent: 'science-fiction',
    description: 'Past and future, rewritten.',
  },
  { slug: 'mystery', name: 'Mystery', group: 'fiction', description: 'Puzzles, detectives and clues.' },
  {
    slug: 'crime',
    name: 'Crime',
    group: 'fiction',
    parent: 'mystery',
    description: 'Inside the crime and its consequences.',
  },
  { slug: 'thriller', name: 'Thriller', group: 'fiction', description: 'Suspense that keeps you turning pages.' },
  {
    slug: 'psychological-thriller',
    name: 'Psychological thriller',
    group: 'fiction',
    parent: 'thriller',
    description: 'The danger is in the mind.',
  },
  { slug: 'horror', name: 'Horror', group: 'fiction', description: 'Dread, the uncanny and the monstrous.' },
  {
    slug: 'gothic',
    name: 'Gothic',
    group: 'fiction',
    parent: 'horror',
    description: 'Ruins, secrets and dark romance.',
  },
  { slug: 'romance', name: 'Romance', group: 'fiction', description: 'Love stories of every kind.' },
  {
    slug: 'historical-romance',
    name: 'Historical romance',
    group: 'fiction',
    parent: 'romance',
    description: 'Love in another age.',
  },
  { slug: 'adventure', name: 'Adventure', group: 'fiction', description: 'Journeys, voyages and daring.' },
  { slug: 'action', name: 'Action', group: 'fiction', description: 'Fights, chases and high stakes.' },
  {
    slug: 'historical-fiction',
    name: 'Historical fiction',
    group: 'fiction',
    description: 'Stories set in the real past.',
  },
  { slug: 'drama', name: 'Drama', group: 'fiction', description: 'Plays and emotionally driven stories.' },
  { slug: 'comedy', name: 'Comedy', group: 'fiction', description: 'Wit, satire and joy.' },
  { slug: 'satire', name: 'Satire', group: 'fiction', parent: 'comedy', description: 'Laughter with a target.' },
  { slug: 'war', name: 'War', group: 'fiction', description: 'Soldiers, battles and what they leave behind.' },
  {
    slug: 'mythology-folklore',
    name: 'Mythology and folklore',
    group: 'fiction',
    description: 'Myths, legends, fairy tales and epics.',
  },
  {
    slug: 'slice-of-life',
    name: 'Slice of life',
    group: 'fiction',
    description: 'Everyday moments, closely observed.',
  },
  { slug: 'sports', name: 'Sports', group: 'fiction', description: 'Competition, teams and training.' },
  { slug: 'young-adult', name: 'Young adult', group: 'fiction', description: 'Coming-of-age stories.' },
  { slug: 'children', name: "Children's", group: 'fiction', description: 'Stories for young readers.' },
  {
    slug: 'biography-memoir',
    name: 'Biography and memoir',
    group: 'non-fiction',
    description: 'Real lives, told by others or themselves.',
  },
  { slug: 'history', name: 'History', group: 'non-fiction', description: 'How the world came to be.' },
  { slug: 'philosophy', name: 'Philosophy', group: 'non-fiction', description: 'How to think and how to live.' },
  { slug: 'psychology', name: 'Psychology', group: 'non-fiction', description: 'Minds, behaviour and wellbeing.' },
  { slug: 'business', name: 'Business', group: 'non-fiction', description: 'Work, money and organisations.' },
  { slug: 'education', name: 'Education', group: 'non-fiction', description: 'Textbooks and learning.' },
  { slug: 'science', name: 'Science', group: 'non-fiction', description: 'Discovery and the natural world.' },
  { slug: 'travel', name: 'Travel', group: 'non-fiction', description: 'Journeys and the places they reach.' },
  {
    slug: 'politics-society',
    name: 'Politics and society',
    group: 'non-fiction',
    description: 'Power, rights and how people live together.',
  },
  { slug: 'religion', name: 'Religion', group: 'non-fiction', description: 'Faith, scripture and spiritual writing.' },
];

export type GenreSlug = string;

const bySlug = new Map(genres.map((g) => [g.slug, g]));

export function getGenre(slug: string): Genre | undefined {
  return bySlug.get(slug);
}

export function topLevelGenres(group?: Genre['group']): Genre[] {
  return genres.filter((g) => !g.parent && (!group || g.group === group));
}

export function subgenres(parentSlug: string): Genre[] {
  return genres.filter((g) => g.parent === parentSlug);
}

/** The selected genre and its direct subgenres, matching genre landing pages. */
export function genreFamilySlugs(slug: string): string[] {
  return [slug, ...subgenres(slug).map((g) => g.slug)];
}
