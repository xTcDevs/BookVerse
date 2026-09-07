import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header({ savedCount, dark, onTheme }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const close = () => setOpen(false);

  useEffect(() => close(), [location.pathname, location.hash]);
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="header">
      <Link className="brand" to="/" onClick={close} aria-label="BookVerse home">Book<span>Verse</span></Link>
      <nav className={open ? 'nav-open' : ''} aria-label="Main navigation">
        <Link to="/#discover" onClick={close}>Discover</Link>
        <Link to="/genres" onClick={close}>Genres</Link>
        <Link to="/authors" onClick={close}>Authors</Link>
        <Link to="/library" onClick={close}>Library <small aria-label={`${savedCount} saved books`}>{savedCount}</small></Link>
      </nav>
      <div className="header-actions">
        <button className="theme" onClick={onTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>{dark ? '☀' : '◐'}</button>
        <button className="menu" onClick={() => setOpen((current) => !current)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? '×' : '☰'}</button>
      </div>
    </header>
  );
}
