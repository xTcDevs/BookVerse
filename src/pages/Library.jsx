import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { books } from '../data/books.js';
import BookCard from '../components/BookCard.jsx';
import { getReadingProgress } from '../lib/storage.js';

export default function Library({ saved, toggle, clear }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const owned = useMemo(() => books.filter((book) => saved.includes(book.id) && `${book.title} ${book.author} ${book.genre}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'rating') return b.rating - a.rating;
    if (sort === 'year') return b.year - a.year;
    return saved.indexOf(a.id) - saved.indexOf(b.id);
  }), [saved, query, sort]);
  const continueBook = owned.find((book) => getReadingProgress(book.id) > 0 && getReadingProgress(book.id) < 100);
  return <main className="section page"><div className="section-head"><div><span className="eyebrow">Your collection</span><h1>My Library</h1><p className="description">{saved.length} saved {saved.length === 1 ? 'story' : 'stories'}.</p></div>{saved.length > 0 && <button className="secondary-action" onClick={clear}>Clear library</button>}</div>{continueBook && <section className="library-strip"><div><span className="eyebrow">Continue reading</span><h2>{continueBook.title}</h2><p>{getReadingProgress(continueBook.id)}% through the preview.</p></div><Link className="primary-action" to={`/book/${continueBook.id}`}>Resume reading →</Link></section>}<div className="library-controls"><div className="search library-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library..." /></div><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort library"><option value="recent">Recently saved</option><option value="title">Title A–Z</option><option value="rating">Highest rated</option><option value="year">Newest</option></select></div><div className="book-grid">{owned.map((book) => <BookCard key={book.id} book={book} saved onToggle={toggle} />)}</div>{!owned.length && <div className="empty"><h3>{saved.length ? 'No matches.' : 'Your library is empty.'}</h3><p>Save a book from discovery and it will appear here.</p></div>}</main>;
}
