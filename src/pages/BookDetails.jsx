import { Link } from 'react-router-dom';
import Reader from '../components/Reader.jsx';

export default function BookDetails({ book, saved, toggle }) {
  if (!book) return <main className="section page"><span className="eyebrow">404</span><h1>Book not found.</h1><Link className="view-link" to="/">← Back to discovery</Link></main>;
  return <main><section className="book-detail"><div className="detail-cover"><span>{book.title}</span></div><div><span className="eyebrow">{book.genre}</span><h1>{book.title}</h1><p className="byline">by <Link to={`/author/${encodeURIComponent(book.author)}`}>{book.author}</Link></p><div className="rating">★★★★★ <span>{book.rating} · {book.ratings}</span></div><p className="description">{book.description}</p><div className="detail-actions"><button className="primary-action" onClick={() => toggle(book.id)}>{saved.includes(book.id) ? '♥ Saved to library' : '♡ Save to library'}</button><Link className="secondary-action" to="/">← Back to discovery</Link></div><div className="meta"><span><b>{book.year}</b>Published</span><span><b>{book.pages}</b>Pages</span><span><b>English</b>Language</span></div></div></section><section className="preview section"><span className="eyebrow">Free preview</span><h2>A first look inside</h2><p>{book.preview}</p><Reader book={book} /></section></main>;
}
