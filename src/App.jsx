import { useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { books, genres } from './data/books';
import Header from './components/Header';
import Footer from './components/Footer';
import BookCard from './components/BookCard';
import Reader from './components/Reader';
import { getTheme, saveTheme } from './lib/storage.js';
import { useLibrary } from './hooks/useLibrary.js';

const getBook = (id) => books.find((book) => book.id === id);
const getAuthors = () => [...new Set(books.map((book) => book.author))];
const ratingCount = (value) => parseFloat(value.replace('k', '')) * (value.includes('k') ? 1000 : 1);

function PageShell({ children, saved, dark, setDark }) {
  return <div className={dark ? 'app dark' : 'app'}><Header savedCount={saved.length} dark={dark} onTheme={() => setDark(!dark)} />{children}<Footer /></div>;
}

function Home({ saved, toggle, dark, setDark }) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const filtered = useMemo(() => books.filter((book) => (genre === 'All' || book.genre === genre) && `${book.title} ${book.author} ${book.genre}`.toLowerCase().includes(query.toLowerCase())), [query, genre]);
  const recommended = useMemo(() => {
    if (!saved.length) return books.filter((book) => book.rating >= 4.8).slice(0, 3);
    const savedGenres = saved.map((id) => getBook(id)?.genre).filter(Boolean);
    return books.filter((book) => !saved.includes(book.id) && savedGenres.includes(book.genre)).sort((a, b) => b.rating - a.rating).slice(0, 3);
  }, [saved]);
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main>
    <section className="hero" id="discover"><div className="hero-copy"><span className="eyebrow">The modern bookshelf</span><h1>Find a story worth getting lost in.</h1><p>Discover books, follow authors, and build a library that feels like yours.</p><div className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search books, authors, genres..."/><button onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>Search</button></div></div><div className="hero-art"><div className="book-stack"><i>BOOK</i><i>VERSE</i><i>READ</i></div></div></section>
    <section className="stats"><div><strong>{books.length}</strong><span>Stories</span></div><div><strong>{genres.length}</strong><span>Genres</span></div><div><strong>{getAuthors().length}</strong><span>Authors</span></div><div><strong>{(books.reduce((sum, book) => sum + book.rating, 0) / books.length).toFixed(1)}</strong><span>Avg. rating</span></div></section>
    <section className="section" id="genres"><div className="section-head"><div><span className="eyebrow">Explore</span><h2>Browse by genre</h2></div><Link className="view-link" to="/genres">View all →</Link></div><div className="genre-row"><button className={genre === 'All' ? 'active' : ''} onClick={() => setGenre('All')}>All books</button>{genres.map((item) => <button className={genre === item ? 'active' : ''} key={item} onClick={() => setGenre(item)}>{item}</button>)}</div></section>
    <section className="section" id="catalog"><div className="section-head"><div><span className="eyebrow">Curated for you</span><h2>{query || genre !== 'All' ? 'Search results' : 'Trending stories'}</h2></div><span className="result-count">{filtered.length} books</span></div><div className="book-grid">{filtered.map((book) => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}{!filtered.length && <div className="empty"><h3>No stories found.</h3><p>Try another title, author, or genre.</p></div>}</div></section>
    <section className="section recommendation"><div className="section-head"><div><span className="eyebrow">Personalized shelf</span><h2>{saved.length ? 'More like your library' : 'Readers are loving these'}</h2></div></div><div className="book-grid">{recommended.map((book) => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}</div></section>
    <section className="library-strip" id="library"><div><span className="eyebrow">Your collection</span><h2>Keep the stories you don't want to lose.</h2><p>Your saved books stay in this browser.</p></div><strong>{saved.length}<small> saved</small></strong></section>
    <section className="section authors" id="authors"><div className="section-head"><div><span className="eyebrow">Meet the writers</span><h2>Authors worth following</h2></div><Link className="view-link" to="/authors">View all →</Link></div><div className="author-row">{getAuthors().map((author) => <Link to={`/author/${encodeURIComponent(author)}`} key={author}>{author}<span>{books.filter((book) => book.author === author).length} books · View profile →</span></Link>)}</div></section>
  </main></PageShell>;
}

function BookPage({ saved, toggle, dark, setDark }) {
  const { id } = useParams();
  const book = getBook(id);
  if (!book) return <NotFound />;
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main><section className="book-detail"><div className="detail-cover"><span>{book.title}</span></div><div><span className="eyebrow">{book.genre}</span><h1>{book.title}</h1><p className="byline">by <Link to={`/author/${encodeURIComponent(book.author)}`}>{book.author}</Link></p><div className="rating">★★★★★ <span>{book.rating} · {book.ratings}</span></div><p className="description">{book.description}</p><div className="detail-actions"><button className="primary-action" onClick={() => toggle(book.id)}>{saved.includes(book.id) ? '♥ Saved to library' : '♡ Save to library'}</button><Link className="secondary-action" to="/">← Back to discovery</Link></div><div className="meta"><span><b>{book.year}</b>Published</span><span><b>{book.pages}</b>Pages</span><span><b>English</b>Language</span></div></div></section><section className="preview section"><span className="eyebrow">Free preview</span><h2>A first look inside</h2><p>{book.preview}</p><Reader book={book} /></section></main></PageShell>;
}

function Library({ saved, toggle, dark, setDark }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const owned = useMemo(() => books.filter((book) => saved.includes(book.id) && `${book.title} ${book.author} ${book.genre}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'rating' ? b.rating - a.rating : sort === 'year' ? b.year - a.year : saved.indexOf(a.id) - saved.indexOf(b.id)), [saved, query, sort]);
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><span className="eyebrow">Your collection</span><h1>My Library</h1><p className="description">{saved.length} saved {saved.length === 1 ? 'story' : 'stories'}.</p><div className="library-controls"><div className="search library-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library..." /></div><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort library"><option value="recent">Recently saved</option><option value="title">Title A–Z</option><option value="rating">Highest rated</option><option value="year">Newest</option></select></div><div className="book-grid">{owned.map((book) => <BookCard key={book.id} book={book} saved onToggle={toggle} />)}</div>{!owned.length && <div className="empty"><h3>{saved.length ? 'No matches.' : 'Your library is empty.'}</h3><p>Save a book from discovery and it will appear here.</p></div>}</main></PageShell>;
}

function GenresPage({ saved, toggle, dark, setDark }) {
  const [params] = useSearchParams();
  const selected = params.get('genre');
  const [active, setActive] = useState(selected && genres.includes(selected) ? selected : 'All');
  const filtered = active === 'All' ? books : books.filter((book) => book.genre === active);
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><span className="eyebrow">Explore the shelf</span><h1>Genres</h1><p className="description">Browse BookVerse by the kind of story you want to disappear into.</p><div className="genre-cards"><button className={`genre-card ${active === 'All' ? 'selected' : ''}`} onClick={() => setActive('All')}><h3>All books</h3><span>{books.length} stories</span></button>{genres.map((item) => <button className={`genre-card ${active === item ? 'selected' : ''}`} key={item} onClick={() => setActive(item)}><h3>{item}</h3><span>{books.filter((book) => book.genre === item).length} {books.filter((book) => book.genre === item).length === 1 ? 'story' : 'stories'}</span></button>)}</div><section className="section"><div className="section-head"><h2>{active === 'All' ? 'All stories' : active}</h2><span className="result-count">{filtered.length} books</span></div><div className="book-grid">{filtered.map((book) => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}</div></section></main></PageShell>;
}

function AuthorsPage({ saved, dark, setDark }) {
  const [query, setQuery] = useState('');
  const authors = getAuthors().filter((author) => author.toLowerCase().includes(query.toLowerCase()));
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><span className="eyebrow">Meet the writers</span><h1>Authors</h1><p className="description">Explore the writers behind the stories in the BookVerse collection.</p><div className="search library-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search authors..." /></div><div className="author-row">{authors.map((author) => { const authored = books.filter((book) => book.author === author); const average = (authored.reduce((sum, book) => sum + book.rating, 0) / authored.length).toFixed(1); return <Link to={`/author/${encodeURIComponent(author)}`} key={author}><strong>{author}</strong><span>{authored.length} {authored.length === 1 ? 'book' : 'books'} · {average} avg. rating</span><span>View profile →</span></Link>; })}</div></main></PageShell>;
}

function AuthorProfile({ saved, toggle, dark, setDark }) {
  const { name = '' } = useParams();
  const author = decodeURIComponent(name);
  const authored = books.filter((book) => book.author === author);
  if (!authored.length) return <PageShell saved={saved} dark={dark} setDark={setDark}><NotFound title="Author not found." back="/authors" /></PageShell>;
  const average = (authored.reduce((sum, book) => sum + book.rating, 0) / authored.length).toFixed(1);
  const readers = authored.reduce((sum, book) => sum + ratingCount(book.ratings), 0).toLocaleString();
  return <PageShell saved={saved} dark={dark} setDark={setDark}><main className="section page"><div className="profile-head"><div className="avatar">{author.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><span className="eyebrow">Author profile</span><h1>{author}</h1><div className="profile-stats"><span><b>{authored.length}</b> books</span><span><b>{average}</b> avg. rating</span><span><b>{readers}</b> readers</span></div></div></div><p className="description">A BookVerse author profile featuring {authored.length === 1 ? 'one story' : `${authored.length} stories`} currently in the collection.</p><section className="section"><div className="section-head"><div><span className="eyebrow">Bibliography</span><h2>Books by {author.split(' ')[0]}</h2></div></div><div className="book-grid">{authored.map((book) => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}</div></section></main></PageShell>;
}

function NotFound({ title = 'Page not found.', back = '/' }) {
  return <main className="section page"><span className="eyebrow">404</span><h1>{title}</h1><p className="description">The page you're looking for doesn't exist.</p><Link className="view-link" to={back}>← Go back</Link></main>;
}

export default function App() {
  const [dark, setDarkState] = useState(() => getTheme() === 'dark');
  const setDark = (value) => { setDarkState(value); saveTheme(value ? 'dark' : 'light'); };
  const { library: saved, toggle } = useLibrary();
  const shellProps = { saved, toggle, dark, setDark };
  return <Routes>
    <Route path="/" element={<Home {...shellProps} />} />
    <Route path="/book/:id" element={<BookPage {...shellProps} />} />
    <Route path="/library" element={<Library {...shellProps} />} />
    <Route path="/genres" element={<GenresPage {...shellProps} />} />
    <Route path="/authors" element={<AuthorsPage {...shellProps} />} />
    <Route path="/author/:name" element={<AuthorProfile {...shellProps} />} />
    <Route path="*" element={<PageShell saved={saved} dark={dark} setDark={setDark}><NotFound /></PageShell>} />
  </Routes>;
}
