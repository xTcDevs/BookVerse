import { useMemo, useState } from 'react';
import { books, genres } from './data/books';

const savedKey = 'bookverse-library';
const themeKey = 'bookverse-theme';

function readSaved() {
  try { return JSON.parse(localStorage.getItem(savedKey) || '[]'); } catch { return []; }
}

function Header({ dark, setDark, savedCount }) {
  return <header className="header"><a className="brand" href="/">Book<span>Verse</span></a><nav><a href="#discover">Discover</a><a href="#genres">Genres</a><a href="#authors">Authors</a><a href="#library">Library <small>{savedCount}</small></a></nav><button className="theme" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? '☀' : '◐'}</button></header>;
}

function BookCard({ book, saved, toggleSave }) {
  return <article className="book-card"><div className="cover"><span>{book.title}</span></div><div className="card-body"><div className="card-top"><span className="eyebrow">{book.genre}</span><button className="save" onClick={() => toggleSave(book.id)} aria-label={saved ? 'Remove from library' : 'Save to library'}>{saved ? '♥' : '♡'}</button></div><h3>{book.title}</h3><p>by {book.author}</p><div className="rating">★★★★★ <span>{book.rating} · {book.ratings}</span></div></div></article>;
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem(themeKey) === 'dark');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const [saved, setSaved] = useState(readSaved);

  const setTheme = value => { setDark(value); localStorage.setItem(themeKey, value ? 'dark' : 'light'); };
  const toggleSave = id => setSaved(current => { const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]; localStorage.setItem(savedKey, JSON.stringify(next)); return next; });
  const filtered = useMemo(() => books.filter(b => (genre === 'All' || b.genre === genre) && `${b.title} ${b.author} ${b.genre}`.toLowerCase().includes(query.toLowerCase())), [query, genre]);

  return <div className={dark ? 'app dark' : 'app'}><Header dark={dark} setDark={setTheme} savedCount={saved.length}/><main>
    <section className="hero" id="discover"><div className="hero-copy"><span className="eyebrow">The modern bookshelf</span><h1>Find a story worth getting lost in.</h1><p>Discover books, follow authors, and build a library that feels like yours.</p><div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search books, authors, genres..."/><button onClick={() => document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' })}>Search</button></div></div><div className="hero-art"><div className="book-stack"><i>BOOK</i><i>VERSE</i><i>READ</i></div></div></section>
    <section className="stats"><div><strong>11</strong><span>Stories</span></div><div><strong>6</strong><span>Genres</span></div><div><strong>6</strong><span>Authors</span></div><div><strong>4.7</strong><span>Avg. rating</span></div></section>
    <section className="section" id="genres"><div className="section-head"><div><span className="eyebrow">Explore</span><h2>Browse by genre</h2></div></div><div className="genre-row"><button className={genre === 'All' ? 'active' : ''} onClick={() => setGenre('All')}>All books</button>{genres.map(g => <button className={genre === g ? 'active' : ''} key={g} onClick={() => setGenre(g)}>{g}</button>)}</div></section>
    <section className="section" id="catalog"><div className="section-head"><div><span className="eyebrow">Curated for you</span><h2>{query || genre !== 'All' ? 'Search results' : 'Trending stories'}</h2></div><span className="result-count">{filtered.length} books</span></div><div className="book-grid">{filtered.map(book => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} toggleSave={toggleSave}/>)}{!filtered.length && <div className="empty"><h3>No stories found.</h3><p>Try another title, author, or genre.</p></div>}</div></section>
    <section className="library-strip" id="library"><div><span className="eyebrow">Your collection</span><h2>Keep the stories you don't want to lose.</h2><p>Your saved books stay in this browser while we build the full BookVerse account system.</p></div><strong>{saved.length}<small> saved</small></strong></section>
    <section className="section authors" id="authors"><span className="eyebrow">Meet the writers</span><h2>Authors worth following</h2><div className="author-row">{[...new Set(books.map(b => b.author))].map(author => <a href={`author.html?author=${encodeURIComponent(author)}`} key={author}>{author}<span>View profile →</span></a>)}</div></section>
  </main><footer>BookVerse <span>·</span> A reading experience built for curious people.</footer></div>;
}
