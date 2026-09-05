import { useMemo, useState } from 'react';
import { books, genres } from './data/books';
import Header from './components/Header';
import Footer from './components/Footer';
import BookCard from './components/BookCard';

const savedKey = 'bookverse-library';
const themeKey = 'bookverse-theme';
const readSaved = () => { try { return JSON.parse(localStorage.getItem(savedKey) || '[]'); } catch { return []; } };
const getBook = id => books.find(book => book.id === id) || books[0];

function useLibrary() {
  const [saved, setSaved] = useState(readSaved);
  const toggle = id => setSaved(current => { const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]; localStorage.setItem(savedKey, JSON.stringify(next)); return next; });
  return { saved, toggle };
}

function Home({ saved, toggle, dark, setDark }) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const filtered = useMemo(() => books.filter(b => (genre === 'All' || b.genre === genre) && `${b.title} ${b.author} ${b.genre}`.toLowerCase().includes(query.toLowerCase())), [query, genre]);
  return <><Header savedCount={saved.length} dark={dark} onTheme={() => setDark(!dark)} /><main>
    <section className="hero" id="discover"><div className="hero-copy"><span className="eyebrow">The modern bookshelf</span><h1>Find a story worth getting lost in.</h1><p>Discover books, follow authors, and build a library that feels like yours.</p><div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search books, authors, genres..."/><button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})}>Search</button></div></div><div className="hero-art"><div className="book-stack"><i>BOOK</i><i>VERSE</i><i>READ</i></div></div></section>
    <section className="stats"><div><strong>11</strong><span>Stories</span></div><div><strong>6</strong><span>Genres</span></div><div><strong>6</strong><span>Authors</span></div><div><strong>4.7</strong><span>Avg. rating</span></div></section>
    <section className="section" id="genres"><div className="section-head"><div><span className="eyebrow">Explore</span><h2>Browse by genre</h2></div></div><div className="genre-row"><button className={genre==='All'?'active':''} onClick={()=>setGenre('All')}>All books</button>{genres.map(g=><button className={genre===g?'active':''} key={g} onClick={()=>setGenre(g)}>{g}</button>)}</div></section>
    <section className="section" id="catalog"><div className="section-head"><div><span className="eyebrow">Curated for you</span><h2>{query || genre!=='All'?'Search results':'Trending stories'}</h2></div><span className="result-count">{filtered.length} books</span></div><div className="book-grid">{filtered.map(book=><BookCard key={book.id} book={book} saved={saved.includes(book.id)} onToggle={toggle}/>)}{!filtered.length&&<div className="empty"><h3>No stories found.</h3><p>Try another title, author, or genre.</p></div>}</div></section>
    <section className="library-strip" id="library"><div><span className="eyebrow">Your collection</span><h2>Keep the stories you don't want to lose.</h2><p>Your saved books stay in this browser.</p></div><strong>{saved.length}<small> saved</small></strong></section>
    <section className="section authors" id="authors"><span className="eyebrow">Meet the writers</span><h2>Authors worth following</h2><div className="author-row">{[...new Set(books.map(b=>b.author))].map(author=><a href={`/author/${encodeURIComponent(author)}`} key={author}>{author}<span>View profile →</span></a>)}</div></section>
  </main><Footer /></>;
}

function BookPage({ id, saved, toggle, dark, setDark }) { const book=getBook(id); return <><Header savedCount={saved.length} dark={dark} onTheme={()=>setDark(!dark)}/><main><section className="book-detail"><div className="detail-cover"><span>{book.title}</span></div><div><span className="eyebrow">{book.genre}</span><h1>{book.title}</h1><p className="byline">by <a href={`/author/${encodeURIComponent(book.author)}`}>{book.author}</a></p><div className="rating">★★★★★ <span>{book.rating} · {book.ratings}</span></div><p className="description">{book.description}</p><div className="detail-actions"><button className="primary-action" onClick={()=>toggle(book.id)}>{saved.includes(book.id)?'♥ Saved to library':'♡ Save to library'}</button><a className="secondary-action" href="/#catalog">← Back to discovery</a></div><div className="meta"><span><b>{book.year}</b>Published</span><span><b>{book.pages}</b>Pages</span><span><b>English</b>Language</span></div></div></section><section className="preview section"><span className="eyebrow">Free preview</span><h2>A first look inside</h2><p>{book.preview}</p></section></main><Footer/></>; }

function Library({ saved, toggle, dark, setDark }) { const [query,setQuery]=useState(''); const owned=books.filter(b=>saved.includes(b.id)&&`${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase())); return <><Header savedCount={saved.length} dark={dark} onTheme={()=>setDark(!dark)}/><main className="section page"><span className="eyebrow">Your collection</span><h1>My Library</h1><p className="description">{saved.length} saved {saved.length===1?'story':'stories'}.</p><div className="search library-search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your library..."/></div><div className="book-grid">{owned.map(book=><BookCard key={book.id} book={book} saved onToggle={toggle}/>)}</div>{!owned.length&&<div className="empty"><h3>{saved.length?'No matches.':'Your library is empty.'}</h3><p>Save a book from discovery and it will appear here.</p></div>}</main><Footer/></>; }

export default function App() {
  const [dark,setDarkState]=useState(()=>localStorage.getItem(themeKey)==='dark');
  const setDark=value=>{setDarkState(value);localStorage.setItem(themeKey,value?'dark':'light')};
  const {saved,toggle}=useLibrary();
  const path=window.location.pathname.replace(/\/+$/,'') || '/';
  const parts=path.split('/').filter(Boolean);
  if(parts[0]==='book') return <BookPage id={parts[1]} saved={saved} toggle={toggle} dark={dark} setDark={setDark}/>;
  if(parts[0]==='library') return <Library saved={saved} toggle={toggle} dark={dark} setDark={setDark}/>;
  return <div className={dark?'app dark':'app'}><Home saved={saved} toggle={toggle} dark={dark} setDark={setDark}/></div>;
}
