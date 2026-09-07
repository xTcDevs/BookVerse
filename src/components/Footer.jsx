import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div><Link className="brand" to="/">Book<span>Verse</span></Link><p>A reading experience built for curious people.</p></div>
      <div className="footer-links"><Link to="/">Discover</Link><Link to="/genres">Genres</Link><Link to="/authors">Authors</Link><Link to="/library">My Library</Link></div>
      <small>© {new Date().getFullYear()} BookVerse. Built with React.</small>
    </footer>
  );
}
