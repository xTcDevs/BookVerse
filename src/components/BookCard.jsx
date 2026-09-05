export default function BookCard({ book, saved, onToggle }) {
  return (
    <article className="book-card">
      <div className="cover"><span>{book.title}</span></div>
      <div className="card-body">
        <div className="card-top"><span className="eyebrow">{book.genre}</span><button className={`save ${saved ? 'saved' : ''}`} onClick={() => onToggle(book.id)} aria-label={saved ? 'Remove from library' : 'Save to library'}>{saved ? '♥' : '♡'}</button></div>
        <h3>{book.title}</h3>
        <p>by {book.author}</p>
        <div className="rating">★★★★★ <span>{book.rating} · {book.ratings}</span></div>
        <a className="view-link" href={`/book/${book.id}`}>View book →</a>
      </div>
    </article>
  );
}
