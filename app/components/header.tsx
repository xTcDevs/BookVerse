import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { formatList } from '~/data/formats';
import { topLevelGenres } from '~/data/genres';
import { useAuth } from '~/lib/auth';
import { avatarUrl } from '~/lib/supabase';
import { Icon } from './icons';

function useCloseOnNavigate(close: () => void) {
  const location = useLocation();
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    closeRef.current();
  }, [location.pathname, location.search]);
}

function useDismiss(open: boolean, close: () => void, container: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointer = (e: PointerEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, close, container]);
}

function ExplorePanel({ id }: { id: string }) {
  const genres = topLevelGenres().slice(0, 12);
  return (
    <div className="explore-panel" id={id}>
      <div className="container explore-panel__grid">
        <section className="explore-panel__formats" aria-labelledby={`${id}-formats`}>
          <h2 id={`${id}-formats`}>Formats</h2>
          <ul>
            {formatList.map((f) => (
              <li key={f.slug}>
                <Link to={`/explore/${f.slug}`}>
                  <strong>{f.label}</strong>
                  <span>{f.tagline}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby={`${id}-ways`}>
          <h2 id={`${id}-ways`}>Ways to read</h2>
          <ul>
            <li>
              <Link to="/explore?access=free">
                <strong>Free to read now</strong>
                <span>Public-domain books with free editions</span>
              </Link>
            </li>
            <li>
              <Link to="/genres/classics">
                <strong>Classics</strong>
                <span>Books that have lasted</span>
              </Link>
            </li>
            <li>
              <Link to="/explore/audiobooks">
                <strong>Audiobooks</strong>
                <span>Volunteer recordings arrive in M3</span>
              </Link>
            </li>
            <li>
              <Link to="/authors">
                <strong>Authors</strong>
                <span>Every writer on BookVerse</span>
              </Link>
            </li>
          </ul>
        </section>
        <section aria-labelledby={`${id}-genres`}>
          <h2 id={`${id}-genres`}>Genres</h2>
          <ul>
            {genres.map((g) => (
              <li key={g.slug}>
                <Link to={`/genres/${g.slug}`}>
                  <strong>{g.name}</strong>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/genres">
                <strong>All genres →</strong>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function AccountMenu() {
  const { state, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = () => setOpen(false);
  useCloseOnNavigate(close);
  useDismiss(open, close, ref);

  if (state.status !== 'signed-in') {
    return (
      <Link className="button button--small" to={state.status === 'unavailable' ? '/settings/account' : '/signin'}>
        Sign in
      </Link>
    );
  }
  const name = state.profile?.display_name || state.user.email || 'Your account';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const avatar = avatarUrl(state.profile?.avatar_path ?? null, state.profile?.updated_at);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="avatar-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        {avatar ? <img src={avatar} alt="" /> : initial}
      </button>
      {open && (
        <div className="menu" id={menuId} role="menu">
          <div className="menu__who">{state.user.email}</div>
          <Link role="menuitem" to="/settings/account">
            <Icon name="user" /> Profile and account
          </Link>
          <Link role="menuitem" to="/settings/appearance">
            <Icon name="settings" /> Appearance
          </Link>
          <Link role="menuitem" to="/settings/reading">
            <Icon name="book" /> Reading settings
          </Link>
          <hr />
          <button role="menuitem" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [exploreOpen, setExploreOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const navigate = useNavigate();
  const close = () => setExploreOpen(false);
  useCloseOnNavigate(close);
  useDismiss(exploreOpen, close, headerRef);

  // "/" focuses search from anywhere except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q');
    const query = typeof q === 'string' ? q.trim() : '';
    navigate(query ? `/explore?q=${encodeURIComponent(query)}` : '/explore');
  };

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container site-header__bar">
        <Link className="brand" to="/" aria-label="BookVerse home">
          Book<em>Verse</em>
        </Link>
        <nav className="main-nav" aria-label="Main">
          <button
            type="button"
            aria-expanded={exploreOpen}
            aria-controls={panelId}
            onClick={() => setExploreOpen((v) => !v)}
          >
            Explore <Icon name="chevronDown" />
          </button>
          <NavLink className="nav-wide" to="/genres">
            Genres
          </NavLink>
          <NavLink className="nav-wide" to="/authors">
            Authors
          </NavLink>
          <NavLink to="/top">Top Books</NavLink>
          <NavLink to="/write">Write</NavLink>
        </nav>
        <form className="header-search" role="search" onSubmit={onSearch}>
          <Icon name="search" />
          <label className="visually-hidden" htmlFor="site-search">
            Search BookVerse
          </label>
          <input
            ref={searchRef}
            id="site-search"
            name="q"
            type="search"
            placeholder="Search titles, authors, genres…"
            autoComplete="off"
          />
          <kbd aria-hidden="true">/</kbd>
        </form>
        <div className="header-actions">
          <NavLink className="button button--ghost button--small nav-library" to="/library">
            My Library
          </NavLink>
          <AccountMenu />
        </div>
      </div>
      {exploreOpen && <ExplorePanel id={panelId} />}
    </header>
  );
}
