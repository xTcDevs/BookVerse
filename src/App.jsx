import { useMemo, useState } from 'react';
import { Link, Outlet, Route, Routes, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { books, genres } from './data/books.js';
import BookCard from './components/BookCard.jsx';
import Reader from './components/Reader.jsx';
import PageShell from './layouts/PageShell.jsx';
import { getTheme, saveTheme } from './lib/storage.js';
import { useLibrary } from './hooks/useLibrary.js';

const getBook = (id) => books.find((book) => book.id === id);
const getAuthors = () => [...new Set(books.map((book) => book.author))];
const ratingCount = (value) => parseFloat(value.replace('k', '')) * (value.includes('k') ? 1000 : 1);
const useApp = () => useOutletContext();

function Home() {
  const { saved, toggle } = useApp();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const filtered = useMemo(() => books.filter((book) => (genre === 'All' || book.genre === genre) && `${book.title} ${book.author} ${book.genre}`.toLowerCase().includes(query.toLowerCase())), [query, genre]);
  const recommended = useMemo(() => {
    if (!saved.length) return books.filter((book) => book.rating >= 4.8).slice(0, 3);
    const savedGenres = saved.map((id) => getBook(id)?.genre).filter(Boolean);
    return books.filter((book) => !saved.includes(book.id) && savedGenres.includes(book.genre)).sort((a, b) => b.rating - a.rating).slice(0, 3);
  }, [saved]);
  return <main>
    <section className="hero" id="discover"><div className="hero-copy"><span className="eyebrow">The modern bookshelf</span><h1>Find a story worth getting lost in.</h1><p>Discover books, follow authors, and build a library that feels like yours.</p><div className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search books, authors, genres..."/><button onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>Search</button></div></div><div className="hero-art"><div className="book-stack"><i>BOOK</i><i>VERSE</i><i>READ</i></div></div></section>
    <section className="stats"><div><strong>{books.length}</strong><span>Stories</span></div><div><strong>{genres.length}</strong><span>Genres</span></div><div><strong>{getAuthors().length}</strong><span>Authors</span></div><div><strong>{(books.reduce((sum, book) => sum + book.rating, 0) / books.length).toFixed(1)}</strong><span>Avg. rating</span></div></section>
    <section className="section"><div className="section-head"><div><span className="eyebrow">Explore</span><h2>Browse by genre</h2></div><Link className="view-link" to="/genres">View all →</Link></div><div className="genre-row"><button className={genre === 'All' ? 'active' : ''} onClick={() => setGenre('All')}>All books</button>{genres.map((item) => <button className={genre === item ? 'active' : ''} key={item} onClick={() => setGenre(item)}>{item}</button>)}</div></section>
    <section className="section" id="catalog"><div className="section-head"><div><span className="eyebrow">Curated for you</span><h2>{query || genre !== 'All' ? 'Search results' : 'Trending stories'}</h2></div><span className="result-count">{filtered.length} books</span></div><div className="book-grid">{filtered.map((book) => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}{!filtered.length && <div className="empty"><h3>No stories found.</h3><p>Try another title, author, or genre.</p></div>}</div></section>
    <section className="section recommendation"><div className="section-head"><div><span className="eyebrow">Personalized shelf</span><h2>{saved.length ? 'More like your library' : 'Readers are loving these'}</h2></div></div><div className="book-grid">{recommended.map((book) => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}</div></section>
    <section className="library-strip"><div><span className="eyebrow">Your collection</span><h2>Keep the stories you don't want to lose.</h2><p>Your saved books stay in this browser.</p></div><strong>{saved.length}<small> saved</small></strong></section>
    <section className="section authors"><div className="section-head"><div><span className="eyebrow">Meet the writers</span><h2>Authors worth following</h2></div><Link className="view-link" to="/authors">View all →</Link></div><div className="author-row">{getAuthors().map((author) => <Link to={`/author/${encodeURIComponent(author)}`} key={author}>{author}<span>{books.filter((book) => book.author === author).length} books · View profile →</span></Link>)}</div></section>
  </main>;
}

function BookPage() {
  const { saved, toggle } = useApp();
  const { id } = useParams();
  const book = getBook(id);
  if (!book) return <NotFound />;
  return <main><section className="book-detail"><div className="detail-cover"><span>{book.title}</span></div><div><span className="eyebrow">{book.genre}</span><h1>{book.title}</h1><p className="byline">by <Link to={`/author/${encodeURIComponent(book.author)}`}>{book.author}</Link></p><div className="rating">★★★★★ <span>{book.rating} · {book.ratings}</span></div><p className="description">{book.description}</p><div className="detail-actions"><button className="primary-action" onClick={() => toggle(book.id)}>{saved.includes(book.id) ? '♥ Saved to library' : '♡ Save to library'}</button><Link className="secondary-action" to="/">← Back to discovery</Link></div><div className="meta"><span><b>{book.year}</b>Published</span><span><b>{book.pages}</b>Pages</span><span><b>English</b>Language</span></div></div></section><section className="preview section"><span className="eyebrow">Free preview</span><h2>A first look inside</h2><p>{book.preview}</p><Reader book={book} /></section></main>;
}

function Library() {
  const { saved, toggle, remove, clear } = useApp();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const owned = useMemo(() => books.filter((book) => saved.includes(book.id) && `${book.title} ${book.author} ${book.genre}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'rating' ? b.rating - a.rating : sort === 'year' ? b.year - a.year : saved.indexOf(a.id) - saved.indexOf(b.id)), [saved, query, sort]);
  return <main className="section page"><span className="eyebrow">Your collection</span><h1>My Library</h1><p className="description">{saved.length} saved {saved.length === 1 ? 'story' : 'stories'}.</p><div className="library-controls"><div className="search library-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library..." /></div><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort library"><option value="recent">Recently saved</option><option value="title">Title A–Z</option><option value="rating">Highest rated</option><option value="year">Newest</option></select>{saved.length > 0 && <button className="secondary-action" onClick={() => window.confirm('Clear your entire library?') && clear()}>Clear library</button>}</div><div className="book-grid">{owned.map((book) => <div className="library-item" key={book.id}><BookCard book={book} saved onToggle={toggle} /><button className="text-action" onClick={() => remove(book.id)}>Remove from library</button></div>)}</div>{!owned.length && <div className="empty"><h3>{saved.length ? 'No matches.' : 'Your library is empty.'}</h3><p>Save a book from discovery and it will appear here.</p></div>}</main>;
}

function GenresPage() {
  const { saved, toggle } = useApp();
  const [params] = useSearchParams();
  const initial = params.get('genre');
  const [active, setActive] = useState(initial && genres.includes(initial) ? initial : 'All');
  const filtered = active === 'All' ? books : books.filter((book) => book.genre === active);
  return <main className="section page"><span className="eyebrow">Explore the shelf</span><h1>Genres</h1><p className="description">Browse BookVerse by the kind of story you want to disappear into.</p><div className="genre-cards"><button className={`genre-card ${active === 'All' ? 'selected' : ''}`} onClick={() => setActive('All')}><h3>All books</h3><span>{books.length} stories</span></button>{genres.map((item) => { const count = books.filter((book) => book.genre === item).length; return <button className={`genre-card ${active === item ? 'selected' : ''}`} key={item} onClick={() => setActive(item)}><h3>{item}</h3><span>{count} {count === 1 ? 'story' : 'stories'}</span></button>; })}</div><section className="section"><div className="section-head"><h2>{active === 'All' ? 'All stories' : active}</h2><span className="result-count">{filtered.length} books</span></div><div className="book-grid">{filtered.map((book) => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}</div></section></main>;
}

function AuthorsPage() {
  const [query, setQuery] = useState('');
  const authors = getAuthors().filter((author) => author.toLowerCase().includes(query.toLowerCase()));
  return <main className="section page"><span className="eyebrow">Meet the writers</span><h1>Authors</h1><p className="description">Explore the writers behind the stories in the BookVerse collection.</p><div className="search library-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search authors..." /></div><div className="author-row">{authors.map((author) => { const authored = books.filter((book) => book.author === author); const average = (authored.reduce((sum, book) => sum + book.rating, 0) / authored.length).toFixed(1); return <Link to={`/author/${encodeURIComponent(author)}`} key={author}><strong>{author}</strong><span>{authored.length} {authored.length === 1 ? 'book' : 'books'} · {average} avg. rating</span><span>View profile →</span></Link>; })}</div></main>;
}

function AuthorProfile() {
  const { saved, toggle } = useApp();
  const { name = '' } = useParams();
  const author = decodeURIComponent(name);
  const authored = books.filter((book) => book.author === author);
  if (!authored.length) return <NotFound title="Author not found." back="/authors" />;
  const average = (authored.reduce((sum, book) => sum + book.rating, 0) / authored.length).toFixed(1);
  const readers = authored.reduce((sum, book) => sum + ratingCount(book.ratings), 0).toLocaleString();
  return <main className="section page"><div className="profile-head"><div className="avatar">{author.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><span className="eyebrow">Author profile</span><h1>{author}</h1><div className="profile-stats"><span><b>{authored.length}</b> books</span><span><b>{average}</b> avg. rating</span><span><b>{readers}</b> readers</span></div></div></div><p className="description">A BookVerse author profile featuring {authored.length === 1 ? 'one story' : `${authored.length} stories`} currently in the collection.</p><section className="section"><div className="section-head"><div><span className="eyebrow">Bibliography</span><h2>Books by {author.split(' ')[0]}</h2></div></div><div className="book-grid">{authored.map((book) => <BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle} />)}</div></section></main>;
}

function NotFound({ title = 'Page not found.', back = '/' }) {
  return <main className="section page"><span className="eyebrow">404</span><h1>{title}</h1><p className="description">The page you're looking for doesn't exist.</p><Link className="view-link" to={back}>← Go back</Link></main>;
}

function AppLayout({ dark, onTheme, ...context }) {
  return <PageShell savedCount={context.saved.length} dark={dark} onTheme={onTheme} context={context} />;
}

export default function App() {
  const [dark, setDarkState] = useState(() => getTheme() === 'dark');
  const setDark = (value) => { setDarkState(value); saveTheme(value ? 'dark' : 'light'); };
  const { library: saved, toggle, remove, clear } = useLibrary();
  const context = { saved, toggle, remove, clear };
  return <Routes>
    <Route element={<AppLayout dark={dark} onTheme={() => setDark(!dark)} {...context} />}>
      <Route path="/" element={<Outlet />}><Route index element={<Home />} /></Route>
      <Route path="/book/:id" element={<Outlet />}><Route index element={<BookPage />} /></Route>
      <Route path="/library" element={<Outlet />}><Route index element={<Library />} /></Route>
      <Route path="/genres" element={<Outlet />}><Route index element={<GenresPage />} /></Route>
      <Route path="/authors" element={<Outlet />}><Route index element={<AuthorsPage />} /></Route>
      <Route path="/author/:name" element={<Outlet />}><Route index element={<AuthorProfile />} /></Route>
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes>;
}
