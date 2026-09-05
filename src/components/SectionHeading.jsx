export default function SectionHeading({ eyebrow, title, action, count }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action || (count != null && <span className="result-count">{count} {count === 1 ? 'book' : 'books'}</span>)}
    </div>
  );
}
