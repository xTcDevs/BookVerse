export default function Header({ savedCount, dark, onTheme }) {
  return <header className="header"><a className="brand" href="/">Book<span>Verse</span></a><nav><a href="/#discover">Discover</a><a href="/#genres">Genres</a><a href="/#authors">Authors</a><a href="/library">Library <small>{savedCount}</small></a></nav><button className="theme" onClick={onTheme} aria-label="Toggle theme">{dark ? '☀' : '◐'}</button></header>;
}
