import { useEffect, useState } from 'react';
import { getReaderPreferences, saveReaderPreferences } from '../lib/storage.js';
import { useReadingProgress } from '../hooks/useReadingProgress.js';

const fallbackChapters = [{ title: 'Preview', paragraphs: ['This book is ready to be explored. More chapters will be added to the BookVerse reading experience soon.'] }];

export default function Reader({ book }) {
  const chapters = book.chapters?.length ? book.chapters : fallbackChapters;
  const [chapter, setChapter] = useState(0);
  const [preferences, setPreferences] = useState(getReaderPreferences);
  const { progress, updateProgress } = useReadingProgress(book.id);
  const current = chapters[chapter];

  useEffect(() => saveReaderPreferences(preferences), [preferences]);
  useEffect(() => setChapter(0), [book.id]);

  useEffect(() => {
    const onScroll = () => {
      const article = document.querySelector('.reader-copy');
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const total = Math.max(1, article.scrollHeight - window.innerHeight);
      const passed = Math.max(0, Math.min(total, -rect.top));
      const scrollPercent = Math.round((passed / total) * 100);
      updateProgress(Math.max(progress, scrollPercent));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [book.id, progress, updateProgress]);

  const changeChapter = (next) => {
    const target = Math.max(0, Math.min(chapters.length - 1, next));
    setChapter(target);
    updateProgress(Math.max(progress, Math.round(((target + 1) / chapters.length) * 100)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const update = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));

  return <section className={`reader reader-${preferences.theme} reader-${preferences.width}`} aria-label={`Reading ${book.title}`}>
    <div className="reader-toolbar"><div><span className="eyebrow">Reading now</span><strong>{book.title}</strong></div><div className="reader-progress"><span>{progress}% complete</span><div><i style={{ width: `${progress}%` }} /></div></div></div>
    <div className="reader-controls" aria-label="Reader settings">
      <div><span>Text</span><button aria-label="Decrease text size" onClick={() => update('fontSize', Math.max(15, preferences.fontSize - 1))}>A−</button><b>{preferences.fontSize}px</b><button aria-label="Increase text size" onClick={() => update('fontSize', Math.min(24, preferences.fontSize + 1))}>A+</button></div>
      <div><span>Width</span>{['narrow', 'comfortable', 'wide'].map((item) => <button className={preferences.width === item ? 'active' : ''} aria-pressed={preferences.width === item} key={item} onClick={() => update('width', item)}>{item}</button>)}</div>
      <div><span>Page</span>{['paper', 'sepia', 'night'].map((item) => <button className={preferences.theme === item ? 'active' : ''} aria-pressed={preferences.theme === item} key={item} onClick={() => update('theme', item)}>{item}</button>)}</div>
    </div>
    <div className="reader-layout"><aside className="chapter-list"><span className="eyebrow">Contents</span>{chapters.map((item, index) => <button key={item.title} className={index === chapter ? 'active' : ''} aria-current={index === chapter ? 'page' : undefined} onClick={() => changeChapter(index)}><small>{String(index + 1).padStart(2, '0')}</small>{item.title}</button>)}</aside>
      <article className="reader-copy" style={{ fontSize: `${preferences.fontSize}px` }}><div className="reader-heading"><span>Chapter {chapter + 1} of {chapters.length}</span><h2>{current.title}</h2></div>{current.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<div className="reader-navigation"><button className="secondary-action" onClick={() => changeChapter(chapter - 1)} disabled={chapter === 0}>← Previous</button><span>{Math.round(((chapter + 1) / chapters.length) * 100)}% of preview</span><button className="primary-action" onClick={() => changeChapter(chapter + 1)} disabled={chapter === chapters.length - 1}>{chapter === chapters.length - 1 ? 'Preview complete' : 'Next chapter →'}</button></div></article>
    </div>
  </section>;
}
