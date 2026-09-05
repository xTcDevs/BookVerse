import { useMemo, useState } from 'react';
import { useReadingProgress } from '../hooks/useReadingProgress.js';

const chapters = [
  {
    title: 'Chapter One — The Signal',
    paragraphs: [
      'At 02:17 in the morning, every screen in the city went dark. Not black exactly, but empty — as if the machines had forgotten what darkness was supposed to look like.',
      'Mara was the only person in the observatory who noticed the second thing that happened. Three seconds after the blackout, the old radio telescope began to move on its own.',
      'She watched the dish turn slowly toward the northern sky. The control panel remained dead beneath her hands, but somewhere beyond the glass, something was calling.',
    ],
  },
  {
    title: 'Chapter Two — Beyond the Static',
    paragraphs: [
      'The recording lasted eleven seconds. It contained no recognizable language, yet Mara understood its rhythm immediately: a pause, three pulses, another pause, then a sequence that repeated like a heartbeat.',
      'By sunrise, the file had been copied onto six drives and hidden in six different places. Mara knew enough about institutions to understand that discovery was only the beginning of the problem.',
      'She returned to the telescope before anyone else arrived. The stars looked ordinary. That was what frightened her most.',
    ],
  },
  {
    title: 'Chapter Three — The Last Light',
    paragraphs: [
      'For the first time in forty years, the observatory received an answer. It was not another signal. It was a map.',
      'Mara traced the coordinates with a shaking finger. The destination was impossibly distant, but one detail made the room go silent: the map ended at a place that should not exist.',
      'She closed the terminal, picked up her coat, and walked outside beneath a sky that suddenly felt much larger than it had the night before.',
    ],
  },
];

export default function Reader({ book }) {
  const [chapter, setChapter] = useState(0);
  const { progress, updateProgress } = useReadingProgress(book.id);
  const current = chapters[chapter];
  const percent = useMemo(() => Math.round(((chapter + 1) / chapters.length) * 100), [chapter]);

  const changeChapter = (next) => {
    const target = Math.max(0, Math.min(chapters.length - 1, next));
    setChapter(target);
    updateProgress(Math.max(progress, Math.round(((target + 1) / chapters.length) * 100)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="reader" aria-label={`Reading ${book.title}`}>
      <div className="reader-toolbar">
        <div>
          <span className="eyebrow">Reading now</span>
          <strong>{book.title}</strong>
        </div>
        <div className="reader-progress" aria-label={`${progress}% complete`}>
          <span>{progress}% complete</span>
          <div><i style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="reader-layout">
        <aside className="chapter-list">
          <span className="eyebrow">Contents</span>
          {chapters.map((item, index) => (
            <button key={item.title} className={index === chapter ? 'active' : ''} onClick={() => changeChapter(index)}>
              <small>{String(index + 1).padStart(2, '0')}</small>
              {item.title.replace(/^Chapter \w+ — /, '')}
            </button>
          ))}
        </aside>

        <article className="reader-copy">
          <div className="reader-heading">
            <span>Chapter {chapter + 1} of {chapters.length}</span>
            <h2>{current.title}</h2>
          </div>
          {current.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

          <div className="reader-navigation">
            <button className="secondary-action" onClick={() => changeChapter(chapter - 1)} disabled={chapter === 0}>← Previous</button>
            <span>{percent}% of preview</span>
            <button className="primary-action" onClick={() => changeChapter(chapter + 1)} disabled={chapter === chapters.length - 1}>
              {chapter === chapters.length - 1 ? 'Preview complete' : 'Next chapter →'}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
