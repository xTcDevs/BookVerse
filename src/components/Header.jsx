import { useState } from 'react';

export default function Header({ savedCount, dark, onTheme }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="header">
      <a className="brand" href="/" onClick={close} aria-label="BookVerse home">Book<span>Verse</span></a>
      <nav className={open ? 'nav-open' : ''} aria-label="Main navigation">
        <a href="/#discover" onClick={close}>Discover</a>
        <a href="/genres" onClick={close}>Genres</a>
        <a href="/authors" onClick={close}>Authors</a>
        <a href="/library" onClick={close}>Library <small aria-label={`${savedCount} saved books`}>{savedCount}</small></a>
      </nav>
      <div className="header-actions">
        <button className="theme" onClick={onTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>{dark ? '☀' : '◐'}</button>
        <button className="menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? '×' : '☰'}</button>
      </div>
    </header>
  );
}
