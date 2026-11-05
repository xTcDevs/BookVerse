import { Link, NavLink } from 'react-router';
import { Icon } from './icons';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '28rem' }}>
          <Link className="brand" to="/" style={{ fontSize: '1.375rem' }}>
            Book<em>Verse</em>
          </Link>
          <p>Every book, honestly labelled: what you can read here, what you can borrow, and where to buy the rest.</p>
        </div>
        <nav aria-label="Footer">
          <Link to="/explore">Explore</Link>
          <Link to="/genres">Genres</Link>
          <Link to="/authors">Authors</Link>
          <Link to="/top">Top Books</Link>
          <Link to="/write">Write</Link>
          <Link to="/library">My Library</Link>
          <Link to="/settings/appearance">Appearance</Link>
          <Link to="/settings/reading">Reading settings</Link>
        </nav>
        <p style={{ flexBasis: '100%' }}>
          Catalogue data and editions: <a href="https://standardebooks.org">Standard Ebooks</a> (CC0) and{' '}
          <a href="https://www.gutenberg.org">Project Gutenberg</a>. Public-domain status is checked for the United
          States; it can differ in other countries.
        </p>
      </div>
    </footer>
  );
}

/** Phone navigation: five destinations within thumb reach. */
export function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Main">
      <NavLink to="/" end>
        <Icon name="home" />
        Home
      </NavLink>
      <NavLink to="/explore">
        <Icon name="compass" />
        Explore
      </NavLink>
      <NavLink to="/top">
        <Icon name="trophy" />
        Top
      </NavLink>
      <NavLink to="/library">
        <Icon name="library" />
        Library
      </NavLink>
      <NavLink to="/settings">
        <Icon name="user" />
        Me
      </NavLink>
    </nav>
  );
}
