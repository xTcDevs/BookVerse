import { useMemo, useState } from 'react';
import { books, genres } from './data/books';
import Header from './components/Header';
import Footer from './components/Footer';
import BookCard from './components/BookCard';

const savedKey = 'bookverse-library';
const themeKey = 'bookverse-theme';
const readSaved = () => { try { return JSON.parse(localStorage.getItem(savedKey) || '[]'); } catch { return []; } };
const getBook = id => books.find(book => book.id === id);
const getAuthors = () => [...new Set(books.map(book => book.author))];
const slug = value => encodeURIComponent(value);

function useLibrary() {
  const [saved, setSaved] = useState(readSaved);
  const toggle = id => setSaved(current => {
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    localStorage.setItem(savedKey, JSON.stringify(next));
    return next;
  });
  return { saved, toggle };
}

function PageShell({ children, saved, dark, setDark }) {
  return <div className={dark ? 'app dark' : 'app'}><Header savedCount={saved.length} dark={dark} onTheme={() => setDark(!dark)} />{children}<Footer /></div>;
}

function Home({ saved, toggle, dark, setDark }) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const filtered = useMemo(() => books.filter(b => (genre === 'All' || b.genre === genre) && `${b.title} ${b.author} ${b.genre}`.toLowerCase().includes(query.toLowerCase())), [query, genre]);
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main>
    <section className="hero" id="discover"><div className="hero-copy"><span className="eyebrow">The modern bookshelf</span><h1>Find a story worth getting lost in.</h1><p>Discover books, follow authors, and build a library that feels like yours.</p><div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search books, authors, genres..."/><button onClick={() => document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' })}>Search</button></div></div><div className="hero-art"><div className="book-stack"><i>BOOK</i><i>VERSE</i><i>READ</i></div></div></section>
    <section className="stats"><div><strong>{books.length}</strong><span>Stories</span></div><div><strong>{genres.length}</strong><span>Genres</span></div><div><strong>{getAuthors().length}</strong><span>Authors</span></div><div><strong>{(books.reduce((sum, b) => sum + b.rating, 0) / books.length).toFixed(1)}</strong><span>Avg. rating</span></div></section>
    <section className="section" id="genres"><div className="section-head"><div><span className="eyebrow">Explore</span><h2>Browse by genre</h2></div><a className="view-link" href="/genres">View all →</a></div><div className="genre-row"><button className={genre === 'All' ? 'active' : ''} onClick={() => setGenre('All')}>All books</button>{genres.map(g => <button className={genre === g ? 'active' : ''} key={g} onClick={() => setGenre(g)}>{g}</button>)}</div></section>
    <section className="section" id="catalog"><div className="section-head"><div><span className="eyebrow">Curated for you</span><h2>{query || genre !== 'All' ? 'Search results' : 'Trending stories'}</h2></div><span className="result-count">{filtered.length} books</span></div><div className="book-grid">{filtered.map(book => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}{!filtered.length && <div className="empty"><h3>No stories found.</h3><p>Try another title, author, or genre.</p></div>}</div></section>
    <section className="library-strip" id="library"><div><span className="eyebrow">Your collection</span><h2>Keep the stories you don't want to lose.</h2><p>Your saved books stay in this browser.</p></div><strong>{saved.length}<small> saved</small></strong></section>
    <section className="section authors" id="authors"><div className="section-head"><div><span className="eyebrow">Meet the writers</span><h2>Authors worth following</h2></div><a className="view-link" href="/authors">View all →</a></div><div className="author-row">{getAuthors().map(author => <a href={`/author/${slug(author)}`} key={author}>{author}<span>{books.filter(b => b.author === author).length} books · View profile →</span></a>)}</div></section>
  </main></PageShell>;
}

function BookPage({ id, saved, toggle, dark, setDark }) {
  const book = getBook(id);
  if (!book) return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><span className="eyebrow">404</span><h1>Book not found.</h1><a className="view-link" href="/">← Back to discovery</a></main></PageShell>;
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main><section className="book-detail"><div className="detail-cover"><span>{book.title}</span></div><div><span className="eyebrow">{book.genre}</span><h1>{book.title}</h1><p className="byline">by <a href={`/author/${slug(book.author)}`}>{book.author}</a></p><div className="rating">★★★★★ <span>{book.rating} · {book.ratings}</span></div><p className="description">{book.description}</p><div className="detail-actions"><button className="primary-action" onClick={() => toggle(book.id)}>{saved.includes(book.id) ? '♥ Saved to library' : '♡ Save to library'}</button><a className="secondary-action" href="/#catalog">← Back to discovery</a></div><div className="meta"><span><b>{book.year}</b>Published</span><span><b>{book.pages}</b>Pages</span><span><b>English</b>Language</span></div></div></section><section className="preview section"><span className="eyebrow">Free preview</span><h2>A first look inside</h2><p>{book.preview}</p></section></main></PageShell>;
}

