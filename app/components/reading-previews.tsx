import type { CSSProperties } from 'react';
import type { ReaderAudioPrefs, ReaderVisualPrefs } from '~/lib/prefs/schema';
import type { ReaderLook } from '~/lib/prefs/apply';
import { Icon } from './icons';

/** The opening of Letter I of Frankenstein (Standard Ebooks edition, based on the 1831 text). */
export function TextPreview({ look }: { look: ReaderLook }) {
  return (
    <div
      className="text-page"
      style={look.style as CSSProperties}
      lang="en"
      tabIndex={0}
      role="region"
      aria-label="Preview of your text reading settings"
    >
      <div className="text-page__column">
        <h3>Letter I</h3>
        <p className="dateline">To Mrs. Saville, England.</p>
        <p className="dateline">St. Petersburgh, Dec. 11th, 17—.</p>
        <p>
          You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have
          regarded with such evil forebodings. I arrived here yesterday; and my first task is to assure my dear sister
          of my welfare and increasing confidence in the success of my undertaking.
        </p>
        <p>
          I am already far north of London; and as I walk in the streets of Petersburgh, I feel a cold northern breeze
          play upon my cheeks, which braces my nerves and fills me with delight.
        </p>
      </div>
    </div>
  );
}

export type PreviewFormat = 'manga' | 'webtoon' | 'comic';

export function resolveVisual(
  prefs: ReaderVisualPrefs,
  format: PreviewFormat,
): { mode: 'paged' | 'vertical'; dir: 'rtl' | 'ltr' } {
  const mode = prefs.mode === 'auto' ? (format === 'webtoon' ? 'vertical' : 'paged') : prefs.mode;
  const dir = prefs.direction === 'auto' ? (format === 'manga' ? 'rtl' : 'ltr') : prefs.direction;
  return { mode, dir };
}

const backgrounds = { black: '#000000', grey: '#3A3A3A', white: '#FFFFFF' } as const;

/** An original, schematic comic page: numbered panels show the reading order. */
function SamplePage({ page, dir, tall }: { page: number; dir: 'rtl' | 'ltr'; tall: boolean }) {
  const order = (n: number) => (page - 1) * 3 + n;
  const panels = tall
    ? [
        { x: 10, y: 10, w: 180, h: 120, n: 1 },
        { x: 10, y: 140, w: 180, h: 150, n: 2 },
        { x: 10, y: 300, w: 180, h: 110, n: 3 },
      ]
    : dir === 'rtl'
      ? [
          { x: 105, y: 10, w: 85, h: 120, n: 1 },
          { x: 10, y: 10, w: 85, h: 120, n: 2 },
          { x: 10, y: 140, w: 180, h: 140, n: 3 },
        ]
      : [
          { x: 10, y: 10, w: 85, h: 120, n: 1 },
          { x: 105, y: 10, w: 85, h: 120, n: 2 },
          { x: 10, y: 140, w: 180, h: 140, n: 3 },
        ];
  const height = tall ? 420 : 290;
  return (
    <svg
      viewBox={`0 0 200 ${height}`}
      role="img"
      aria-label={`Sample page ${page}, panels read ${dir === 'rtl' ? 'right to left' : 'left to right'}`}
    >
      <rect width="200" height={height} fill="#FBFAF7" />
      {panels.map((p) => (
        <g key={p.n}>
          <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="#ECE7DD" stroke="#1B1712" strokeWidth="2" />
          <text
            x={p.x + p.w / 2}
            y={p.y + p.h / 2 + 8}
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="26"
            fill="#1B1712"
          >
            {order(p.n)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function VisualPreview({
  prefs,
  format,
  pageBg,
}: {
  prefs: ReaderVisualPrefs;
  format: PreviewFormat;
  pageBg: string;
}) {
  const { mode, dir } = resolveVisual(prefs, format);
  const pages = mode === 'vertical' ? [1, 2] : prefs.spread === 'double' ? [1, 2] : [1];
  const bg = prefs.background === 'match' ? pageBg : backgrounds[prefs.background];
  const width =
    mode === 'vertical'
      ? '12rem'
      : prefs.fit === 'height'
        ? '9rem'
        : prefs.fit === 'original'
          ? '10.5rem'
          : prefs.spread === 'double'
            ? '45%'
            : '70%';
  const style = {
    '--vs-bg': bg,
    '--vs-gap': `${prefs.gap}px`,
    '--vs-width': width,
    '--vs-max-h': prefs.fit === 'height' ? '20rem' : 'none',
  } as CSSProperties;
  return (
    <div className="visual-page" data-mode={mode} data-dir={dir} style={style}>
      {pages.map((p) => (
        <SamplePage key={p} page={p} dir={dir} tall={mode === 'vertical'} />
      ))}
    </div>
  );
}

export function AudioPreview({ prefs }: { prefs: ReaderAudioPrefs }) {
  const sleep =
    prefs.sleepTimer === 'off'
      ? 'Sleep timer off'
      : prefs.sleepTimer === 'chapter'
        ? 'Stops at end of chapter'
        : `Stops after ${prefs.sleepTimer} minutes`;
  return (
    <div className="audio-preview">
      <div>
        <p className="eyebrow">Audiobook player · arrives in Milestone 3</p>
        <p style={{ fontFamily: 'var(--bv-font-display)', fontSize: '1.5rem' }}>Chapter 1</p>
      </div>
      <div className="audio-preview__track" aria-hidden="true">
        <i />
      </div>
      <div className="audio-controls" aria-label="Player controls preview">
        <button type="button" className="button button--small" disabled>
          <Icon name="back" /> {prefs.skipBack}s
        </button>
        <button type="button" className="button button--primary" disabled aria-label="Play (available in Milestone 3)">
          <Icon name="play" />
        </button>
        <button type="button" className="button button--small" disabled>
          {prefs.skipForward}s <Icon name="forward" />
        </button>
      </div>
      <p className="muted small" style={{ textAlign: 'center' }}>
        {prefs.speed.toFixed(2).replace(/0$/, '')}× speed · {sleep} ·{' '}
        {prefs.autoplayNext ? 'Continues to next chapter' : 'Stops after each chapter'}
      </p>
    </div>
  );
}
