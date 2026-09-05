export default function BookCard({ book, saved, onToggle }) {
  return (
    <article className="book-card">
      <a className="cover" href={`/book/${book.id}`} aria-label={`View ${book.title}`}>
        <span>{book.title}</span>
      </a>
      <div className="card-body">
        <div className="card-top">
          <span className="eyebrow">{book.genre}</span>
          <button
            className={`save ${saved ? 'saved' : ''}`}
            onClick={() => onToggle(book.id)}
            aria-label={saved ? `Remove ${book.title} from library` : `Save ${book.title} to library`}
            aria-pressed={saved}
          >
            {saved ? '♥' : '♡'}
          </button>
        </div>
        <h3><a href={`/book/${book.id}`}>{book.title}</a></h3>
        <p>by <a className="author-link" href={`/author/${encodeURIComponent(book.author)}`}>{book.author}</a></p>
        <div className="rating" aria-label={`${book.rating} out of 5 stars, ${book.ratings} ratings`}>
          ★★★★★ <span>{book.rating} · {book.ratings}</span>
        </div>
        <a className="view-link" href={`/book/${book.id}`}>View book →</a>
      </div>
    </article>
  );
}