function Library({ saved, toggle, dark, setDark }) {
  const [query, setQuery] = useState('');
  const owned = books.filter(b => saved.includes(b.id) && `${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase()));
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><span className="eyebrow">Your collection</span><h1>My Library</h1><p className="description">{saved.length} saved {saved.length === 1 ? 'story' : 'stories'}.</p><div className="search library-search"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your library..." /></div><div className="book-grid">{owned.map(book => <BookCard key={book.id} book={book} saved onToggle={toggle} />)}</div>{!owned.length && <div className="empty"><h3>{saved.length ? 'No matches.' : 'Your library is empty.'}</h3><p>Save a book from discovery and it will appear here.</p></div>}</main></PageShell>;
}

function GenresPage({ saved, toggle, dark, setDark }) {
  const params = new URLSearchParams(window.location.search);
  const selected = params.get('genre');
  const [active, setActive] = useState(selected && genres.includes(selected) ? selected : 'All');
  const filtered = active === 'All' ? books : books.filter(book => book.genre === active);
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><span className="eyebrow">Explore the shelf</span><h1>Genres</h1><p className="description">Browse BookVerse by the kind of story you want to disappear into.</p><div className="genre-cards">{genres.map(genre => <button className="genre-card" key={genre} onClick={() => setActive(genre)}><h3>{genre}</h3><span>{books.filter(book => book.genre === genre).length} {books.filter(book => book.genre === genre).length === 1 ? 'story' : 'stories'}</span></button>)}</div><section className="section"><div className="section-head"><h2>{active === 'All' ? 'All stories' : active}</h2><span className="result-count">{filtered.length} books</span></div><div className="book-grid">{filtered.map(book => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}</div></section></main></PageShell>;
}

function AuthorsPage({ saved, dark, setDark }) {
  const [query, setQuery] = useState('');
  const authors = getAuthors().filter(author => author.toLowerCase().includes(query.toLowerCase()));
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><span className="eyebrow">Meet the writers</span><h1>Authors</h1><p className="description">Explore the writers behind the stories in the BookVerse collection.</p><div className="search library-search"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search authors..." /></div><div className="author-row">{authors.map(author => { const authored = books.filter(book => book.author === author); return <a href={`/author/${slug(author)}`} key={author}><strong>{author}</strong><span>{authored.length} {authored.length === 1 ? 'book' : 'books'} · {authored.reduce((sum, b) => sum + b.rating, 0) / authored.length.toFixed ? '' : ''}</span><span>View profile →</span></a>; })}</div></main></PageShell>;
}

function AuthorProfile({ name, saved, toggle, dark, setDark }) {
  const author = decodeURIComponent(name || '');
  const authored = books.filter(book => book.author === author);
  if (!authored.length) return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><span className="eyebrow">404</span><h1>Author not found.</h1><a className="view-link" href="/authors">← Back to authors</a></main></PageShell>;
  const average = (authored.reduce((sum, book) => sum + book.rating, 0) / authored.length).toFixed(1);
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><div className="profile-head"><div className="avatar">{author.split(' ').map(part => part[0]).join('').slice(0, 2)}</div><div><span className="eyebrow">Author profile</span><h1>{author}</h1><div className="profile-stats"><span><b>{authored.length}</b> books</span><span><b>{average}</b> avg. rating</span><span><b>{authored.reduce((sum, book) => sum + parseFloat(book.ratings.replace('k', '')) * (book.ratings.includes('k') ? 1000 : 1), 0).toLocaleString()}</b> readers</span></div></div></div><p className="description">A BookVerse author profile featuring {authored.length === 1 ? 'one story' : `${authored.length} stories`} currently in the collection.</p><section className="section"><div className="section-head"><div><span className="eyebrow">Bibliography</span><h2>Books by {author.split(' ')[0]}</h2></div></div><div className="book-grid">{authored.map(book => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}</div></section></main></PageShell>;
}

export default function App() {
  const [dark, setDarkState] = useState(() => localStorage.getItem(themeKey) === 'dark');
  const setDark = value => { setDarkState(value); localStorage.setItem(themeKey, value ? 'dark' : 'light'); };
  const { saved, toggle } = useLibrary();
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'book') return <BookPage id={parts[1]} saved={saved} toggle={toggle} dark={dark} setDark={setDark} />;
  if (parts[0] === 'library') return <Library saved={saved} toggle={toggle} dark={dark} setDark={setDark} />;
  if (parts[0] === 'genres') return <GenresPage saved={saved} toggle={toggle} dark={dark} setDark={setDark} />;
  if (parts[0] === 'authors') return <AuthorsPage saved={saved} dark={dark} setDark={setDark} />;
  if (parts[0] === 'author') return <AuthorProfile name={parts.slice(1).join('/')} saved={saved} toggle={toggle} dark={dark} setDark={setDark} />;
  return <Home saved={saved} toggle={toggle} dark={dark} setDark={setDark} />;
}
