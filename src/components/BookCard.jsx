import { Link } from 'react-router-dom';
import { useReadingProgress } from '../hooks/useReadingProgress.js';

const coverClass = (genre) => `cover cover-${genre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export default function BookCard({ book, saved, onToggle }) {
  const { progress } = useReadingProgress(book.id);
  const completed = progress >= 100;

  return (
    <article className="book-card">
      <Link className={coverClass(book.genre)} to={`/book/${book.id}`} aria-label={`View ${book.title}`}>
        <span className="cover-genre">{book.genre}</span>
        <span className="cover-title">{book.title}</span>
        <span className="cover-author">{book.author}</span>
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
        {progress > 0 && (
          <div className="book-progress" aria-label={`${progress}% of ${book.title} completed`}>
            <div className="book-progress-meta"><span>{completed ? 'Completed' : `${progress}% read`}</span><span>{completed ? 'Read again' : 'Continue reading'}</span></div>
            <div className="book-progress-track"><i style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <Link className="view-link" to={`/book/${book.id}`}>{completed ? 'Read again →' : progress > 0 ? 'Continue reading →' : 'View book →'}</Link>
      </div>
    </article>
  );
}
