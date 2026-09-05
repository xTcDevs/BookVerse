import { Link } from 'react-router-dom';

export default function BookCard({ book, saved, onToggle }) {
  return (
    <article className="book-card">
      <Link className="cover" to={`/book/${book.id}`} aria-label={`View ${book.title}`}>
        <span>{book.title}</span>
      </Link>
      <div className="card-body">
        <div className="card-top">
          <span className="eyebrow">{book.genre}</span>
          <button className={`save ${saved ? 'saved' : ''}`} onClick={() => onToggle(book.id)} aria-label={saved ? `Remove ${book.title} from library` : `Save ${book.title} to library`} aria-pressed={saved}>
            {saved ? '♥' : '♡'}
          </button>
        </div>
        <h3><Link to={`/book/${book.id}`}>{book.title}</Link></h3>
        <p>by <Link className="author-link" to={`/author/${encodeURIComponent(book.author)}`}>{book.author}</Link></p>
        <div className="rating" aria-label={`${book.rating} out of 5 stars, ${book.ratings} ratings`}>
          ★★★★★ <span>{book.rating} · {book.ratings}</span>
        </div>
        <Link className="view-link" to={`/book/${book.id}`}>View book →</Link>
      </div>
    </article>
  );
}
