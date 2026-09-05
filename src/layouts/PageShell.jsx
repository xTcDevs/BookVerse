import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

export default function PageShell({ savedCount, dark, onTheme, context }) {
  return (
    <div className={dark ? 'app dark' : 'app'}>
      <Header savedCount={savedCount} dark={dark} onTheme={onTheme} />
      <Outlet context={context} />
      <Footer />
    </div>
  );
}
