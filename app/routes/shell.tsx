import { Outlet } from 'react-router';
import { Footer, TabBar } from '~/components/footer';
import { Header } from '~/components/header';

export default function Shell() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <Outlet />
      <Footer />
      <TabBar />
    </>
  );
}
